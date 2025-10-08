import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
