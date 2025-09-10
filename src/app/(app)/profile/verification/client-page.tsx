
"use client";

import React, { useState, useTransition, useMemo } from 'react';
import { User, VerificationTemplate } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, File as FileIcon, X, CheckCircle, AlertTriangle, ShieldCheck, ShieldX, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitVerificationDocuments } from '@/app/user-actions';
import { ScanDocumentDialog } from '@/components/scan-document-dialog';
import { useAuth } from '@/contexts/auth-context';

interface VerificationClientPageProps {
  user: User;
  verificationTemplates: VerificationTemplate[];
}

type FileUploadState = {
    [key: string]: { file: File, preview: string, progress: number, error?: string }
}

export function VerificationClientPage({ user: initialUser, verificationTemplates }: VerificationClientPageProps) {
  const [user, setUser] = useState(initialUser);
  const [fileUploads, setFileUploads] = useState<FileUploadState>({});
  const [isSubmitting, startSubmitTransition] = useTransition();
  const { toast } = useToast();
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [activeScanField, setActiveScanField] = useState<string | null>(null);
  const { firebaseUser } = useAuth();

  const activeTemplate = useMemo(() => {
    if (!user.address?.country) return null;
    return verificationTemplates.find(t => t.id === user.address.country) || null;
  }, [user.address?.country, verificationTemplates]);

  const requiredFields = useMemo(() => {
    if (!activeTemplate) return [];
    return activeTemplate.fields.filter(field => {
      if (field.required === 'always') return true;
      if (field.required === 'international') {
        return user.exportScope?.includes('international');
      }
      return false;
    });
  }, [activeTemplate, user.exportScope]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, fieldName);
    }
  };

  const handleFileSelect = (file: File, fieldName: string) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Please upload files smaller than 5MB.'});
        return;
    }
    setFileUploads(prev => ({
        ...prev,
        [fieldName]: { file, preview: URL.createObjectURL(file), progress: 0 }
    }));
  };
  
  const handleRemoveFile = (fieldName: string) => {
      setFileUploads(prev => {
          const newState = {...prev};
          if (newState[fieldName]) {
              URL.revokeObjectURL(newState[fieldName].preview);
          }
          delete newState[fieldName];
          return newState;
      })
  }
  
  const canSubmit = useMemo(() => {
      if (isSubmitting || user.verificationStatus === 'pending' || !activeTemplate) return false;

      // Check if all required fields have an uploaded file OR an existing document
      return requiredFields.every(field => {
        return fileUploads[field.name] || user.verificationDocuments?.[field.name];
      });

  }, [isSubmitting, user, activeTemplate, requiredFields, fileUploads]);


  const handleSubmit = () => {
    if (!canSubmit || !firebaseUser) return;

    startSubmitTransition(async () => {
        try {
            const formData = new FormData();
            Object.entries(fileUploads).forEach(([fieldName, state]) => {
                formData.append(fieldName, state.file);
            });
            
            const token = await firebaseUser.getIdToken();
            const result = await submitVerificationDocuments(formData, token);

            if (result.success && result.updatedUser) {
                setUser(result.updatedUser);
                setFileUploads({}); // Clear uploads on success
                toast({ title: 'Verification Submitted', description: 'Your documents are now pending review.' });
            } else {
                toast({ variant: 'destructive', title: 'Submission Failed', description: result.error || 'An unknown error occurred.' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Error', description: error.message || 'An unexpected error occurred.' });
        }
    });
  };

  const handleOpenScanDialog = (fieldName: string) => {
    setActiveScanField(fieldName);
    setScanDialogOpen(true);
  }

  const handleScanComplete = (file: File) => {
    if (activeScanField) {
        handleFileSelect(file, activeScanField);
    }
    setActiveScanField(null);
  }

  const StatusAlert = () => {
    switch (user.verificationStatus) {
        case 'verified':
            return <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-950">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-300">You are Verified!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                    Your business information has been successfully verified. Buyers will now see a "Verified" badge on your profile.
                </AlertDescription>
            </Alert>
        case 'pending':
            return <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-300">Verification Pending</AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    Your documents have been submitted and are awaiting review by our team. This usually takes 2-3 business days.
                </AlertDescription>
            </Alert>
        case 'rejected':
             return <Alert variant="destructive">
                <ShieldX className="h-4 w-4" />
                <AlertTitle>Verification Required</AlertTitle>
                <AlertDescription>
                    There was an issue with your previous submission. Please review the requirements and re-submit your documents.
                </AlertDescription>
            </Alert>
        default:
             return <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Complete Your Verification</AlertTitle>
                <AlertDescription>
                    Upload the required documents to gain a "Verified" badge, build trust with buyers, and unlock full marketplace features.
                </AlertDescription>
            </Alert>
    }
  }


  return (
    <>
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification Center</h1>
        <p className="text-muted-foreground">
          Submit your business documents to get verified.
        </p>
      </div>

      <StatusAlert />
      
      <Card>
        <CardHeader>
          <CardTitle>Document Requirements</CardTitle>
          {!user.address?.country ? (
            <CardDescription className="text-red-600">
              Please complete your business address in your profile to see verification requirements.
            </CardDescription>
          ) : !activeTemplate ? (
            <CardDescription>
              No specific verification documents are required for your selected country ({user.address.country}).
            </CardDescription>
          ) : (
            <CardDescription>
              Based on your country ({activeTemplate.countryName}), please upload the following documents.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
            {activeTemplate && activeTemplate.fields.map(field => {
                const existingDoc = user.verificationDocuments?.[field.name];
                const newUpload = fileUploads[field.name];
                const isRequired = requiredFields.some(f => f.name === field.name);

                return (
                    <div key={field.name} className="space-y-2">
                        <label className="text-sm font-medium">
                            {field.label} {isRequired && <span className="text-destructive">*</span>}
                        </label>
                        {field.helperText && <p className="text-sm text-muted-foreground">{field.helperText}</p>}
                        
                        {existingDoc && !newUpload ? (
                            <div className="p-3 rounded-md border bg-muted/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium">{existingDoc.fileName}</span>
                                </div>
                                <label htmlFor={field.name} className="text-sm text-primary hover:underline cursor-pointer">
                                    Replace
                                    <input type="file" id={field.name} className="hidden" onChange={(e) => handleFileChange(e, field.name)} disabled={isSubmitting || user.verificationStatus === 'pending'}/>
                                </label>
                            </div>
                        ) : newUpload ? (
                             <div className="p-3 rounded-md border bg-muted/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileIcon className="h-5 w-5 text-primary" />
                                    <span className="text-sm font-medium">{newUpload.file.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile(field.name)}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        ) : (
                             <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                <label htmlFor={field.name} className="flex-1 flex justify-center w-full rounded-md border-2 border-dashed border-gray-300 px-6 py-10 text-center cursor-pointer hover:border-primary">
                                    <div className="text-center">
                                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 5MB</p>
                                    </div>
                                    <input id={field.name} name={field.name} type="file" className="sr-only" onChange={(e) => handleFileChange(e, field.name)} accept=".pdf,.png,.jpg,.jpeg" disabled={isSubmitting || user.verificationStatus === 'pending'} />
                                </label>
                                <Button type="button" variant="outline" className="sm:h-auto" onClick={() => handleOpenScanDialog(field.name)} disabled={isSubmitting || user.verificationStatus === 'pending'}>
                                    <Camera className="mr-2 h-4 w-4" /> Scan Document
                                </Button>
                             </div>
                        )}
                    </div>
                )
            })}
            
            {activeTemplate && (
                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSubmit} disabled={!canSubmit}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {user.verificationStatus === 'verified' ? 'Re-submit for Verification' : 'Submit for Verification'}
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
    <ScanDocumentDialog 
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onScanComplete={handleScanComplete}
        documentName={activeScanField}
    />
    </>
  );
}
