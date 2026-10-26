import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  getRedirectResult,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth, testConnection } from '../firebase/config';
import { UserProfile } from '../types';
import { getUserProfile, saveUserProfile, checkIsAdmin, bootstrapAdmin, isPlatformAdminEmail } from '../firebase/services';

export interface PendingAction {
  type: 'enroll' | 'quiz' | 'session';
  courseId?: string;
  sessionId?: string;
  quizId?: string;
  onSuccess?: () => void;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  firebaseConnected: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  // Auth modal & pending action
  authModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'forgot';
  openAuthModal: (tab?: 'login' | 'register' | 'forgot', pending?: PendingAction) => void;
  closeAuthModal: () => void;
  pendingAction: PendingAction | null;
  clearPendingAction: () => void;
  // Guest Access Modal
  guestModalOpen: boolean;
  guestModalCourse: any | null;
  openGuestModal: (course?: any | null, pending?: PendingAction) => void;
  closeGuestModal: () => void;
  // Logout Confirm Modal
  logoutConfirmModalOpen: boolean;
  openLogoutConfirmModal: () => void;
  closeLogoutConfirmModal: () => void;
  // Profile Settings Modal
  profileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildDefaultProfile(firebaseUser: User, isAdminRole: boolean, customDisplayName?: string): UserProfile {
  const base: UserProfile = {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName:
      customDisplayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'Peserta',
    role: isAdminRole ? 'admin' : 'student',
    createdAt: new Date().toISOString()
  };
  if (firebaseUser.photoURL) {
    base.photoURL = firebaseUser.photoURL;
  }
  return base;
}

function isSecureTokenApiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    msg.includes('token-service-api-has-not-been-used') ||
    msg.includes('securetoken.googleapis.com') ||
    msg.includes('Fetching auth token failed')
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(true);

