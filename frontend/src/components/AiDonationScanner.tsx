import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  X, 
  Shirt, 
  Utensils, 
  ShowerHead,
  RotateCcw,
  Zap,
  Check
} from 'lucide-react';
import { aiApi } from '../services/api';
import { DonationVisionScanResponse } from '../types';
import { useLanguage } from '../i18n';
import { PhotoUploader } from './PhotoUploader';

interface AiDonationScannerProps {
  onCategoryConfirmed?: (category: string, scanData: DonationVisionScanResponse) => void;
  onClose?: () => void;
  compact?: boolean;
}

export const AiDonationScanner: React.FC<AiDonationScannerProps> = ({
  onCategoryConfirmed,
  onClose,
  compact = false
}) => {
  const { t } = useLanguage();

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<DonationVisionScanResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => console.error("Video play error:", err));
      }
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (overrideFacingMode?: 'environment' | 'user') => {
    setErrorMsg(null);
    setImagePreview(null);
    setSelectedFile(null);
    setResult(null);

    const mode = overrideFacingMode || facingMode;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg(t('donationScanner.cameraUnavailableMsg') || 'Camera is not supported on this browser or context.');
      return;
    }

    try {
      stopCamera();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (constrErr) {
        // Fallback for browsers/devices rejecting specific dimensions
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error("Play error:", err));
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg(t('donationScanner.cameraDeniedMsg') || 'Camera permission denied. Please allow camera access.');
      } else {
        setErrorMsg(t('donationScanner.cameraUnavailableMsg') || 'Camera unavailable or blocked on this device.');
      }
      setIsCameraActive(false);
    }
  };

  const switchCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  const captureFrame = () => {
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
          const dataUrl = canvas.toDataURL('image/jpeg');
          setImagePreview(dataUrl);
          setSelectedFile(blob);
          stopCamera();
          handleAnalyzeImage(blob);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      setErrorMsg(t('donationScanner.invalidImageMsg') || 'File size exceeds 16MB limit.');
      return;
    }

    stopCamera();
    setErrorMsg(null);
    setResult(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      handleAnalyzeImage(file);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async (fileToAnalyze?: File | Blob) => {
    const targetFile = fileToAnalyze || selectedFile;
    if (!targetFile) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const scanResponse = await aiApi.scanDonation(targetFile);
      setResult(scanResponse);
      setSelectedCategory(scanResponse.prediction.toLowerCase());
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMsg(
        err.response?.data?.error || 
        t('donationScanner.analysisFailedMsg') || 
        'Could not analyze image. Please verify backend connection.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedCategory || !result) return;
    if (onCategoryConfirmed) {
      onCategoryConfirmed(selectedCategory, result);
    }
  };

  const getCategoryIcon = (catName: string) => {
    switch (catName.toLowerCase()) {
      case 'clothing':
        return <Shirt className="w-5 h-5 text-indigo-500" />;
      case 'food':
        return <Utensils className="w-5 h-5 text-emerald-500" />;
      case 'hygiene':
        return <ShowerHead className="w-5 h-5 text-sky-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  const getCategoryLabel = (catName: string) => {
    switch (catName.toLowerCase()) {
      case 'clothing':
        return t('donationScanner.clothing') || 'Clothing';
      case 'food':
        return t('donationScanner.food') || 'Food';
      case 'hygiene':
        return t('donationScanner.hygiene') || 'Hygiene';
      default:
        return catName;
    }
  };

  return (
    <div className={`bg-white dark:bg-[#161616] rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-xl overflow-hidden transition-all duration-300 ${compact ? 'p-4 sm:p-6' : 'p-6 sm:p-8'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#EAE3D2] dark:border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F3E9] dark:bg-[#159B5B]/20 border border-[#159B5B]/30 flex items-center justify-center text-[#159B5B] dark:text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#17231E] dark:text-white tracking-tight flex items-center gap-2">
              {t('donationScanner.title') || 'AI Donation Scanner'}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                MobileNetV2
              </span>
            </h2>
            <p className="text-xs text-[#17231E]/70 dark:text-[#F5F5F0]/70 font-medium">
              {t('donationScanner.subtitle') || 'MobileNetV2 Vision AI for automated item recognition'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#17231E]/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Scanner Container */}
      <div className="space-y-6">

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 rounded-2xl p-4 text-xs font-medium flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        <div className="relative">
          <PhotoUploader
            compact={compact}
            label={t('donationScanner.title') || "Item Photo Scanner"}
            subtitle={t('donationScanner.subtitle') || "Take or upload a photo of the item for AI classification"}
            onPhotoSelect={(file, dataUrl) => {
              if (file) {
                setSelectedFile(file);
                setImagePreview(dataUrl || null);
                handleAnalyzeImage(file);
              } else {
                setSelectedFile(null);
                setImagePreview(null);
                setResult(null);
              }
            }}
            initialPreview={imagePreview}
            showPrivacyNote={false}
          />

          {/* Analyzing Spinner Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-3xl z-30 flex flex-col items-center justify-center text-white space-y-3 p-4">
              <RefreshCw className="w-8 h-8 text-[#159B5B] animate-spin" />
              <p className="text-sm font-bold tracking-wide animate-pulse">
                {t('donationScanner.analyzing') || 'Analyzing donation image...'}
              </p>
              <span className="text-[11px] text-white/60">Executing MobileNetV2 Tensor Inference</span>
            </div>
          )}
        </div>

        {/* AI Results Display */}
        {result && (
          <div className="space-y-4 pt-4 border-t border-[#EAE3D2] dark:border-white/10">
            
            {/* Low Confidence Alert Banner */}
            {result.low_confidence && (
              <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 rounded-2xl p-4 text-xs font-medium flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-100">
                    {t('donationScanner.lowConfidenceTitle') || 'Low-Confidence Result'}
                  </div>
                  <p className="mt-0.5 opacity-90">
                    {t('donationScanner.lowConfidenceMsg') || 'Low-confidence result. Please verify or choose the correct category.'}
                  </p>
                </div>
              </div>
            )}

            {/* Classification Summary Card */}
            <div className="bg-[#FFF9ED] dark:bg-[#0D0D0D] rounded-2xl p-4 sm:p-5 border border-[#EAE3D2] dark:border-white/10 space-y-4">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE3D2]/60 dark:border-white/10">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#17231E]/60 dark:text-[#F5F5F0]/60">
                    {t('donationScanner.detectedItem') || 'Detected Item'}
                  </span>
                  <div className="text-xl font-black text-[#17231E] dark:text-white capitalize flex items-center space-x-2 mt-0.5">
                    {getCategoryIcon(result.prediction)}
                    <span>{getCategoryLabel(result.prediction)}</span>
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#17231E]/60 dark:text-[#F5F5F0]/60">
                    {t('donationScanner.confidence') || 'Confidence'}
                  </span>
                  <div className="text-xl font-black text-[#159B5B] dark:text-emerald-400">
                    {result.confidence_percentage}%
                  </div>
                </div>
              </div>

              {/* Class Probabilities Progress Bars */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-[#17231E]/70 dark:text-[#F5F5F0]/70 uppercase tracking-wider">
                  {t('donationScanner.topPredictions') || 'Top Predictions'}
                </span>

                {Object.entries(result.all_probabilities).map(([catName, probVal]) => {
                  const percentage = Math.round(probVal * 100);
                  const isTop = catName.toLowerCase() === result.prediction.toLowerCase();

                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={`capitalize flex items-center space-x-1.5 ${isTop ? 'text-[#159B5B] dark:text-emerald-400 font-bold' : 'text-[#17231E]/80 dark:text-white/80'}`}>
                          {getCategoryIcon(catName)}
                          <span>{getCategoryLabel(catName)}</span>
                        </span>
                        <span className={isTop ? 'text-[#159B5B] dark:text-emerald-400 font-bold' : 'text-[#17231E]/70 dark:text-white/70'}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EAE3D2] dark:bg-[#262626] overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isTop ? 'bg-[#159B5B] dark:bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Category Override Selection */}
              <div className="pt-3 border-t border-[#EAE3D2]/60 dark:border-white/10">
                <label className="block text-xs font-bold text-[#17231E]/80 dark:text-white/80 mb-2">
                  {t('donationScanner.editCategory') || 'Confirm or Edit Category'}:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['clothing', 'food', 'hygiene'].map((catKey) => {
                    const isSelected = selectedCategory === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setSelectedCategory(catKey)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold capitalize flex items-center justify-center space-x-1.5 transition-all border ${
                          isSelected 
                            ? 'bg-[#159B5B] text-white border-[#159B5B] shadow-sm' 
                            : 'bg-white dark:bg-[#161616] text-[#17231E] dark:text-white border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B]/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{getCategoryLabel(catKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confirm Action Button */}
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#159B5B] hover:bg-[#12824C] text-white text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{t('donationScanner.confirm') || 'Confirm & Donate'}</span>
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
