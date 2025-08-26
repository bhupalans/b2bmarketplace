
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, getRedirectResult } from 'firebase/auth';
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

  // This effect should only run once on mount to handle the redirect result.
  useEffect(() => {
    const processRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User has successfully signed in via redirect.
          // Let's check if we need to create a profile for them.
          const redirectedUser = result.user;
          const userDocRef = doc(db, "users", redirectedUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // This is a first-time sign-in, create a user profile.
            const userProfile = {
              name: redirectedUser.displayName,
              email: redirectedUser.email,
              role: 'buyer', // Default role
              avatar: redirectedUser.photoURL || `https://i.pravatar.cc/150?u=${redirectedUser.uid}`,
            };
            await setDoc(userDocRef, userProfile);
          }
        }
      } catch (error) {
        // This error is expected if the user just loaded the page without a redirect.
        if (error.code !== 'auth/no-redirect-operation') {
          console.error("Error processing redirect result:", error);
        }
      }
    };
    processRedirectResult();
  }, []);

  // This effect sets up the central auth state listener.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // User is signed in. Fetch their profile from Firestore.
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
          // This case might happen if profile creation failed after redirect.
          // Or if the user exists in Auth but not in Firestore.
          setUser(null);
        }
      } else {
        // User is signed out.
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
