
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, RefreshCw, Check, AlertTriangle, X as CloseIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScanDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: (file: File) => void;
  documentName?: string | null;
}

export function ScanDocumentDialog({
  open,
  onOpenChange,
  onScanComplete,
  documentName,
}: ScanDocumentDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const isMobile = useIsMobile();


  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const getCameraPermission = useCallback(async () => {
    if (stream) return; // Already have a stream

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description:
          'Please enable camera permissions in your browser settings to use this feature.',
      });
    }
  }, [stream, toast]);

  useEffect(() => {
    if (open) {
        getCameraPermission();
    } else {
        stopCamera();
        setCapturedImage(null);
        setHasCameraPermission(null);
    }
    // This cleanup runs when the component unmounts or `open` becomes false
    return () => {
        stopCamera();
    }
  }, [open, getCameraPermission, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    getCameraPermission();
  };

  const handleUseImage = () => {
    if (capturedImage && canvasRef.current) {
        canvasRef.current.toBlob((blob) => {
            if (blob) {
                const fileName = `${documentName || 'scanned-document'}-${Date.now()}.jpg`;
                const file = new File([blob], fileName, { type: 'image/jpeg' });
                onScanComplete(file);
                onOpenChange(false);
                toast({
                    title: "Document Scanned",
                    description: "The image has been added to your verification documents.",
                });
            }
        }, 'image/jpeg');
    }
  };

  const contentClass = isMobile 
    ? "h-screen w-screen max-w-full rounded-none border-none flex flex-col p-0"
    : "sm:max-w-xl";

  const headerClass = isMobile ? "p-4 border-b" : "";
  const bodyClass = isMobile ? "flex-grow overflow-hidden" : "";
  const footerClass = isMobile ? "p-4 border-t bg-background" : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClass}>
        <DialogHeader className={headerClass}>
          <DialogTitle>Scan Document</DialogTitle>
          {!isMobile && (
            <DialogDescription>
              Position your document within the frame and capture the image.
            </DialogDescription>
          )}
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
             <CloseIcon className="h-4 w-4" />
             <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        
        <div className={cn("relative w-full overflow-hidden bg-muted", isMobile ? 'h-full' : 'aspect-video rounded-md border')}>
            <canvas ref={canvasRef} className="hidden" />
            {hasCameraPermission === null && !capturedImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}
            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                            Please allow camera access to use this feature.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
            {capturedImage ? (
                <Image src={capturedImage} alt="Captured document" layout="fill" objectFit="contain" />
            ) : (
                <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
            )}
        </div>

        <DialogFooter className={footerClass}>
          {capturedImage ? (
            <div className="flex w-full justify-between">
              <Button variant="ghost" onClick={handleRetake}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button onClick={handleUseImage}>
                <Check className="mr-2 h-4 w-4" />
                Use this Image
              </Button>
            </div>
          ) : (
            <Button onClick={handleCapture} disabled={hasCameraPermission !== true} className={isMobile ? 'w-full py-6 text-lg' : ''}>
              <Camera className="mr-2 h-4 w-4" />
              Capture Image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    