
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';

type AuthContextType = {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, uid: fbUser.uid, ...userDoc.data() } as User);
        } else {
            // This is the critical fix: If the user exists in Auth but not Firestore, create them.
            console.warn("No user profile found in Firestore for UID:", fbUser.uid, ". Creating one now.");
            const nameFromEmail = fbUser.email ? fbUser.email.split('@')[0] : 'New User';
            const newUserProfile: Omit<User, 'id'> = {
              uid: fbUser.uid,
              email: fbUser.email || 'no-email@provided.com',
              name: nameFromEmail,
              role: 'buyer', // Safe default role
              avatar: `https://i.pravatar.cc/150?u=${fbUser.uid}`,
              username: nameFromEmail + Math.floor(Math.random() * 1000)
            };
            
            try {
              await setDoc(userDocRef, newUserProfile);
              setUser({ id: fbUser.uid, ...newUserProfile });
            } catch(e) {
                console.error("Failed to create new user profile in Firestore:", e);
                setUser(null);
            }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
