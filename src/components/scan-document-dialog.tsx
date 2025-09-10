
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Scan Document</DialogTitle>
          <DialogDescription>
            Position your document within the frame and capture the image.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
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

        <DialogFooter>
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
            <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>
              <Camera className="mr-2 h-4 w-4" />
              Capture Image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
