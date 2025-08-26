
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

  useEffect(() => {
    // This effect runs once on mount to handle both existing sessions and redirect results.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in via a session.
        setFirebaseUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
          setUser(null); 
        }
        setLoading(false);
      } else {
        // No user session, check for redirect result.
        try {
          const result = await getRedirectResult(auth);
          if (result) {
            // This is the return from a Google Sign-in redirect
            const redirectedUser = result.user;
            setFirebaseUser(redirectedUser);
            const userDocRef = doc(db, "users", redirectedUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
              // First time login via Google, create a profile
              const userProfile = {
                name: redirectedUser.displayName,
                email: redirectedUser.email,
                role: 'buyer', // Default role
                avatar: redirectedUser.photoURL || `https://i.pravatar.cc/150?u=${redirectedUser.uid}`,
              };
              await setDoc(userDocRef, userProfile);
              setUser({ id: redirectedUser.uid, ...userProfile } as User);
            } else {
              // Existing user, just set their data
              setUser({ id: userDoc.id, ...userDoc.data() } as User);
            }
          }
        } catch (error) {
           // This error is expected if the user just loaded the page without a redirect.
          if (error.code !== 'auth/no-redirect-operation') {
            console.error("Error getting redirect result:", error);
          }
        } finally {
          // If there's no session and no redirect result, we are done loading.
           setFirebaseUser(null);
           setUser(null);
           setLoading(false);
        }
      }
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
