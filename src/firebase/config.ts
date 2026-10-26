import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  Auth
} from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import rawAppletConfig from '../../firebase-applet-config.json';

export interface FirebaseConfigSchema {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

// Named Firestore database ID containing production application data
export const REQUIRED_DATABASE_ID = 'ai-studio-remixdarswithosa-978e37b7-a164-496c-8e6a-39738edc5d93';

/**
 * Safely resolves an environment variable across browser (import.meta.env)
 * and Node/build script (process.env) runtimes.
 */
function readEnvVar(name: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
      const val = String(import.meta.env[name]).trim();
      if (val) return val;
    }
  } catch {
    // Ignore import.meta evaluation errors in non-ESM environments
  }

  try {
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      const val = String(process.env[name]).trim();
      if (val) return val;
    }
  } catch {
    // Ignore process.env evaluation errors
  }

  return undefined;
}

// 1. Resolve configuration with priority: VITE_FIREBASE_* -> firebase-applet-config.json
const resolvedProjectId =
  readEnvVar('VITE_FIREBASE_PROJECT_ID') ||
  rawAppletConfig.projectId ||
  '';

const resolvedAppId =
  readEnvVar('VITE_FIREBASE_APP_ID') ||
  rawAppletConfig.appId ||
  '';

const resolvedApiKey =
  readEnvVar('VITE_FIREBASE_API_KEY') ||
  rawAppletConfig.apiKey ||
  '';

const resolvedAuthDomain =
  readEnvVar('VITE_FIREBASE_AUTH_DOMAIN') ||
  rawAppletConfig.authDomain ||
  '';

const resolvedDatabaseId =
  readEnvVar('VITE_FIREBASE_FIRESTORE_DATABASE_ID') ||
  rawAppletConfig.firestoreDatabaseId ||
  '';

const resolvedStorageBucket =
  readEnvVar('VITE_FIREBASE_STORAGE_BUCKET') ||
  rawAppletConfig.storageBucket ||
  '';

const resolvedMessagingSenderId =
  readEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') ||
  rawAppletConfig.messagingSenderId ||
  '';

const resolvedMeasurementId =
  readEnvVar('VITE_FIREBASE_MEASUREMENT_ID') ||
  rawAppletConfig.measurementId ||
  '';

export const firebaseConfig: FirebaseConfigSchema = {
  projectId: resolvedProjectId,
  appId: resolvedAppId,
  apiKey: resolvedApiKey,
  authDomain: resolvedAuthDomain,
  firestoreDatabaseId: resolvedDatabaseId,
  storageBucket: resolvedStorageBucket,
  messagingSenderId: resolvedMessagingSenderId,
  measurementId: resolvedMeasurementId,
  oAuthClientId: rawAppletConfig.oAuthClientId || '',
  recaptchaSiteKey: rawAppletConfig.recaptchaSiteKey || ''
};

// 2. Strict validation: Never silently query '(default)' database
const targetDatabaseId = (firebaseConfig.firestoreDatabaseId || '').trim();

if (!targetDatabaseId || targetDatabaseId === '(default)') {
  const diagnosticMsg =
    `[Firebase Config Error] Database Firestore diwajibkan menggunakan named database "${REQUIRED_DATABASE_ID}". ` +
    `Konfigurasi saat ini bernilai "${targetDatabaseId || 'KOSONG'}". Aplikasi dicegah beralih secara otomatis ke database (default) yang kosong. ` +
    `Harap atur variabel VITE_FIREBASE_FIRESTORE_DATABASE_ID=${REQUIRED_DATABASE_ID} di Netlify atau perbarui firebase-applet-config.json.`;
  console.error(diagnosticMsg);
  throw new Error(diagnosticMsg);
}

// 3. Initialize Firebase app singleton
let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
    ...(firebaseConfig.measurementId ? { measurementId: firebaseConfig.measurementId } : {})
  });
}

// 4. Initialize Firestore strictly targeting the verified named database ID
export const db: Firestore = getFirestore(app, targetDatabaseId);

function createResilientAuth(firebaseApp: FirebaseApp): Auth {
  if (typeof window !== 'undefined') {
    try {
      return initializeAuth(firebaseApp, {
        persistence: [
          indexedDBLocalPersistence,
          browserLocalPersistence,
          browserSessionPersistence,
          inMemoryPersistence
        ],
        popupRedirectResolver: browserPopupRedirectResolver
      });
    } catch {
      // Auth already initialized on this app instance
      return getAuth(firebaseApp);
    }
  }
  return getAuth(firebaseApp);
}

export const auth: Auth = createResilientAuth(app);
export const storage: FirebaseStorage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type FirestoreDiagnosticCategory =
  | 'permission-denied'
  | 'unauthenticated'
  | 'database-not-found'
  | 'network-or-domain-blocked'
  | 'query-precondition-failed'
  | 'resource-exhausted'
  | 'unknown-error';

