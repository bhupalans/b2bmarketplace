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
import { addAnswerToQuestion } from '@/lib/firebase';
import { Question } from '@/lib/types';

const answerSchema = z.object({
  text: z.string().min(5, 'Answer must be at least 5 characters.').max(1000, 'Answer cannot exceed 1000 characters.'),
});

type AnswerFormData = z.infer<typeof answerSchema>;

interface AnswerFormProps {
  productId: string;
  question: Question;
  onAnswerSubmitted: (answeredQuestion: Question) => void;
}

export function AnswerForm({ productId, question, onAnswerSubmitted }: AnswerFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AnswerFormData>({
    resolver: zodResolver(answerSchema),
    defaultValues: { text: '' },
  });

  const onSubmit = async (data: AnswerFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
        const updatedQuestion = await addAnswerToQuestion({
            productId: productId,
            questionId: question.id,
            sellerId: user.uid,
            sellerName: user.name,
            answerText: data.text,
        });
        onAnswerSubmitted(updatedQuestion);
        form.reset();
        toast({ title: 'Answer Submitted', description: 'Your answer has been posted.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: error.message || 'An error occurred.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pl-11">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea placeholder="Type your answer here..." {...field} className="bg-muted" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="sm">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Answer
            </Button>
        </div>
      </form>
    </Form>
  );
}
