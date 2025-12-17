
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { countries } from '@/lib/geography-data';
import { useAuth } from '@/contexts/auth-context';
import { submitCallbackRequest } from '@/app/contact-actions';

const callbackRequestSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  companyName: z.string().min(1, 'Company name is required.'),
  role: z.enum(['buyer', 'seller']),
  country: z.string().min(1, 'Please select a country.'),
  phoneNumber: z.string().min(5, 'Please enter a valid phone number.'),
  preferredTime: z.string().min(5, 'Please let us know when is a good time to call.'),
});

type CallbackRequestFormData = z.infer<typeof callbackRequestSchema>;

export function CallbackRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CallbackRequestFormData>({
    resolver: zodResolver(callbackRequestSchema),
    defaultValues: {
      name: user?.name || '',
      companyName: user?.companyName || '',
      role: user?.role || 'buyer',
      country: user?.address?.country || '',
      phoneNumber: user?.phoneNumber || '',
      preferredTime: '',
    },
  });
  
  const onSubmit = async (values: CallbackRequestFormData) => {
    setIsSubmitting(true);
    try {
        const result = await submitCallbackRequest(values);
        if (result.success) {
            toast({
                title: 'Request Sent',
                description: 'Our team will get in touch with you shortly.',
            });
            setOpen(false);
            form.reset();
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Phone className="mr-2 h-4 w-4" />
            Request a Callback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a Callback</DialogTitle>
          <DialogDescription>
            Fill out the form below and we'll call you back as soon as possible.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>You are a...</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl>
                            <SelectContent>
                                {countries.map(c => <SelectItem key={c.value} value={c.label}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="preferredTime"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Preferred Time for Callback</FormLabel>
                        <FormControl><Textarea placeholder="e.g., Weekdays after 2 PM EST" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
