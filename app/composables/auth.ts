import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

export default function useAuth() {
  const auth = useFirebaseAuth();

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Auth is not initialized');
    const googleAuthProvider = new GoogleAuthProvider();
    return signInWithPopup(auth, googleAuthProvider);
  };

  const logout = () => {
    if (!auth) throw new Error('Auth is not initialized');
    return signOut(auth);
  };

  return {
    signInWithGoogle,
    logout,
  };
}