import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  RotateCcw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { isReducedMotion } from '../animation/cinematicMotion';

export interface PhotoUploaderProps {
  onPhotoSelect: (file: File | Blob | null, dataUrl?: string | null) => void;
  initialPreview?: string | null;
  maxSizeMB?: number;
  allowedTypes?: string[];
  compact?: boolean;
  label?: string;
  subtitle?: string;
  privacyText?: string;
  showPrivacyNote?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onPhotoSelect,
  initialPreview = null,
  maxSizeMB = 10,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  compact = false,
  label = "SECTION 1 — Add a Photo (Optional)",
  subtitle = "Take or upload a photo to provide visual context for field responders.",
  privacyText = "Privacy Protected: Photos are shared ONLY with verified, authorized responders involved in providing assistance.",
  showPrivacyNote = true,
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPreview);
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Drag & Drop State
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Validation Error State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (initialPreview !== undefined) {
      setPhotoPreview(initialPreview);
    }
  }, [initialPreview]);

  // Clean camera MediaStream tracks
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  // Sync video element srcObject when camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [isCameraActive]);

  // Format File Size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Validate File
  const validateAndProcessFile = (file: File | Blob, nameOverride?: string) => {
    setErrorMsg(null);
    setCameraError(null);

    // Type validation
    if (file.type && allowedTypes.length > 0 && !allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMsg("Please upload a JPG, PNG, or WEBP image.");
      return false;
    }

    // Size validation
    if (file.size && file.size > maxSizeMB * 1024 * 1024) {
      setErrorMsg(`The selected image is too large (max ${maxSizeMB}MB).`);
      return false;
    }

    stopCameraTracks();

    const name = nameOverride || (file instanceof File ? file.name : `photo_${Date.now()}.jpg`);
    setFileName(name);
    if (file.size) setFileSizeStr(formatBytes(file.size));

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      onPhotoSelect(file, dataUrl);
    };
    reader.onerror = () => {
      setErrorMsg("The image could not be processed. Please try another photo.");
    };
    reader.readAsDataURL(file);
    return true;
  };

  // Handle Drag & Drop Events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  // Handle File Input Change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
    }
  };

  // Handle "Take Photo" action
  const handleTakeButtonClick = () => {
    setErrorMsg(null);
    setCameraError(null);

    // On mobile devices or browsers with capture attribute support, try native input first
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && cameraInputRef.current) {
      cameraInputRef.current.click();
      return;
    }

    // On Desktop or if getUserMedia is supported, start live camera feed
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      startLiveCamera(facingMode);
    } else if (cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      setErrorMsg("Camera access is not supported on this browser. Please use Upload Photo.");
    }
  };

  // Start Live Camera getUserMedia
  const startLiveCamera = async (mode: 'environment' | 'user') => {
    try {
      stopCameraTracks();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera getUserMedia error:", err);
      setIsCameraActive(false);
      setCameraError("Camera access was denied or unavailable. You can still upload a photo from your device.");
      // Fallback: trigger file upload dialog
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Flip facing mode
  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  // Capture frame from canvas
  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          validateAndProcessFile(blob, `captured_photo_${Date.now()}.jpg`);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Remove Photo / Reset State
  const handleRemovePhoto = () => {
    stopCameraTracks();
    setPhotoPreview(null);
    setSelectedFile(null);
    setFileName(null);
    setFileSizeStr(null);
    setErrorMsg(null);
    setCameraError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    onPhotoSelect(null, null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Info */}
      {!compact && (
        <div>
          <h2 className="text-xl font-black text-[#17231E] dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#F25C38]" />
            <span>{label}</span>
          </h2>
          <p className="text-xs text-[#17231E]/70 dark:text-[#F5F5F0]/70 font-medium mt-1">
            {subtitle}
          </p>
        </div>
      )}

      {/* Camera Stream View */}
      {isCameraActive && (
        <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border border-stone-800 shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center space-x-3 z-20">
            <button
              type="button"
              onClick={handleFlipCamera}
              className="p-3 rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 transition-all cursor-pointer"
              title="Flip Camera"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleCaptureFrame}
              className="px-6 py-3 rounded-full bg-[#F25C38] hover:bg-[#E04925] text-white font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg cursor-pointer transition-all transform hover:scale-105"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo</span>
            </button>
            <button
              type="button"
              onClick={stopCameraTracks}
              className="p-3 rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 transition-all cursor-pointer"
              title="Close Camera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Box / Photo Preview Container */}
      {!isCameraActive && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative rounded-3xl border-2 border-dashed p-6 transition-all text-center flex flex-col items-center justify-center min-h-[200px] outline-none ${
            isDragOver
              ? 'border-[#F25C38] bg-[#F25C38]/10 scale-[1.01]'
              : photoPreview
              ? 'border-[#E7E0D6] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#161616]'
              : 'border-[#E7E0D6] dark:border-white/10 bg-[#FAF7F2]/60 dark:bg-[#161616]/60 hover:border-[#F25C38]'
          }`}
        >
          {photoPreview ? (
            /* PHOTO PREVIEW DISPLAY */
            <div className="w-full space-y-4 animate-in fade-in duration-300">
              <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border border-[#E7E0D6] dark:border-white/10 shadow-md group">
                <img
                  src={photoPreview}
                  alt="Captured photo preview"
                  className="w-full h-48 sm:h-56 object-cover rounded-2xl"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleTakeButtonClick}
                    className="p-2.5 rounded-full bg-white text-stone-900 font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center space-x-1"
                    title="Retake Photo"
                  >
                    <Camera className="w-4 h-4 text-[#F25C38]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-full bg-white text-stone-900 font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center space-x-1"
                    title="Change Photo"
                  >
                    <Upload className="w-4 h-4 text-[#F25C38]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-2.5 rounded-full bg-rose-600 text-white font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center space-x-1"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* File details bar */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-stone-600 dark:text-stone-300">
                <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Photo Ready</span>
                </span>
                {fileName && <span className="font-semibold max-w-[180px] truncate">({fileName})</span>}
                {fileSizeStr && <span className="text-stone-400 font-mono">[{fileSizeStr}]</span>}
              </div>
            </div>
          ) : (
            /* EMPTY UPLOAD / DRAG STATE */
            <div className="space-y-3 py-2">
              <div className="w-14 h-14 rounded-2xl bg-[#F25C38]/10 text-[#F25C38] flex items-center justify-center mx-auto border border-[#F25C38]/20 shadow-xs">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F5F5F0]">
                  Drag & drop image here or click to browse
                </h3>
                <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5">
                  Supports JPG, PNG, WEBP up to {maxSizeMB}MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error & Warning Messages */}
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 bg-rose-600 text-white rounded-xl text-[11px] font-bold hover:bg-rose-700"
          >
            Upload Photo
          </button>
        </div>
      )}

      {cameraError && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{cameraError}</span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 bg-amber-600 text-white rounded-xl text-[11px] font-bold hover:bg-amber-700"
          >
            Upload Photo
          </button>
        </div>
      )}

      {/* Control Buttons Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={handleTakeButtonClick}
          className="py-3 px-4 rounded-2xl bg-[#1C1917] dark:bg-[#262626] hover:bg-stone-800 text-white text-xs font-bold flex items-center justify-center space-x-2 border border-stone-800 dark:border-white/10 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Camera className="w-4 h-4 text-[#F25C38]" />
          <span>{photoPreview ? 'Retake Photo' : 'Take Photo'}</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#161616] hover:bg-[#F3ECE2] dark:hover:bg-[#222222] text-[#1C1917] dark:text-[#F5F5F0] text-xs font-bold flex items-center justify-center space-x-2 border border-[#E7E0D6] dark:border-white/10 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Upload className="w-4 h-4 text-[#F25C38]" />
          <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
        </button>

        <button
          type="button"
          onClick={handleRemovePhoto}
          className="py-3 px-4 rounded-2xl bg-stone-100 dark:bg-[#1E1E1E] text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-[#262626] text-xs font-bold flex items-center justify-center space-x-2 border border-stone-200 dark:border-white/10 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <X className="w-4 h-4" />
          <span>{photoPreview ? 'Remove Photo' : 'Skip / Remove Photo'}</span>
        </button>
      </div>

      {/* Privacy Guarantee Note */}
      {showPrivacyNote && (
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 flex items-start space-x-3 text-xs">
          <ShieldCheck className="w-4 h-4 text-[#F25C38] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#78716C] dark:text-[#A8A29E] font-medium leading-relaxed">
            {privacyText}
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
