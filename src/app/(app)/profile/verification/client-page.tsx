
"use client";

import React, { useState, useTransition, useMemo, useCallback } from 'react';
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
import { Loader2, UploadCloud, File as FileIcon, X, CheckCircle, AlertTriangle, ShieldCheck, ShieldX, Camera, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitVerificationDocuments } from '@/app/user-actions';
import { ScanDocumentDialog } from '@/components/scan-document-dialog';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from '@/components/ui/progress';

interface VerificationClientPageProps {
  user: User;
  verificationTemplates: VerificationTemplate[];
}

type FileUploadState = {
  [key: string]: { file: File, preview: string, progress: number, error?: string } | undefined
}

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number, isMobile: boolean }> = ({ currentStep, totalSteps, isMobile }) => (
    <div className="flex items-center gap-4 mb-6">
        <Progress value={(currentStep / totalSteps) * 100} className="w-full h-2" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">Step {currentStep} of {totalSteps}</span>
    </div>
);


const FileUploadArea: React.FC<{
    field: { name: string; label: string; helperText?: string; };
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onScanClick: () => void;
    disabled: boolean;
}> = ({ field, onFileChange, onScanClick, disabled }) => (
    <div className="flex flex-col md:flex-row gap-2">
        <label htmlFor={field.name} className="flex-1 flex justify-center w-full rounded-md border-2 border-dashed border-gray-300 px-6 py-10 text-center cursor-pointer hover:border-primary transition-colors">
            <div className="text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-muted-foreground">
                    Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 5MB</p>
            </div>
            <input id={field.name} name={field.name} type="file" className="sr-only" onChange={onFileChange} accept=".pdf,.png,.jpg,.jpeg" disabled={disabled} />
        </label>
        <Button type="button" variant="outline" className="md:h-auto" onClick={onScanClick} disabled={disabled}>
            <Camera className="mr-2 h-4 w-4" /> Scan Document
        </Button>
    </div>
);

const UploadedFileDisplay: React.FC<{
    docName: string;
    fileState?: { file: File };
    onRemove: () => void;
}> = ({ docName, fileState, onRemove }) => (
     <div className="p-3 rounded-md border bg-muted/50 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
            <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm font-medium truncate">{fileState?.file.name}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <X className="h-4 w-4"/>
        </Button>
    </div>
);


