
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, SubscriptionPlan } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { convertTimestamps } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  updateUserContext: (newUser: User) => void;
  revalidateUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === "object" &&
    "toDate" in (value as Record<string, unknown>) &&
    typeof (value as { toDate?: () => unknown }).toDate === "function"
  ) {
    const maybeDate = (value as { toDate: () => unknown }).toDate();
    if (maybeDate instanceof Date && !Number.isNaN(maybeDate.getTime())) {
      return maybeDate;
    }
  }
  return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSetUser = useCallback(async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let userProfile: User | null = null;
        
        if (userDoc.exists()) {
          userProfile = { id: userDoc.id, uid: fbUser.uid, ...userDoc.data() } as User;
        } else {
            console.warn("No user profile found in Firestore for UID:", fbUser.uid, ". Creating one now.");
            const nameFromEmail = fbUser.email ? fbUser.email.split('@')[0] : 'New User';
            const newUserProfileData: Omit<User, 'id'> = {
              uid: fbUser.uid,
              email: fbUser.email || 'no-email@provided.com',
              name: nameFromEmail,
              role: 'buyer',
              avatar: '', // No default avatar
              username: nameFromEmail + Math.floor(Math.random() * 1000),
              verificationStatus: 'unverified',
              createdAt: Timestamp.now().toDate().toISOString(),
            };
            
            try {
              await setDoc(userDocRef, newUserProfileData);
              userProfile = { id: fbUser.uid, ...newUserProfileData };
            } catch(e) {
                console.error("Failed to create new user profile in Firestore:", e);
                userProfile = null;
            }
        }
        
        if (userProfile?.subscriptionPlanId) {
            // Keep plan ID/details even when expired so renewal flows can target the correct paid plan.
            const planRef = doc(db, 'subscriptionPlans', userProfile.subscriptionPlanId);
            const planSnap = await getDoc(planRef);
            if (planSnap.exists()) {
                const planData = convertTimestamps(planSnap.data());
                userProfile.subscriptionPlan = { id: planSnap.id, ...planData } as SubscriptionPlan;
            }
        }
        
        setUser(convertTimestamps(userProfile));
    } else {
        setUser(null);
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      await fetchAndSetUser(fbUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchAndSetUser]);

  const updateUserContext = (newUser: User) => {
    setUser(newUser);
  };
  
  const revalidateUser = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
        await fetchAndSetUser(fbUser);
    }
  }, [fetchAndSetUser]);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, updateUserContext, revalidateUser }}>
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

    

