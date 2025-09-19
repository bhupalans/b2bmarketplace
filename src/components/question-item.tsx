
"use client";

import React from 'react';
import { Question } from '@/lib/types';
import { Avatar, AvatarFallback } from './ui/avatar';
import { formatDistanceToNow } from 'date-fns';

export function QuestionItem({ question }: { question: Question }) {
  const askedAt = typeof question.createdAt === 'string' ? new Date(question.createdAt) : question.createdAt.toDate();
  const answeredAt = question.answer?.answeredAt ? (typeof question.answer.answeredAt === 'string' ? new Date(question.answer.answeredAt) : question.answer.answeredAt.toDate()) : null;

  return (
    <div className="flex flex-col space-y-4 border-b pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8 border">
          <AvatarFallback className="text-xs bg-muted">Q</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm">{question.text}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Asked by {question.buyerName} - {formatDistanceToNow(askedAt, { addSuffix: true })}
          </p>
        </div>
      </div>
      
      {question.answer ? (
        <div className="flex items-start space-x-3 pl-8">
            <Avatar className="h-8 w-8 border">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">A</AvatarFallback>
            </Avatar>
            <div className="flex-1">
            <p className="text-sm font-semibold">{question.answer.text}</p>
            <p className="text-xs text-muted-foreground mt-1">
                Answered by {question.answer.sellerName} - {answeredAt ? formatDistanceToNow(answeredAt, { addSuffix: true }) : ''}
            </p>
            </div>
        </div>
      ) : (
        <div className="pl-11 text-sm text-muted-foreground italic">
            Awaiting answer from seller...
        </div>
      )}
    </div>
  );
}
