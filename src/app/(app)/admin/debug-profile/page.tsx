
'use client';

import React, { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bug } from 'lucide-react';
import { testUserUpdate } from '@/app/admin-debug-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DebugProfilePage() {
  const [userId, setUserId] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleTest = () => {
    if (!userId.trim()) {
      toast({
        variant: 'destructive',
        title: 'User ID Required',
        description: 'Please enter a user ID to test.',
      });
      return;
    }

    startTransition(async () => {
      const result = await testUserUpdate(userId);
      if (result.success) {
        toast({
          title: 'Test Succeeded!',
          description: `User ${userId} was successfully updated. The profile update issue seems to be with the profile form itself.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Test Failed',
          description: result.error || 'An unknown error occurred.',
          duration: 10000,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Debug Profile Update</h1>
        <p className="text-muted-foreground">
          A simple test page to diagnose the profile update issue.
        </p>
      </div>

      <Alert variant="destructive">
        <Bug className="h-4 w-4" />
        <AlertTitle>Instructions</AlertTitle>
        <AlertDescription>
          1. Go to an admin page like Verifications or Conversations to find and
          copy the ID of a test user.
          <br />
          2. Paste the User ID into the input field below.
          <br />
          3. Click the &quot;Run Test Update&quot; button.
          <br />
          4. Report the exact message from the toast notification (success or
          failure) back to the AI assistant.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Run Update Test</CardTitle>
          <CardDescription>
            This will attempt to update only the name of the specified user to
            &quot;Test Successful&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-id">User ID to Test</Label>
            <Input
              id="user-id"
              placeholder="Paste User ID here"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isPending}
            />
          </div>
          <Button onClick={handleTest} disabled={isPending || !userId}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Test Update
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