const ExistingFileDisplay: React.FC<{
    field: { name: string; label: string };
    existingDoc: { fileName: string };
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onScanClick: () => void;
    disabled: boolean;
}> = ({ field, existingDoc, onFileChange, onScanClick, disabled }) => (
    <div className="p-3 rounded-md border bg-muted/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-grow overflow-hidden">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{existingDoc.fileName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
             <Button asChild variant="outline" size="sm">
                <label htmlFor={field.name} className="cursor-pointer">
                    <UploadCloud className="mr-2 h-4 w-4"/>
                    Replace
                    <input type="file" id={field.name} className="hidden" onChange={onFileChange} disabled={disabled}/>
                </label>
            </Button>
            <Button variant="outline" size="sm" onClick={onScanClick} disabled={disabled}>
                <Camera className="mr-2 h-4 w-4" />
                Re-scan
            </Button>
        </div>
    </div>
);


export function VerificationClientPage({ user: initialUser, verificationTemplates }: VerificationClientPageProps) {
  const [user, setUser] = useState(initialUser);
  const [fileUploads, setFileUploads] = useState<FileUploadState>({});
  const [isSubmitting, startSubmitTransition] = useTransition();
  const { toast } = useToast();
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [activeScanField, setActiveScanField] = useState<string | null>(null);
  const { firebaseUser } = useAuth();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

  const activeTemplate = useMemo(() => {
    if (!user.address?.country) return null;
    return verificationTemplates.find(t => t.id === user.address.country) || null;
  }, [user.address?.country, verificationTemplates]);

  const businessDocFields = useMemo(() => {
    if (!activeTemplate) return [];
    return activeTemplate.fields.filter(field => {
      if (field.required === 'always') return true;
      if (field.required === 'international') {
        return user.exportScope?.includes('international');
      }
      return false;
    });
  }, [activeTemplate, user.exportScope]);

  const allRequiredFields = useMemo(() => {
    const fields = [...businessDocFields];
    fields.push({ name: 'addressProof', label: 'Address Proof', type: 'file', required: 'always' });
    fields.push({ name: 'idProof', label: 'ID Proof', type: 'file', required: 'always' });
    return fields;
  }, [businessDocFields]);


  const handleFileSelect = useCallback((file: File, fieldName: string) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Please upload files smaller than 5MB.'});
        return;
    }
    setFileUploads(prev => ({
        ...prev,
        [fieldName]: { file, preview: URL.createObjectURL(file), progress: 0 }
    }));
  }, [toast]);
  
  const handleRemoveFile = useCallback((fieldName: string) => {
      setFileUploads(prev => {
          const newState = {...prev};
          const upload = newState[fieldName];
          if (upload) {
              URL.revokeObjectURL(upload.preview);
          }
          delete newState[fieldName];
          return newState;
      })
  }, []);
  
  const canSubmit = useMemo(() => {
      if (isSubmitting || user.verificationStatus === 'pending') return false;
      return allRequiredFields.every(field => {
        return fileUploads[field.name] || user.verificationDocuments?.[field.name];
      });
  }, [isSubmitting, user, allRequiredFields, fileUploads]);


  const handleSubmit = () => {
    if (!canSubmit || !firebaseUser) return;

    startSubmitTransition(async () => {
        try {
            const formData = new FormData();
            Object.entries(fileUploads).forEach(([fieldName, state]) => {
                if (state?.file) {
                   formData.append(fieldName, state.file);
                }
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
                    {user.verificationRejectionReason && (
                        <p className="mt-2 font-semibold">
                            Admin Feedback: <span className="font-normal italic">"{user.verificationRejectionReason}"</span>
                        </p>
                    )}
                </AlertDescription>
            </Alert>
        default:
             return <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Complete Your Verification</AlertTitle>
                <AlertDescription>
                    Follow the steps to upload the required documents, build trust with buyers, and unlock full marketplace features.
                </AlertDescription>
            </Alert>
    }
  }

  const step1Content = businessDocFields.map(field => (
    <div key={field.name} className="space-y-2">
        <label className="text-sm font-medium">
            {field.label} <span className="text-destructive">*</span>
        </label>
        {field.helperText && <p className="text-sm text-muted-foreground">{field.helperText}</p>}
        {fileUploads[field.name] ? (
            <UploadedFileDisplay 
                docName={field.label}
                fileState={fileUploads[field.name]}
                onRemove={() => handleRemoveFile(field.name)}
            />
        ) : user.verificationDocuments?.[field.name] ? (
            <ExistingFileDisplay
                field={field}
                existingDoc={user.verificationDocuments[field.name]!}
                onFileChange={(e) => handleFileSelect(e.target.files![0], field.name)}
                onScanClick={() => handleOpenScanDialog(field.name)}
                disabled={isSubmitting || user.verificationStatus === 'pending'}
            />
        ) : (
             <FileUploadArea
                field={field}
                onFileChange={(e) => handleFileSelect(e.target.files![0], field.name)}
                onScanClick={() => handleOpenScanDialog(field.name)}
                disabled={isSubmitting || user.verificationStatus === 'pending'}
             />
        )}
    </div>
  ));

  const addressProofField = { name: 'addressProof', label: 'Address Proof', helperText: 'Upload a utility bill or bank statement showing your business address.'};
  const step2Content = (
      <div className="space-y-2">
            <label className="text-sm font-medium">
                {addressProofField.label} <span className="text-destructive">*</span>
            </label>
            <p className="text-sm text-muted-foreground">{addressProofField.helperText}</p>
            {fileUploads.addressProof ? (
                <UploadedFileDisplay 
                    docName={addressProofField.label}
                    fileState={fileUploads.addressProof}
                    onRemove={() => handleRemoveFile('addressProof')}
                />
            ) : user.verificationDocuments?.addressProof ? (
                <ExistingFileDisplay
                    field={addressProofField}
                    existingDoc={user.verificationDocuments.addressProof}
                    onFileChange={(e) => handleFileSelect(e.target.files![0], 'addressProof')}
                    onScanClick={() => handleOpenScanDialog('addressProof')}
                    disabled={isSubmitting || user.verificationStatus === 'pending'}
                />
            ) : (
                <FileUploadArea
                    field={addressProofField}
                    onFileChange={(e) => handleFileSelect(e.target.files![0], 'addressProof')}
                    onScanClick={() => handleOpenScanDialog('addressProof')}
                    disabled={isSubmitting || user.verificationStatus === 'pending'}
                />
            )}
      </div>
  );
  
  const idProofField = { name: 'idProof', label: 'ID Proof', helperText: 'Upload a clear photo of your government-issued ID (e.g., Passport, Driver\'s License). You can use your camera to take a selfie with the ID.'};
  const step3Content = (
       <div className="space-y-2">
            <label className="text-sm font-medium">
                {idProofField.label} <span className="text-destructive">*</span>
            </label>
            <p className="text-sm text-muted-foreground">{idProofField.helperText}</p>
            {fileUploads.idProof ? (
                <UploadedFileDisplay 
                    docName={idProofField.label}
                    fileState={fileUploads.idProof}
                    onRemove={() => handleRemoveFile('idProof')}
                />
            ) : user.verificationDocuments?.idProof ? (
                <ExistingFileDisplay
                    field={idProofField}
                    existingDoc={user.verificationDocuments.idProof}
                    onFileChange={(e) => handleFileSelect(e.target.files![0], 'idProof')}
                    onScanClick={() => handleOpenScanDialog('idProof')}
                    disabled={isSubmitting || user.verificationStatus === 'pending'}
                />
            ) : (
                 <FileUploadArea
                    field={idProofField}
                    onFileChange={(e) => handleFileSelect(e.target.files![0], 'idProof')}
                    onScanClick={() => handleOpenScanDialog('idProof')}
                    disabled={isSubmitting || user.verificationStatus === 'pending'}
                />
            )}
      </div>
  );


  return (
    <>
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification Center</h1>
        <p className="text-muted-foreground">
          Submit your documents to get verified.
        </p>
      </div>

      <StatusAlert />
      
      <Card>
        <CardHeader>
           <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} isMobile={isMobile} />
           {step === 1 && <CardTitle>Step 1: Business Documents</CardTitle>}
           {step === 2 && <CardTitle>Step 2: Address Proof</CardTitle>}
           {step === 3 && <CardTitle>Step 3: ID Proof</CardTitle>}
          {!user.address?.country ? (
            <CardDescription className="text-red-600">
              Please complete your business address in your profile to see verification requirements.
            </CardDescription>
          ) : !activeTemplate ? (
            <CardDescription>
              No specific business verification documents are required for your selected country ({user.address.country}).
            </CardDescription>
          ) : (
            <CardDescription>
              Based on your country ({activeTemplate.countryName}), please upload the required documents.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
            {step === 1 && (businessDocFields.length > 0 ? step1Content : <p className="text-sm text-muted-foreground">No specific business documents are required for your country. Proceed to the next step.</p>)}
            {step === 2 && step2Content}
            {step === 3 && step3Content}
        </CardContent>
         <CardContent>
            <div className="pt-4 flex justify-between">
                <Button onClick={() => setStep(s => s-1)} disabled={step === 1 || isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4"/> Previous
                </Button>
                
                {step < TOTAL_STEPS && (
                    <Button onClick={() => setStep(s => s+1)} disabled={isSubmitting}>
                        Next <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                )}

                {step === TOTAL_STEPS && (
                    <Button onClick={handleSubmit} disabled={!canSubmit}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {user.verificationStatus === 'verified' ? 'Re-submit for Verification' : 'Submit for Verification'}
                    </Button>
                )}
            </div>
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
