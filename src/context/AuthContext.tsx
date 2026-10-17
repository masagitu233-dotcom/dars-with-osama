import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const clearToast = () => setToastMessage(null);

  useEffect(() => {
    // Test connection on boot
    testConnection().then(res => setFirebaseConnected(res));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const isOwner = currentUser.email && isPlatformAdminEmail(currentUser.email);

          if (isOwner) {
            await bootstrapAdmin(currentUser.uid, currentUser.email!);
          }

          // Check admin status
          const adminStatus = await checkIsAdmin(currentUser.uid, currentUser.email);
          const finalIsAdmin = Boolean(adminStatus || isOwner);
          setIsAdmin(finalIsAdmin);

          // Fetch profile or create default
          let profile = await getUserProfile(currentUser.uid);
          if (!profile) {
            profile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Peserta',
              role: finalIsAdmin ? 'admin' : 'student',
              photoURL: currentUser.photoURL || undefined,
              createdAt: new Date().toISOString()
            };
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
          console.error('Error loading user profile / admin state:', err);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) setUserProfile(profile);
      const adminStatus = await checkIsAdmin(user.uid, user.email);
      setIsAdmin(Boolean(adminStatus || isPlatformAdminEmail(user.email)));
    } catch (err) {
      console.error('Profile refresh failed:', err);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    setUser(cred.user);
    await refreshProfile();
    setAuthModalOpen(false);
    setGuestModalOpen(false);
    showToast('Berhasil masuk ke akun Dars with Osama.');
  };

  const signupWithEmail = async (email: string, pass: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    const isOwnerAdmin = isPlatformAdminEmail(cred.user.email || email);
    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email,
      displayName: displayName || email.split('@')[0],
      role: isOwnerAdmin ? 'admin' : 'student',
      createdAt: new Date().toISOString()
    };
    await saveUserProfile(newProfile).catch(() => {});
    if (isOwnerAdmin) {
      await bootstrapAdmin(cred.user.uid, cred.user.email || email);
      setIsAdmin(true);
    }
    setUserProfile(newProfile);
    setAuthModalOpen(false);
    setGuestModalOpen(false);
    showToast('Pendaftaran berhasil! Selamat datang di Dars with Osama.');
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const isOwnerAdmin = isPlatformAdminEmail(googleUser.email);
      const existing = await getUserProfile(googleUser.uid);
      if (!existing) {
        const profile: UserProfile = {
          id: googleUser.uid,
          email: googleUser.email || '',
          displayName: googleUser.displayName || 'Peserta',
          photoURL: googleUser.photoURL || undefined,
          role: isOwnerAdmin ? 'admin' : 'student',
          createdAt: new Date().toISOString()
        };
        await saveUserProfile(profile).catch(() => {});
        setUserProfile(profile);
      } else {
        setUserProfile(existing);
      }
      if (isOwnerAdmin) {
        await bootstrapAdmin(googleUser.uid, googleUser.email || '');
        setIsAdmin(true);
      }
      setAuthModalOpen(false);
      setGuestModalOpen(false);
      showToast('Berhasil masuk menggunakan akun Google.');
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
