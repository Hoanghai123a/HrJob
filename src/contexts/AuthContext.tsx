import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      
      if (data.status === 'disabled') {
        await signOut(auth);
        throw new Error('Tài khoản của bạn đã bị vô hiệu hóa.');
      }

      const isAdminEmail = auth.currentUser?.email === 'admin@vrecruit.com' || auth.currentUser?.email === 'hoanghaitdvp98@gmail.com';
      let role = data.role;
      if (isAdminEmail && data.role !== 'admin') {
        role = 'admin';
      }

      const updatedProfile = { 
        ...data, 
        role, 
        lastLogin: serverTimestamp(),
        status: 'active' as const
      };
      
      await setDoc(docRef, updatedProfile, { merge: true });
      setProfile(updatedProfile);
    } else {
      const isAdminEmail = auth.currentUser?.email === 'admin@vrecruit.com' || auth.currentUser?.email === 'hoanghaitdvp98@gmail.com';
      const newProfile: UserProfile = {
        uid,
        email: auth.currentUser?.email || '',
        role: isAdminEmail ? 'admin' : 'user',
        defaultHC: 8,
        defaultOT: 0,
        lcb: 0,
        bankInfo: { bankName: '', accountNumber: '', accountName: '' },
        status: 'active',
        lastLogin: serverTimestamp()
      };
      await setDoc(docRef, newProfile);
      setProfile(newProfile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await fetchProfile(user.uid);
          setUser(user);
        } catch (error: any) {
          console.error('Account disabled or profile error:', error);
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, pass: string) => {
    const loginEmail = (email === 'admin' || !email.includes('@')) ? `${email}@vrecruit.com` : email;
    await signInWithEmailAndPassword(auth, loginEmail, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  const changePassword = async (newPass: string) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPass);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, refreshProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