export interface FirestoreDiagnosticInfo {
  category: FirestoreDiagnosticCategory;
  summary: string;
  code: string;
  rawMessage: string;
  timestamp: string;
  targetProjectIdMasked: string;
  targetDatabaseId: string;
}

let lastDiagnosticInfo: FirestoreDiagnosticInfo | null = null;

export function getLatestFirestoreDiagnostic(): FirestoreDiagnosticInfo | null {
  return lastDiagnosticInfo;
}

/**
 * Classifies Firestore errors safely without exposing API keys, tokens, or PII.
 */
export function classifyFirestoreError(error: unknown): {
  category: FirestoreDiagnosticCategory;
  summary: string;
  code: string;
} {
  const rawMsg = error instanceof Error ? error.message : String(error || '');
  const code = (error as any)?.code ? String((error as any).code).toLowerCase() : '';

  let category: FirestoreDiagnosticCategory = 'unknown-error';
  let summary = 'Terjadi kendala pada komunikasi Cloud Firestore.';

  if (
    code.includes('unauthenticated') ||
    rawMsg.includes('unauthenticated') ||
    rawMsg.includes('token-service-api') ||
    rawMsg.includes('securetoken.googleapis.com') ||
    rawMsg.includes('Fetching auth token failed')
  ) {
    category = 'unauthenticated';
    summary =
      'Sesi autentikasi belum siap atau Secure Token Service API di Google Cloud Project belum diaktifkan. Mode baca publik tetap dapat berjalan.';
  } else if (code.includes('permission-denied') || rawMsg.includes('Missing or insufficient permissions')) {
    category = 'permission-denied';
    summary = 'Izin akses Firestore ditolak oleh Security Rules atau peran pengguna tidak memadai.';
  } else if (code.includes('not-found') || rawMsg.includes('NOT_FOUND')) {
    category = 'database-not-found';
    summary = `Database "${targetDatabaseId}" atau dokumen yang diminta tidak ditemukan di server.`;
  } else if (
    code.includes('unavailable') ||
    rawMsg.includes('client is offline') ||
    rawMsg.includes('Failed to get document because the client is offline') ||
    rawMsg.includes('network')
  ) {
    category = 'network-or-domain-blocked';
    summary =
      'Koneksi client Firestore terputus atau domain belum diizinkan (periksa Authorized Domains & API Key HTTP Referrers).';
  } else if (code.includes('failed-precondition') || rawMsg.includes('requires an index')) {
    category = 'query-precondition-failed';
    summary = 'Kueri membutuhkan indeks komposit Firestore atau kondisi prasyarat data belum terpenuhi.';
  } else if (code.includes('resource-exhausted') || rawMsg.includes('quota')) {
    category = 'resource-exhausted';
    summary = 'Batas kuota layanan Cloud Firestore terlampaui.';
  }

  const maskedProjectId = firebaseConfig.projectId
    ? `${firebaseConfig.projectId.slice(0, 4)}***${firebaseConfig.projectId.slice(-4)}`
    : 'unknown';

  lastDiagnosticInfo = {
    category,
    summary,
    code: code || 'ERR_FIRESTORE',
    rawMessage: rawMsg.slice(0, 300),
    timestamp: new Date().toISOString(),
    targetProjectIdMasked: maskedProjectId,
    targetDatabaseId
  };

  return { category, summary, code: code || 'ERR_FIRESTORE' };
}

/**
 * Logs informative, non-sensitive diagnostic info when Firestore operations fail.
 */
export function logFirestoreDiagnostic(
  context: { operation: string; path?: string; collection?: string },
  error: unknown
): void {
  const { category, summary, code } = classifyFirestoreError(error);
  const location = context.path ? `path: ${context.path}` : `col: ${context.collection || '-'}`;

  console.warn(
    `[Firestore Diagnostic] Op: ${context.operation} (${location}) | Kategori: [${category}] | Kode: ${code} | Info: ${summary}`
  );
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  category: FirestoreDiagnosticCategory;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const { category, summary, code } = classifyFirestoreError(error);

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    category,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    }
  };

  console.error(`[Firestore Error - ${category}] ${summary} (Code: ${code}, Path: ${path || '-'})`, errInfo);
  
  const customError = new Error(`${summary} [Kode: ${code}]`);
  (customError as any).category = category;
  (customError as any).code = code;
  (customError as any).path = path;
  (customError as any).errInfo = errInfo;
  throw customError;
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'initialized'));
    return true;
  } catch (error) {
    const { category, summary } = classifyFirestoreError(error);
    if (category === 'network-or-domain-blocked') {
      console.warn(`[Firebase Connection] ${summary}`);
      return false;
    }
    // Any response from the server (even permission-denied) confirms connection reached Firestore server
    return true;
  }
}

