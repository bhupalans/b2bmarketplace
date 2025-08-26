
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, getRedirectResult, UserCredential } from 'firebase/auth';
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
    // This effect runs once on mount to handle the redirect result.
    getRedirectResult(auth)
      .then(async (result: UserCredential | null) => {
        if (result) {
          // This is a first-time sign-in from Google via redirect.
          const user = result.user;
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            // Create their profile if it doesn't exist
            console.log("Creating new user profile for Google redirect user.");
            const userProfile = {
              name: user.displayName,
              email: user.email,
              role: 'buyer', // Default role
              avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
            };
            await setDoc(userDocRef, userProfile);
          }
        }
        // If result is null, it's a normal page load, not a redirect return.
        // The onAuthStateChanged listener below will handle all cases of setting the user.
      })
      .catch((error) => {
        console.error("Error getting redirect result:", error);
      });


    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // User is signed in. Fetch their profile from Firestore.
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
            // This case handles a first-time sign-in from a non-redirect method (e.g., popup)
            console.log("Creating new user profile for Google popup user.");
            const userProfile = {
              name: user.displayName,
              email: user.email,
              role: 'buyer', // Default role
              avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
            };
            await setDoc(userDocRef, userProfile);
            setUser({ id: user.uid, ...userProfile } as User);
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
