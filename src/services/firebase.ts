import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import { UserAccount } from '../types';

// Read config from Vite environment variables (or user-provided values)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('YOUR_')
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

export function getFriendlyFirebaseError(error: any, fallback: string = 'Service temporarily unavailable. Please try again.'): string {
  if (!error) return fallback;
  const code = error.code || '';
  const message = error.message || '';

  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in window was closed. Tap Google Sign-in to try again.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Pop-up window was blocked by your browser. Please allow pop-ups for SplitShare.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Sign-in request restarted. Please continue in the active popup.';
  }
  if (code === 'auth/network-request-failed' || /network|failed to fetch/i.test(message)) {
    return 'Network connection issue. Please check your internet and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please sign in with your password or Google.';
  }
  if (
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found'
  ) {
    return 'Incorrect email or password. Please verify your credentials.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too short. Please choose at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many login attempts. For security, please wait a minute before trying again.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account is currently inactive. Please contact support.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Authentication service is not configured for this domain yet.';
  }
  if (code.startsWith('auth/') || message.includes('Firebase:')) {
    return 'Authentication service is temporarily busy. Please try again in a moment.';
  }
  return message || fallback;
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * 1-Click Google Sign-In
 */
export async function signInWithGoogle(): Promise<{
  success: boolean;
  account?: UserAccount;
  error?: string;
}> {
  if (!auth) {
    return {
      success: false,
      error: 'Firebase is not configured yet. Add your Firebase keys in .env file.',
    };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    // Check if user document already exists in Firestore
    let existingProfile: Partial<UserAccount> = {};
    if (db) {
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          existingProfile = userDoc.data() as Partial<UserAccount>;
        }
      } catch (err) {
        console.warn('Could not fetch existing Firestore user:', err);
      }
    }

    let idToken = '';
    try {
      idToken = await fbUser.getIdToken();
    } catch {}

    const account: UserAccount = {
      id: fbUser.uid,
      username: existingProfile.username || fbUser.email?.split('@')[0] || `user_${Date.now()}`,
      email: fbUser.email || '',
      name: fbUser.displayName || existingProfile.name || 'SplitShare User',
      avatar: existingProfile.avatar || '🚀',
      phone: fbUser.phoneNumber || existingProfile.phone || '',
      upiId: existingProfile.upiId || '',
      upiAccounts: existingProfile.upiAccounts || [],
      emailVerified: fbUser.emailVerified,
      authProvider: 'google',
      idToken: idToken || undefined,
      createdAt: existingProfile.createdAt || new Date().toISOString(),
    };

    // Save/sync in Firestore
    if (db) {
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        await setDoc(userDocRef, account, { merge: true });
      } catch (err) {
        console.warn('Error saving to Firestore:', err);
      }
    }

    return { success: true, account };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    return {
      success: false,
      error: getFriendlyFirebaseError(error, 'Google sign-in could not be completed. Please try again.'),
    };
  }
}

/**
 * Sign up with Email, Password & details + automatic email verification link
 */
export async function signUpWithEmail(data: {
  email: string;
  password: string;
  name: string;
  username: string;
  phone?: string;
  upiId?: string;
  avatar?: string;
}): Promise<{
  success: boolean;
  account?: UserAccount;
  error?: string;
  verificationSent?: boolean;
}> {
  if (!auth) {
    return {
      success: false,
      error: 'Firebase is not configured yet. Add your Firebase keys in .env file.',
    };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
    const fbUser = cred.user;

    // Send email verification link
    let verificationSent = false;
    try {
      await sendEmailVerification(fbUser);
      verificationSent = true;
    } catch (vErr) {
      console.warn('Failed to send email verification:', vErr);
    }

    const account: UserAccount = {
      id: fbUser.uid,
      username: data.username.trim(),
      email: data.email.trim(),
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      upiId: data.upiId?.trim() || '',
      avatar: data.avatar || '😀',
      emailVerified: fbUser.emailVerified,
      authProvider: 'password',
      createdAt: new Date().toISOString(),
      upiAccounts: data.upiId?.trim()
        ? [
            {
              id: 'upi_' + Date.now(),
              label: 'Primary UPI',
              upiId: data.upiId.trim(),
              isDefault: true,
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
    };

    // Persist in Firestore
    if (db) {
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        await setDoc(userDocRef, account, { merge: true });
      } catch (err) {
        console.warn('Error saving to Firestore:', err);
      }
    }

    return { success: true, account, verificationSent };
  } catch (error: any) {
    return {
      success: false,
      error: getFriendlyFirebaseError(error, 'Registration could not be completed. Please try again.'),
    };
  }
}

/**
 * Sign In with Email & Password
 */
export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{
  success: boolean;
  account?: UserAccount;
  error?: string;
  emailVerified?: boolean;
}> {
  if (!auth) {
    return {
      success: false,
      error: 'Firebase is not configured yet. Add your Firebase keys in .env file.',
    };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = cred.user;

    let account: UserAccount = {
      id: fbUser.uid,
      username: fbUser.email?.split('@')[0] || `user_${Date.now()}`,
      email: fbUser.email || '',
      name: fbUser.displayName || 'SplitShare User',
      avatar: '😀',
      emailVerified: fbUser.emailVerified,
      authProvider: 'password',
      createdAt: new Date().toISOString(),
    };

    // Fetch details from Firestore if available
    if (db) {
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data() as UserAccount;
          account = {
            ...account,
            ...data,
            emailVerified: fbUser.emailVerified,
          };
        }
      } catch (err) {
        console.warn('Could not fetch Firestore document:', err);
      }
    }

    return {
      success: true,
      account,
      emailVerified: fbUser.emailVerified,
    };
  } catch (error: any) {
    return {
      success: false,
      error: getFriendlyFirebaseError(error, 'Incorrect email or password. Please verify your credentials.'),
    };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!auth) {
    return {
      success: false,
      error: 'Firebase is not configured yet.',
    };
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: getFriendlyFirebaseError(error, 'Could not send password reset email. Please try again.'),
    };
  }
}

/**
 * Re-send email verification
 */
export async function resendVerificationEmail(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!auth || !auth.currentUser) {
    return {
      success: false,
      error: 'No active session found.',
    };
  }

  try {
    await sendEmailVerification(auth.currentUser);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: getFriendlyFirebaseError(error, 'Failed to send verification link. Please try again.'),
    };
  }
}

/**
 * Sign out of Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  if (auth) {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  }
}

/**
 * Listen for Auth state changes
 */
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export { auth, db };
