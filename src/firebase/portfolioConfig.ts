import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
// Ensure Dars with Osama's primary [DEFAULT] Firebase app is always initialized first
// so this secondary read-only named app never interferes with primary getApp() calls.
import './config';

/**
 * Public URL of the source Portfolio website (primary source of truth for Instructor Profile).
 */
export const PORTFOLIO_WEBSITE_URL = 'https://cvosamanursamsil.netlify.app/';

/**
 * Dedicated named Firebase App identifier for read-only public portfolio integration.
 * Kept strictly separate from Dars with Osama's [DEFAULT] app and primary Firestore database.
 */
export const PORTFOLIO_FIREBASE_APP_NAME = 'dars-portfolio-readonly';

/**
 * Verified named Firestore database ID of the portfolio website (cvosamanursamsil.netlify.app).
 */
export const PORTFOLIO_FIRESTORE_DATABASE_ID = 'ai-studio-1309822a-cae0-43ad-a7e6-3d81e39b9eeb';

export interface PortfolioFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId: string;
}

const getMetaEnv = (): Record<string, string | undefined> => {
  try {
    return ((import.meta as unknown as { env?: Record<string, string | undefined> })?.env || {});
  } catch {
    return {};
  }
};

const env = getMetaEnv();

/**
 * Public Firebase client configuration for the portfolio website.
 * Supports optional VITE_PORTFOLIO_FIREBASE_* environment variable overrides while defaulting
 * to the verified public client configuration of https://cvosamanursamsil.netlify.app/.
 * Note: Firebase Web client identifiers are public by design and governed by Firestore Security Rules.
 */
export const portfolioFirebaseConfig: PortfolioFirebaseConfig = {
  apiKey: (env.VITE_PORTFOLIO_FIREBASE_API_KEY || '').trim() || 'AIzaSyCTYkzSW14-cDg8Oep5Qw2oX_x5nrnZ-yM',
  authDomain: (env.VITE_PORTFOLIO_FIREBASE_AUTH_DOMAIN || '').trim() || 'premium-generator-4lxdt.firebaseapp.com',
  projectId: (env.VITE_PORTFOLIO_FIREBASE_PROJECT_ID || '').trim() || 'premium-generator-4lxdt',
  storageBucket: (env.VITE_PORTFOLIO_FIREBASE_STORAGE_BUCKET || '').trim() || 'premium-generator-4lxdt.firebasestorage.app',
  messagingSenderId: (env.VITE_PORTFOLIO_FIREBASE_MESSAGING_SENDER_ID || '').trim() || '803333166092',
  appId: (env.VITE_PORTFOLIO_FIREBASE_APP_ID || '').trim() || '1:803333166092:web:be9f33266465ad72410a29',
  firestoreDatabaseId:
    (env.VITE_PORTFOLIO_FIREBASE_FIRESTORE_DATABASE_ID || '').trim() || PORTFOLIO_FIRESTORE_DATABASE_ID
};

let cachedPortfolioApp: FirebaseApp | null = null;
let cachedPortfolioDb: Firestore | null = null;

/**
 * Lazily returns the isolated read-only FirebaseApp instance for the portfolio project.
 * Never attaches Firebase Auth so public portfolio reads remain strictly unauthenticated
 * and completely decoupled from Dars with Osama user/admin sessions.
 */
export function getPortfolioFirebaseApp(): FirebaseApp {
  if (cachedPortfolioApp) {
    return cachedPortfolioApp;
  }

  const existing = getApps().find((a) => a.name === PORTFOLIO_FIREBASE_APP_NAME);
  if (existing) {
    cachedPortfolioApp = existing;
    return existing;
  }

  cachedPortfolioApp = initializeApp(
    {
      apiKey: portfolioFirebaseConfig.apiKey,
      authDomain: portfolioFirebaseConfig.authDomain,
      projectId: portfolioFirebaseConfig.projectId,
      storageBucket: portfolioFirebaseConfig.storageBucket,
      messagingSenderId: portfolioFirebaseConfig.messagingSenderId,
      appId: portfolioFirebaseConfig.appId
    },
    PORTFOLIO_FIREBASE_APP_NAME
  );

  return cachedPortfolioApp;
}

/**
 * Lazily returns the Firestore instance targeting the portfolio named database.
 */
export function getPortfolioFirestore(): Firestore {
  if (cachedPortfolioDb) {
    return cachedPortfolioDb;
  }

  const portfolioApp = getPortfolioFirebaseApp();
  cachedPortfolioDb = getFirestore(portfolioApp, portfolioFirebaseConfig.firestoreDatabaseId);
  return cachedPortfolioDb;
}
