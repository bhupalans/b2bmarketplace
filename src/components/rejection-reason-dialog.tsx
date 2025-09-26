
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface RejectionReasonDialogProps {
  open: boolean;
  onOpenChange: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting: boolean;
}

export function RejectionReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: RejectionReasonDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Rejection</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this item. This will be shown to the user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rejection-reason" className="text-right">
              Reason
            </Label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
              placeholder="e.g., The uploaded document is blurry or illegible."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onOpenChange} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
