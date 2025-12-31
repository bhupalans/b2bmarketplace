
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { X, Check } from 'lucide-react';

type StrengthLevel = 'Weak' | 'Medium' | 'Strong' | 'Very Strong';

type Strength = {
  level: StrengthLevel | null;
  score: number; // 0 to 4
};

const PasswordRequirement: React.FC<{ fulfilled: boolean; text: string }> = ({ fulfilled, text }) => (
  <div className="flex items-center text-xs">
    {fulfilled ? (
      <Check className="mr-2 h-4 w-4 text-green-500" />
    ) : (
      <X className="mr-2 h-4 w-4 text-muted-foreground" />
    )}
    <span className={cn(fulfilled ? 'text-foreground' : 'text-muted-foreground')}>
      {text}
    </span>
  </div>
);


export const PasswordStrengthIndicator = ({ password = '' }: { password?: string }) => {
  const evaluateStrength = (pass: string): Strength => {
    let score = 0;
    const hasLength = pass.length >= 8;
    const hasLowercase = /[a-z]/.test(pass);
    const hasUppercase = /[A-Z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);

    if (hasLength) score++;
    if (hasLowercase) score++;
    if (hasUppercase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;
    if (pass.length >= 12 && score >= 3) score++; // Bonus for long and complex

    // Adjust score to be within 0-4 range for bar indicator
    const barScore = Math.min(Math.max(score - 1, 0), 4);

    let level: StrengthLevel | null = null;
    if (pass.length > 0) {
      if (score <= 2) level = 'Weak';
      else if (score <= 4) level = 'Medium';
      else if (score === 5) level = 'Strong';
      else level = 'Very Strong';
    }

    return { level, score: barScore };
  };

  const { level, score } = React.useMemo(() => evaluateStrength(password), [password]);

  const strengthBarColor = () => {
    if (!level) return 'bg-muted';
    switch (level) {
      case 'Weak': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Strong': return 'bg-green-500';
      case 'Very Strong': return 'bg-green-600';
      default: return 'bg-muted';
    }
  };

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 rounded-full bg-muted">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-full flex-1 rounded-full',
                index > 0 && 'ml-1',
                index < score ? strengthBarColor() : 'bg-muted'
              )}
            />
          ))}
        </div>
        {level && (
          <span className="text-sm font-medium">{level}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <PasswordRequirement fulfilled={password.length >= 8} text="At least 8 characters" />
        <PasswordRequirement fulfilled={/[a-z]/.test(password)} text="A lowercase letter" />
        <PasswordRequirement fulfilled={/[A-Z]/.test(password)} text="An uppercase letter" />
        <PasswordRequirement fulfilled={/\d/.test(password)} text="A number" />
      </div>
    </div>
  );
};
