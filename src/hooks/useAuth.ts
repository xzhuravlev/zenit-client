import { useState } from 'react';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  const login = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();

    await fetch('http://localhost:3000/auth/google', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setUser(result.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const getToken = async () => {
    return await auth.currentUser?.getIdToken();
  };

  return { user, login, logout, getToken };
};