  // Modal & pending action states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Guest modal state
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalCourse, setGuestModalCourse] = useState<any | null>(null);

  // Logout confirm modal state
  const [logoutConfirmModalOpen, setLogoutConfirmModalOpen] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const clearToast = () => setToastMessage(null);

  const syncUserProfileAndAdmin = useCallback(async (currentUser: User, customDisplayName?: string) => {
    const isOwner = Boolean(currentUser.email && isPlatformAdminEmail(currentUser.email));
    if (isOwner) {
      setIsAdmin(true);
    }

    // Set immediate fallback profile in state so UI updates without waiting for Firestore
    setUserProfile(prev => prev && prev.id === currentUser.uid ? prev : buildDefaultProfile(currentUser, isOwner, customDisplayName));

    try {
      // Proactively test ID token to catch STS disabled issues before triggering Firestore token loop
      try {
        await currentUser.getIdToken();
      } catch (tokenErr: any) {
        if (isSecureTokenApiError(tokenErr)) {
          console.warn('[Auth] Token service API disabled in GCP project. Resetting session to guest mode so Firestore public reads succeed:', tokenErr);
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
          return;
        }
      }

      if (isOwner && currentUser.email) {
        await bootstrapAdmin(currentUser.uid, currentUser.email).catch(() => {});
      }

      const adminStatus = await checkIsAdmin(currentUser.uid, currentUser.email);
      const finalIsAdmin = Boolean(adminStatus || isOwner);
      setIsAdmin(finalIsAdmin);

      let profile = await getUserProfile(currentUser.uid);
      if (!profile) {
        profile = buildDefaultProfile(currentUser, finalIsAdmin, customDisplayName);
        await saveUserProfile(profile).catch(() => {});
      } else {
        let updated = false;
        if (finalIsAdmin && profile.role !== 'admin') {
          profile.role = 'admin';
          updated = true;
        }
        if (!profile.photoURL && currentUser.photoURL) {
          profile.photoURL = currentUser.photoURL;
          updated = true;
        }
        if (updated) {
          await saveUserProfile(profile).catch(() => {});
        }
      }
      setUserProfile(profile);
    } catch (err) {
      console.warn('Non-blocking profile/admin sync notice:', err);
    }
  }, []);

  useEffect(() => {
    // Test connection on boot
    testConnection().then(res => setFirebaseConnected(res));

    // Handle any pending redirect sign-in result gracefully
    if (typeof window !== 'undefined') {
      getRedirectResult(auth, browserPopupRedirectResolver)
        .then(async (result) => {
          if (result?.user) {
            try {
              await result.user.getIdToken();
              setUser(result.user);
              setAuthModalOpen(false);
              setGuestModalOpen(false);
              showToast('Berhasil masuk menggunakan akun Google.');
              syncUserProfileAndAdmin(result.user);
            } catch (tokenErr) {
              if (isSecureTokenApiError(tokenErr)) {
                await signOut(auth).catch(() => {});
                setUser(null);
                setUserProfile(null);
                setIsAdmin(false);
              }
            }
          }
        })
        .catch(err => {
          console.warn('Redirect auth check notice:', err);
        });
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          try {
            await currentUser.getIdToken();
            setUser(currentUser);
            setAuthModalOpen(false);
            setGuestModalOpen(false);
            syncUserProfileAndAdmin(currentUser);
          } catch (tokenErr: any) {
            if (isSecureTokenApiError(tokenErr)) {
              console.warn('[Auth] Token service API disabled in GCP project. Resetting session to guest mode so Firestore public reads succeed:', tokenErr);
              await signOut(auth).catch(() => {});
              setUser(null);
              setUserProfile(null);
              setIsAdmin(false);
            } else {
              setUser(currentUser);
              setAuthModalOpen(false);
              setGuestModalOpen(false);
              syncUserProfileAndAdmin(currentUser);
            }
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('[onAuthStateChanged notice]:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showToast, syncUserProfileAndAdmin]);

  const refreshProfile = async () => {
    if (!user) return;
    await syncUserProfileAndAdmin(user);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const authedUser = cred.user;
    try {
      await authedUser.getIdToken();
    } catch (tokenErr: any) {
      if (isSecureTokenApiError(tokenErr)) {
        await signOut(auth).catch(() => {});
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        showToast('Layanan Secure Token Service API di Google Cloud Project belum diaktifkan. Mode baca publik tetap dapat digunakan.');
        return;
      }
    }
    setUser(authedUser);
    if (isPlatformAdminEmail(authedUser.email)) {
      setIsAdmin(true);
    }
    setAuthModalOpen(false);
    setGuestModalOpen(false);
    showToast('Berhasil masuk ke akun Dars with Osama.');
    // Sync Firestore profile in background so login never hangs
    syncUserProfileAndAdmin(authedUser);
  };

  const signupWithEmail = async (email: string, pass: string, displayName: string) => {
    const cleanEmail = email.trim();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    try {
      await cred.user.getIdToken();
    } catch (tokenErr: any) {
      if (isSecureTokenApiError(tokenErr)) {
        await signOut(auth).catch(() => {});
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        showToast('Layanan Secure Token Service API di Google Cloud Project belum diaktifkan. Mode baca publik tetap dapat digunakan.');
        return;
      }
    }
    if (displayName) {
      await updateProfile(cred.user, { displayName }).catch(() => {});
    }
    const isOwnerAdmin = isPlatformAdminEmail(cred.user.email || cleanEmail);
    setUser(cred.user);
    if (isOwnerAdmin) {
      setIsAdmin(true);
    }
    const newProfile = buildDefaultProfile(cred.user, isOwnerAdmin, displayName);
    setUserProfile(newProfile);
    setAuthModalOpen(false);
    setGuestModalOpen(false);
    showToast('Pendaftaran berhasil! Selamat datang di Dars with Osama.');
    // Persist profile in background
    syncUserProfileAndAdmin(cred.user, displayName);
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      const googleUser = result.user;
      try {
        await googleUser.getIdToken();
      } catch (tokenErr: any) {
        if (isSecureTokenApiError(tokenErr)) {
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
          showToast('Layanan Secure Token Service API di Google Cloud Project belum diaktifkan. Mode baca publik tetap dapat digunakan.');
          return false;
        }
      }
      setUser(googleUser);
      if (isPlatformAdminEmail(googleUser.email)) {
        setIsAdmin(true);
      }
      setAuthModalOpen(false);
      setGuestModalOpen(false);
      showToast('Berhasil masuk menggunakan akun Google.');
      // Sync Firestore profile & admin document in background so modal closes immediately
      syncUserProfileAndAdmin(googleUser);
      return true;
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        return false;
      }
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setIsAdmin(false);
    setLogoutConfirmModalOpen(false);
    showToast('Anda telah berhasil keluar dari akun.');
  };

  const openLogoutConfirmModal = () => setLogoutConfirmModalOpen(true);
  const closeLogoutConfirmModal = () => setLogoutConfirmModalOpen(false);

  const openAuthModal = (tab: 'login' | 'register' | 'forgot' = 'login', pending?: PendingAction) => {
    setAuthModalTab(tab);
    if (pending) {
      setPendingAction(pending);
    }
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const openGuestModal = (course?: any | null, pending?: PendingAction) => {
    if (course) setGuestModalCourse(course);
    if (pending) setPendingAction(pending);
    setGuestModalOpen(true);
  };

  const closeGuestModal = () => {
    setGuestModalOpen(false);
  };

  const clearPendingAction = () => {
    setPendingAction(null);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const current = userProfile || {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Peserta',
      role: isAdmin ? 'admin' : 'student',
      createdAt: new Date().toISOString()
    };

    const updatedProfile: UserProfile = {
      ...current,
      ...updates,
      id: user.uid,
      updatedAt: new Date().toISOString()
    };

    if ((updates.displayName || updates.photoURL) && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updates.displayName || auth.currentUser.displayName || '',
        photoURL: updates.photoURL || auth.currentUser.photoURL || ''
      }).catch(err => console.warn('Firebase auth updateProfile notice:', err));
    }

    await saveUserProfile(updatedProfile);
    setUserProfile(updatedProfile);
  };

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const openProfileModal = () => setProfileModalOpen(true);
  const closeProfileModal = () => setProfileModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isAdmin,
        loading,
        firebaseConnected,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        refreshProfile,
        updateUserProfile,
        authModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        pendingAction,
        clearPendingAction,
        guestModalOpen,
        guestModalCourse,
        openGuestModal,
        closeGuestModal,
        logoutConfirmModalOpen,
        openLogoutConfirmModal,
        closeLogoutConfirmModal,
        profileModalOpen,
        openProfileModal,
        closeProfileModal,
        toastMessage,
        showToast,
        clearToast
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
