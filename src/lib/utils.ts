import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Product } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// Helper function to deep compare verification details
export const areDetailsEqual = (d1?: { [key: string]: string }, d2?: { [key: string]: string }): boolean => {
    const details1 = d1 || {};
    const details2 = d2 || {};
    const keys1 = Object.keys(details1);
    const keys2 = Object.keys(details2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (details1[key] !== details2[key]) return false;
    }
    return true;
};

// Helper function to compare arrays of specifications
export const areSpecificationsEqual = (
  specs1?: Product['specifications'],
  specs2?: Product['specifications']
): boolean => {
  const s1 = specs1 || [];
  const s2 = specs2 || [];

  if (s1.length !== s2.length) {
    return false;
  }

  // Create maps for efficient lookups, ignoring order.
  const map1 = new Map(s1.map(spec => [spec.name, spec.value]));

  for (const spec of s2) {
    if (map1.get(spec.name) !== spec.value) {
      return false;
    }
  }

  return true;
};
