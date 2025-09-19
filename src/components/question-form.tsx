
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addQuestionToProduct } from '@/lib/firebase';
import { Question } from '@/lib/types';
import Link from 'next/link';

const questionSchema = z.object({
  text: z.string().min(10, 'Question must be at least 10 characters.').max(500, 'Question cannot exceed 500 characters.'),
});

type QuestionFormData = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  productId: string;
  onQuestionSubmitted: (question: Question) => void;
}

export function QuestionForm({ productId, onQuestionSubmitted }: QuestionFormProps) {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: { text: '' },
  });

  const onSubmit = async (data: QuestionFormData) => {
    if (!user || !firebaseUser) {
        toast({ variant: 'destructive', title: 'You must be logged in to ask a question.' });
        return;
    }
    
    if (user.role !== 'buyer') {
        toast({ variant: 'destructive', title: 'Only buyers can ask questions.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const newQuestion = await addQuestionToProduct(productId, user.uid, user.name, data.text);
        onQuestionSubmitted(newQuestion);
        form.reset();
        toast({ title: 'Question Submitted', description: 'Your question has been posted.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: error.message || 'An error occurred.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
        <div className="text-sm text-center text-muted-foreground p-4 border-dashed border-2 rounded-md">
            <Link href="/login" className="text-primary font-semibold hover:underline">Log in as a buyer</Link> to ask a question.
        </div>
    );
  }
  
  if (user.role !== 'buyer') {
      return null; // Don't show form to sellers or admins
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea placeholder="Ask the seller a question about this product..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ask Question
            </Button>
        </div>
      </form>
    </Form>
  );
}
