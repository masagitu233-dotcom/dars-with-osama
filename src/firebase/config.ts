import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signOut,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  setLogLevel,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import rawAppletConfig from '../../firebase-applet-config.json';

// Silence internal Firestore SDK connection retry error logs that trigger false-positive error overlays
try {
  setLogLevel('silent');
} catch {
  // Ignore in environments where setLogLevel might be restricted
}

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

let tokenServiceApiDisabled = false;
const SESSION_EMAIL_CRED_KEY = 'dars_session_auth_cred_v1';
let silentReauthPromise: Promise<boolean> | null = null;

export function cacheEmailSessionCredentials(email: string, pass: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(
      SESSION_EMAIL_CRED_KEY,
      JSON.stringify({ e: email.trim(), p: pass })
    );
  } catch {
    // Ignore sessionStorage errors
  }
}

export function clearEmailSessionCredentials(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(SESSION_EMAIL_CRED_KEY);
  } catch {
    // Ignore sessionStorage errors
  }
}

async function trySilentEmailReauth(authInstance: Auth): Promise<boolean> {
  if (typeof window === 'undefined' || !window.sessionStorage) return false;
  if (silentReauthPromise) return silentReauthPromise;

  silentReauthPromise = (async () => {
    try {
      const raw = window.sessionStorage.getItem(SESSION_EMAIL_CRED_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed?.e || !parsed?.p) return false;
      const cred = await signInWithEmailAndPassword(authInstance, parsed.e, parsed.p);
      if (cred?.user) {
        tokenServiceApiDisabled = false;
        patchUserTokenMethods(cred.user);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      silentReauthPromise = null;
    }
  })();

  return silentReauthPromise;
}

export function isSecureTokenServiceDisabledError(err: unknown): boolean {
  const rawMsg = err instanceof Error ? err.message : String(err || '');
  const code = (err as any)?.code ? String((err as any).code) : '';
  return (
    rawMsg.includes('token-service-api') ||
    rawMsg.includes('securetoken.googleapis.com') ||
    rawMsg.includes('Fetching auth token failed') ||
    code.includes('token-service-api')
  );
}

function stopProactiveRefreshSafely(target: any): void {
  if (!target) return;
  try {
    if (typeof target._stopProactiveRefresh === 'function') {
      target._stopProactiveRefresh();
    }
    if (target.proactiveRefresh && typeof target.proactiveRefresh._stop === 'function') {
      target.proactiveRefresh._stop();
    }
  } catch {
    // Ignore internal refresh timer stop errors
  }
}

export function patchUserTokenMethods(user: any): void {
  if (!user || typeof user !== 'object') return;

  // 1. Patch stsTokenManager.getToken so expired token refresh never throws into AuthImpl.getToken
  const sts = user.stsTokenManager;
  if (sts && typeof sts === 'object' && !sts.__resilientPatched) {
    const origStsGetToken = typeof sts.getToken === 'function' ? sts.getToken.bind(sts) : null;
    if (origStsGetToken) {
      sts.getToken = async (_authInstance?: any, _forceRefresh?: boolean): Promise<string | null> => {
        try {
          const hasValidCachedToken =
            sts.accessToken &&
            sts.expirationTime &&
            Number(sts.expirationTime) > Date.now() + 30_000;
          if (hasValidCachedToken) {
            tokenServiceApiDisabled = false;
            return String(sts.accessToken);
          }
          if (tokenServiceApiDisabled) {
            return null;
          }
          return await origStsGetToken(_authInstance, false);
        } catch (err) {
          if (isSecureTokenServiceDisabledError(err)) {
            tokenServiceApiDisabled = true;
            stopProactiveRefreshSafely(user);
            classifyFirestoreError(err);
            return null;
          }
          return null;
        }
      };
    }
    sts.__resilientPatched = true;
  }

  // 2. Patch user.getIdToken so direct calls never reject on token-service-api disabled
  if (!user.__resilientPatched && typeof user.getIdToken === 'function') {
    const origGetIdToken = user.getIdToken.bind(user);
    user.getIdToken = async (_forceRefresh?: boolean): Promise<string> => {
      try {
        const tokenMgr = user.stsTokenManager;
        const hasValidCachedToken =
          tokenMgr?.accessToken &&
          tokenMgr?.expirationTime &&
          Number(tokenMgr.expirationTime) > Date.now() + 30_000;
        if (hasValidCachedToken) {
          tokenServiceApiDisabled = false;
          return String(tokenMgr.accessToken);
        }
        if (tokenServiceApiDisabled) {
          return '';
        }
        const token = await origGetIdToken(false);
        return token || '';
      } catch (err) {
        if (isSecureTokenServiceDisabledError(err)) {
          tokenServiceApiDisabled = true;
          stopProactiveRefreshSafely(user);
          classifyFirestoreError(err);
          return '';
        }
        return '';
      }
    };
    user.__resilientPatched = true;
  }
}

function patchAuthInternalGetToken(target: any, authInstance: Auth): void {
  if (!target || typeof target.getToken !== 'function' || target.__resilientGetTokenPatched) {
    return;
  }
  const origGetToken = target.getToken.bind(target);
  target.getToken = async (_forceRefresh?: boolean): Promise<{ accessToken: string } | null> => {
    try {
      if ((authInstance as any)._initializationPromise) {
        await (authInstance as any)._initializationPromise;
      }
      let currentUser = authInstance.currentUser as any;
      if (!currentUser) {
        return null;
      }
      patchUserTokenMethods(currentUser);
      let sts = currentUser.stsTokenManager;
      const hasValidCachedToken =
        sts?.accessToken &&
        sts?.expirationTime &&
        Number(sts.expirationTime) > Date.now() + 30_000;
      if (hasValidCachedToken) {
        tokenServiceApiDisabled = false;
        return { accessToken: String(sts.accessToken) };
      }

      // Attempt silent re-authentication via Identity Toolkit if email credentials exist in sessionStorage
      const silentlyRenewed = await trySilentEmailReauth(authInstance);
      if (silentlyRenewed && authInstance.currentUser) {
        currentUser = authInstance.currentUser as any;
        sts = currentUser?.stsTokenManager;
        if (sts?.accessToken && sts?.expirationTime && Number(sts.expirationTime) > Date.now() + 30_000) {
          tokenServiceApiDisabled = false;
          return { accessToken: String(sts.accessToken) };
        }
      }

      if (tokenServiceApiDisabled) {
        return null;
      }
      const res = await origGetToken(false);
      if (!res || !res.accessToken) {
        return null;
      }
      return res;
    } catch (err) {
      if (isSecureTokenServiceDisabledError(err)) {
        tokenServiceApiDisabled = true;
        stopProactiveRefreshSafely(authInstance);
        stopProactiveRefreshSafely(authInstance.currentUser);
        classifyFirestoreError(err);
      }
      // Always resolve to null rather than rejecting so Firestore read queries never fail with 'Fetching auth token failed'
      return null;
    }
  };
  target.__resilientGetTokenPatched = true;
}

function createResilientAuth(firebaseApp: FirebaseApp): Auth {
  let authInstance: Auth;
  if (typeof window !== 'undefined') {
    try {
      authInstance = initializeAuth(firebaseApp, {
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
      authInstance = getAuth(firebaseApp);
    }
  } else {
    authInstance = getAuth(firebaseApp);
  }

  // Patch getToken on authInstance, its prototype, and the internal 'auth-internal' provider
  patchAuthInternalGetToken(authInstance as any, authInstance);
  const authProto = Object.getPrototypeOf(authInstance);
  if (authProto) {
    patchAuthInternalGetToken(authProto, authInstance);
  }
  try {
    const authInternalProvider = (firebaseApp as any)?.container?.getProvider?.('auth-internal');
    if (authInternalProvider?.isInitialized?.()) {
      const authInternal = authInternalProvider.getImmediate?.();
      if (authInternal) {
        patchAuthInternalGetToken(authInternal, authInstance);
      }
    }
  } catch {
    // Ignore internal container access errors
  }

  if (typeof window !== 'undefined') {
    if (authInstance.currentUser) {
      patchUserTokenMethods(authInstance.currentUser);
    }
    authInstance.onIdTokenChanged((currentUser) => {
      if (currentUser) {
        patchUserTokenMethods(currentUser);
        const sts = (currentUser as any)?.stsTokenManager;
        if (sts?.accessToken && sts?.expirationTime && Number(sts.expirationTime) > Date.now() + 30_000) {
          tokenServiceApiDisabled = false;
        }
      }
    });
  }

  return authInstance;
}

// 4. Initialize resilient Auth BEFORE Firestore so Firestore's credentials provider uses the guarded getToken
export const auth: Auth = createResilientAuth(app);

// 5. Initialize Firestore strictly targeting the verified named database ID
export const db: Firestore = getFirestore(app, targetDatabaseId);
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

export type FeatureDataSourceType =
  | 'firestore-server'
  | 'memory-cache'
  | 'local-storage'
  | 'static-fallback-oct22';

export interface DataSourceStatus {
  isUsingFallback: boolean;
  features: Record<string, { source: FeatureDataSourceType; updatedAt: string; reason?: string }>;
}

let lastDiagnosticInfo: FirestoreDiagnosticInfo | null = null;
const featureDataSources: Record<string, { source: FeatureDataSourceType; updatedAt: string; reason?: string }> = {};

export function getLatestFirestoreDiagnostic(): FirestoreDiagnosticInfo | null {
  return lastDiagnosticInfo;
}

export function clearLatestFirestoreDiagnostic(): void {
  lastDiagnosticInfo = null;
}

export function recordFeatureDataSource(
  feature: string,
  source: FeatureDataSourceType,
  reason?: string
): void {
  featureDataSources[feature] = {
    source,
    updatedAt: new Date().toISOString(),
    ...(reason ? { reason } : {})
  };
}

export function getDataSourceStatus(): DataSourceStatus {
  const isUsingFallback = Object.values(featureDataSources).some(
    entry => entry.source === 'static-fallback-oct22'
  );
  return {
    isUsingFallback,
    features: { ...featureDataSources }
  };
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
      'Layanan Secure Token Service API (securetoken.googleapis.com) pada Google Cloud Project 803333166092 belum diaktifkan atau sedang mengalami pembatasan. Sesi login Anda tetap dipertahankan.';
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
      'Koneksi client Firestore sedang offline atau terputus dari server.';
  } else if (code.includes('failed-precondition') || rawMsg.includes('requires an index')) {
    category = 'query-precondition-failed';
    summary = 'Kueri membutuhkan indeks komposit Firestore atau kondisi prasyarat data belum terpenuhi.';
  } else if (code.includes('resource-exhausted') || rawMsg.includes('quota') || rawMsg.includes('Quota exceeded')) {
    category = 'resource-exhausted';
    summary =
      'Batas kuota baca harian gratis (Free Tier Daily Read Quota) Cloud Firestore pada database produksi telah tercapai. Data terbaru Anda tetap aman di server Firestore; untuk sementara sistem menampilkan cadangan statis (22 Okt 2026) hingga kuota harian di-reset atau proyek di-upgrade ke paket Blaze.';
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
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function hasActiveFirestoreAuthToken(): boolean {
  try {
    const currentUser = auth.currentUser as any;
    if (!currentUser) return false;
    const sts = currentUser.stsTokenManager;
    if (!sts || !sts.accessToken) return false;
    if (sts.expirationTime && Number(sts.expirationTime) <= Date.now() + 30_000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures Firestore has a valid, non-expired Firebase Auth ID token before performing
 * a privileged write operation. On projects where securetoken.googleapis.com is disabled,
 * tokens expire after 1 hour; this helper renews the token via Identity Toolkit
 * (silent email reauth or Google OAuth popup) and cycles the Firestore connection so
 * the write request carries a valid Authorization header.
 */
export async function ensureFreshFirestoreAuthToken(): Promise<boolean> {
  try {
    if ((auth as any)._initializationPromise) {
      await (auth as any)._initializationPromise;
    }
  } catch {
    // ignore initialization wait errors
  }

  if (hasActiveFirestoreAuthToken()) {
    return true;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Akses ditolak: Anda belum login sebagai administrator.');
  }

  // 1. Try silent email/password re-authentication via Identity Toolkit
  const silentlyRenewed = await trySilentEmailReauth(auth);
  if (silentlyRenewed && hasActiveFirestoreAuthToken()) {
    try {
      await disableNetwork(db);
      await enableNetwork(db);
    } catch {
      // ignore network cycle notices
    }
    return true;
  }

  // 2. If running in browser, renew token via Google Identity Toolkit popup
  if (typeof window !== 'undefined') {
    const provider = new GoogleAuthProvider();
    if (currentUser.email) {
      provider.setCustomParameters({ login_hint: currentUser.email });
    }
    try {
      const cred = await reauthenticateWithPopup(currentUser, provider, browserPopupRedirectResolver);
      if (cred?.user) {
        tokenServiceApiDisabled = false;
        patchUserTokenMethods(cred.user);
      }
    } catch {
      try {
        const cred = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        if (cred?.user) {
          tokenServiceApiDisabled = false;
          patchUserTokenMethods(cred.user);
        }
      } catch {
        // Handled by final check below
      }
    }

    if (hasActiveFirestoreAuthToken()) {
      try {
        await disableNetwork(db);
        await enableNetwork(db);
      } catch {
        // ignore network cycle notices
      }
      return true;
    }
  }

  throw new Error(
    'Token autentikasi sesi admin Anda (1 jam) telah kedaluwarsa dan pembaruan token dibatalkan. Silakan keluar (Logout) lalu masuk (Login) kembali agar perubahan dapat disimpan secara permanen ke Cloud Firestore.'
  );
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

  console.warn(`[Firestore Diagnostic - ${category}] ${summary} (Code: ${code}, Path: ${path || '-'})`, errInfo);
  
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
    const rawMsg = error instanceof Error ? error.message : String(error || '');
    if (rawMsg.includes('client is offline')) {
      try {
        await enableNetwork(db);
        await getDocFromServer(doc(db, 'system', 'initialized'));
        return true;
      } catch (retryErr) {
        error = retryErr;
      }
    }
    const { category, summary } = classifyFirestoreError(error);
    if (
      category === 'network-or-domain-blocked' ||
      category === 'resource-exhausted' ||
      category === 'unauthenticated' ||
      category === 'database-not-found'
    ) {
      console.warn(`[Firebase Connection Diagnostic] ${summary}`);
      return false;
    }
    // Permission-denied on system/initialized still confirms server is reachable and responding
    return true;
  }
}


