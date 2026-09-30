import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Camera, 
  Upload, 
  MapPin, 
  Mic, 
  MicOff, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Sparkles, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  RotateCcw,
  Navigation,
  Lock,
  PhoneCall,
  Check,
  Building,
  Radio,
  FileText
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { aiApi, helpReportsApi, matchingApi } from '../services/api';
import { useLanguage } from '../i18n';
import { RequestItem, MatchedResource, AiClassificationResponse } from '../types';
import socketService from '../services/socket';

const createReportMarker = () => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <span style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(225, 29, 72, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(225, 29, 72, 0.3);"></span>
        <div style="position: relative; width: 20px; height: 20px; border-radius: 50%; background: #E11D48; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #FFFFFF;"></div>
        </div>
      </div>
    `,
    className: 'custom-report-location-pin',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const CATEGORIES = ['FOOD', 'SHELTER', 'CLOTHING', 'MEDICAL', 'EMERGENCY', 'EDUCATION', 'EMPLOYMENT'];

export const HelpSomeonePage: React.FC = () => {
  const { t } = useLanguage();

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | File | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>({ lat: 11.0168, lng: 76.9558 });
  const [locationAddress, setLocationAddress] = useState<string>('Gandhipuram, Coimbatore, Tamil Nadu');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'denied'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Description & Voice state
  const [description, setDescription] = useState<string>('');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'ta-IN' | 'hi-IN'>('en-IN');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Category & AI classification state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);


  // Matches & Submission state
  const [matchedResources, setMatchedResources] = useState<MatchedResource[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<RequestItem | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Live Socket.IO Tracking for submitted report
  useEffect(() => {
    if (!submittedReport) return;

    const handleStatusUpdate = (data: any) => {
      if (data.request_id === submittedReport.id) {
        setSubmittedReport(prev => prev ? {
          ...prev,
          status: data.new_status,
          assigned_ngo_id: data.assigned_ngo_id || prev.assigned_ngo_id
        } : null);
      }
    };

    socketService.on('request_status_updated', handleStatusUpdate);
    return () => {
      socketService.off('request_status_updated', handleStatusUpdate);
    };
  }, [submittedReport]);

  // Clean camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Sync stream to video ref when camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [isCameraActive]);

  // Camera Handlers
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    const mode = overrideFacing || facingMode;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera is not supported on this device/browser.');
      return;
    }
    try {
      stopCamera();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Camera access denied or unavailable.');
      setIsCameraActive(false);
    }
  };

  const captureCameraFrame = () => {
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
          setPhotoPreview(dataUrl);
          setPhotoBlob(blob);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setPhotoBlob(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Location Handlers
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationStatus('locating');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setLocationStatus('success');
        setLocationAddress(`Near ${lat.toFixed(4)}, ${lng.toFixed(4)} (Coimbatore Locality)`);
        // Trigger matching refresh if description exists
        if (description) triggerAiAnalysis(description, peopleCount, lat, lng);
      },
      (err) => {
        setLocationStatus('denied');
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission denied. You can enter or select coordinates manually below.');
        } else {
          setLocationError('Could not acquire location. Please enter details manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Speech Recognition Handlers
  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please type the description.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      setSpeechError(null);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcriptStr = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptStr += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcriptStr);
        setDescription(transcriptStr);
        triggerAiAnalysis(transcriptStr, peopleCount, userLocation?.lat, userLocation?.lng);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setSpeechError(`Voice input note: ${event.error}. You can edit text manually.`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setSpeechError('Failed to initialize microphone. Please check browser permissions.');
      setIsListening(false);
    }
  };

  // AI DNN Analysis trigger
  const triggerAiAnalysis = async (text: string, count: number, lat?: number, lon?: number) => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await aiApi.classify(text, count, 'Emergency Help Someone Report', lat, lon);
      setAiResult(res);
      if (res.matched_resources) setMatchedResources(res.matched_resources);
    } catch (err) {
      console.error('AI analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setDescription(text);
    if (text.length > 10) {
      triggerAiAnalysis(text, peopleCount, userLocation?.lat, userLocation?.lng);
    }
  };

  // Submit Report
  const handleSubmitReport = async () => {
    if (!description.trim()) {
      alert('Please provide a description of the person needing help.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('description', description);
      if (voiceTranscript) formData.append('voice_transcript', voiceTranscript);
      formData.append('people_count', peopleCount.toString());
      if (selectedCategory) formData.append('category', selectedCategory);
      formData.append('latitude', (userLocation?.lat || 11.0168).toString());
      formData.append('longitude', (userLocation?.lng || 76.9558).toString());
      formData.append('address', locationAddress);
      formData.append('has_permission', hasPermission.toString());
      
      if (photoBlob) {
        formData.append('photo', photoBlob, 'report_photo.jpg');
      }

      const response = await helpReportsApi.create(formData);
      setSubmittedReport(response.report);
      if (response.matched_resources) setMatchedResources(response.matched_resources);
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err.response?.data?.error || 'Could not submit help report. Please check server connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeColor = (st: string) => {
    switch (st) {
      case 'REPORTED':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300';
      case 'VERIFIED':
        return 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300';
      case 'ACCEPTED':
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300';
      case 'ASSISTANCE_STARTED':
      case 'IN_PROGRESS':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300';
      case 'COMPLETED':
        return 'bg-green-600 text-white font-black';
      default:
        return 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 border-[#159B5B]/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0D0D0D] text-[#17231E] dark:text-[#F5F5F0] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Page Header */}
        <div className="space-y-2 border-b border-[#EAE3D2] dark:border-white/10 pb-6">
          <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#E11D48]">
            <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-ping" />
            <span>Emergency Reporting Workflow</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#17231E] dark:text-white flex items-center gap-3">
            <span>Help Someone Nearby</span>
            <span className="text-2xl">🆘</span>
          </h1>
          <p className="text-sm sm:text-base text-[#17231E]/75 dark:text-[#F5F5F0]/80 font-medium">
            Report a person who may need immediate food, shelter, medical assistance or urgent care.
          </p>
        </div>

        {/* IF SUBMITTED: Live Status Tracking Screen */}
        {submittedReport ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-emerald-500/40 shadow-xl space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE3D2] dark:border-white/10">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-300">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#17231E] dark:text-white">
                      Help Request Submitted! ✅
                    </h2>
                    <p className="text-xs text-[#17231E]/70 dark:text-[#F5F5F0]/70 font-medium">
                      Report #{submittedReport.id} is live and actively matched to local responders.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${getStatusBadgeColor(submittedReport.status)}`}>
                    Status: {submittedReport.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Status Pipeline Progress Bar */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#17231E]/60 dark:text-white/60">
                  Real-Time Emergency Lifecycle Tracker:
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  {[
                    { key: 'REPORTED', label: '1. Reported', icon: '🟡' },
                    { key: 'VERIFIED', label: '2. Verified', icon: '🔵' },
                    { key: 'ACCEPTED', label: '3. Accepted', icon: '🟢' },
                    { key: 'ASSISTANCE_STARTED', label: '4. Responding', icon: '🚨' },
                    { key: 'COMPLETED', label: '5. Completed', icon: '✅' },
                  ].map((step, idx) => {
                    const isCurrent = submittedReport.status === step.key;
                    const isPassed = ['COMPLETED', 'ASSISTANCE_STARTED', 'ACCEPTED', 'VERIFIED', 'REPORTED'].indexOf(submittedReport.status) >= ['COMPLETED', 'ASSISTANCE_STARTED', 'ACCEPTED', 'VERIFIED', 'REPORTED'].indexOf(step.key);

                    return (
                      <div 
                        key={step.key} 
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-[#159B5B] text-white border-[#159B5B] shadow-md scale-105'
                            : isPassed
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                            : 'bg-stone-100 dark:bg-[#262626] text-stone-400 border-stone-200 dark:border-white/10'
                        }`}
                      >
                        <div className="text-base">{step.icon}</div>
                        <div className="mt-1 font-black text-[11px] uppercase tracking-tight">{step.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Report Breakdown Summary */}
              <div className="bg-[#FFF9ED] dark:bg-[#0D0D0D] rounded-2xl p-5 border border-[#EAE3D2] dark:border-white/10 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#17231E]/60 dark:text-white/60">Category</span>
                    <div className="font-black text-sm text-[#159B5B]">{submittedReport.category}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#17231E]/60 dark:text-white/60">Urgency</span>
                    <div className="font-black text-sm text-rose-600">{submittedReport.urgency_level}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#17231E]/60 dark:text-white/60">People Affected</span>
                    <div className="font-black text-sm text-[#17231E] dark:text-white">{submittedReport.people_count} person(s)</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#17231E]/60 dark:text-white/60">Location</span>
                    <div className="font-black text-xs text-[#17231E] dark:text-white truncate">{submittedReport.address}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] uppercase font-bold text-[#17231E]/60 dark:text-white/60">Situation Description</span>
                  <p className="text-xs font-medium italic text-[#17231E]/80 dark:text-white/80 mt-0.5">
                    "{submittedReport.description}"
                  </p>
                </div>
              </div>

              {/* Nearby Matching Responders */}
              {matchedResources.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#17231E] dark:text-white">
                    🏢 Suitable Nearby Response Organizations ({matchedResources.length}):
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchedResources.map((res) => (
                      <div key={res.resource_id} className="p-4 rounded-2xl bg-white dark:bg-[#262626] border border-[#EAE3D2] dark:border-white/10 space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-[#17231E] dark:text-white">{res.resource_name}</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700">
                            Score: {res.match_score}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center justify-between">
                          <span>📍 {res.distance_km} km away</span>
                          <span>Cap: {res.breakdown?.capacity || 'Available'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#EAE3D2] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSubmittedReport(null)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#159B5B] hover:bg-[#12824C] text-white text-xs font-black uppercase tracking-wider transition-all"
                >
                  Submit Another Report
                </button>
                <Link
                  to="/"
                  className="py-3 px-6 rounded-2xl bg-[#17231E] dark:bg-[#262626] hover:bg-black text-white text-xs font-black uppercase tracking-wider text-center transition-all"
                >
                  Return to Home
                </Link>
              </div>

            </div>
          </div>
        ) : (

          /* FORM SECTION */
          <div className="space-y-8">

            {/* Error Message */}
            {submitError && (
              <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 rounded-2xl p-4 text-xs font-medium flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{submitError}</div>
              </div>
            )}

            {/* SECTION 1 — PHOTO (OPTIONAL) */}
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#17231E] dark:text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#159B5B]" />
                    <span>SECTION 1 — Add a Photo (Optional)</span>
                  </h2>
                  <p className="text-xs text-[#17231E]/70 dark:text-[#F5F5F0]/70 font-medium">
                    Take or upload a photo to provide visual context for NGO field responders.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  Optional
                </span>
              </div>

              {/* Privacy Notice Banner */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 text-xs space-y-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center space-x-1.5">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>🔐 Privacy Protected Guarantee</span>
                </div>
                <p className="text-[#17231E]/80 dark:text-stone-300 leading-relaxed font-medium">
                  Photos and exact location details are encrypted and shared ONLY with verified, authorized NGOs and emergency responders involved in providing assistance.
                </p>
              </div>

              {/* Photo Viewport */}
              <div className="relative w-full aspect-video sm:aspect-[16/9] max-h-[300px] rounded-2xl overflow-hidden bg-black/90 border border-black/10 flex items-center justify-center">
                
                {/* Live Camera Feed */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                />

                {/* Photo Preview */}
                {!isCameraActive && photoPreview && (
                  <img src={photoPreview} alt="Report preview" className="w-full h-full object-contain bg-black" />
                )}

                {/* Idle Placeholder */}
                {!isCameraActive && !photoPreview && (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="w-8 h-8 text-white/50 mx-auto" />
                    <p className="text-xs text-white/70 font-medium">
                      No photo captured yet. Photo is not mandatory to submit help report.
                    </p>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Control Overlay */}
                {isCameraActive && (
                  <div className="absolute bottom-4 inset-x-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const next = facingMode === 'environment' ? 'user' : 'environment';
                        setFacingMode(next);
                        startCamera(next);
                      }}
                      className="p-3 rounded-full bg-black/60 text-white border border-white/20"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={captureCameraFrame}
                      className="px-6 py-3 rounded-full bg-[#159B5B] text-white font-black text-xs uppercase tracking-wider flex items-center space-x-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Frame</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-3 rounded-full bg-black/60 text-white border border-white/20"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Photo Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="py-3 px-4 rounded-2xl bg-[#17231E] dark:bg-[#262626] hover:bg-black text-white text-xs font-bold flex items-center justify-center space-x-2 border border-[#24332D]"
                  >
                    <Camera className="w-4 h-4 text-[#159B5B]" />
                    <span>Take Photo</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="py-3 px-4 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center justify-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Close Camera</span>
                  </button>
                )}

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-2xl bg-[#E8F3E9] dark:bg-[#159B5B]/15 text-[#159B5B] dark:text-emerald-300 hover:bg-[#d8eada] text-xs font-bold flex items-center justify-center space-x-2 border border-[#159B5B]/30"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Photo</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setPhotoPreview(null);
                    setPhotoBlob(null);
                  }}
                  className="py-3 px-4 rounded-2xl bg-stone-100 dark:bg-[#262626] text-stone-600 dark:text-stone-300 hover:bg-stone-200 text-xs font-bold flex items-center justify-center space-x-2 border border-stone-200 dark:border-white/10"
                >
                  <X className="w-4 h-4" />
                  <span>Skip / Remove Photo</span>
                </button>
              </div>

              {/* Consent Toggle Checkbox */}
              <label className="flex items-center space-x-3 text-xs font-medium text-[#17231E] dark:text-stone-300 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={hasPermission}
                  onChange={(e) => setHasPermission(e.target.checked)}
                  className="w-4 h-4 accent-[#159B5B] rounded"
                />
                <span>I confirm I am sharing this photo responsibly to help the person in need.</span>
              </label>

            </div>


            {/* SECTION 2 — CURRENT LOCATION */}
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#17231E] dark:text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#159B5B]" />
                    <span>SECTION 2 — Current Location</span>
                  </h2>
                  <p className="text-xs text-[#17231E]/70 dark:text-[#F5F5F0]/70 font-medium">
                    Acquire exact coordinates so nearby responders can locate the person immediately.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locationStatus === 'locating'}
                  className="py-2.5 px-5 rounded-2xl bg-[#159B5B] hover:bg-[#12824C] text-white text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-sm transition-all shrink-0"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{locationStatus === 'locating' ? 'Locating...' : 'Use My Current Location'}</span>
                </button>
              </div>

              {locationError && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 text-xs font-medium">
                  {locationError}
                </div>
              )}

              {/* Map Preview */}
              {userLocation && (
                <div className="space-y-3">
                  <div className="h-[220px] rounded-2xl overflow-hidden border border-[#EAE3D2] dark:border-white/10 shadow-inner relative z-0">
                    <MapContainer
                      center={[userLocation.lat, userLocation.lng]}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[userLocation.lat, userLocation.lng]} icon={createReportMarker()}>
                        <Popup>
                          <div className="text-xs font-bold">📍 Incident Reported Location</div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-[#FFF9ED] dark:bg-[#0D0D0D] rounded-2xl border border-[#EAE3D2] dark:border-white/10 text-xs">
                    <div className="font-bold text-[#17231E] dark:text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      <span>📍 Detected Location: {locationAddress}</span>
                    </div>
                    <div className="text-stone-400 font-mono text-[11px]">
                      Lat: {userLocation.lat.toFixed(4)}, Lon: {userLocation.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              )}
            </div>


            {/* SECTION 3 — DESCRIPTION & MULTILINGUAL */}
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-black text-[#17231E] dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#159B5B]" />
                  <span>SECTION 3 — Describe the Situation</span>
                </h2>
                <p className="text-xs text-[#17231E]/70 dark:text-[#F5F5F0]/70 font-medium">
                  Type or speak in English, Tamil, or Hindi. The SAHAAYAA AI DNN classifier will analyze the text in real-time.
                </p>
              </div>

              {/* Sample Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Quick Test Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "An elderly person is sitting near Gandhipuram bus stand and needs food.",
                    "Mother with 2 young children sleeping in rain on pavement without shelter.",
                    "Person injured with leg wound near railway station requiring urgent medical aid."
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDescription(preset);
                        triggerAiAnalysis(preset, peopleCount, userLocation?.lat, userLocation?.lng);
                      }}
                      className="py-1.5 px-3 rounded-xl bg-stone-100 dark:bg-[#262626] hover:bg-[#E8F3E9] text-stone-700 dark:text-stone-300 text-[11px] font-medium border border-stone-200 dark:border-white/10 transition-colors"
                    >
                      Preset #{idx+1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Textarea */}
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Example: An elderly person is sitting near the bus stand and needs food."
                  className="w-full p-4 rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-stone-50/50 dark:bg-[#0D0D0D] text-[#17231E] dark:text-white text-sm font-medium focus:outline-none focus:border-[#159B5B] transition-colors"
                />
                <div className="flex justify-between items-center text-[11px] text-stone-400">
                  <span>Supports English | தமிழ் | हिन्दी</span>
                  <span>{description.length} characters</span>
                </div>
              </div>

              {/* SECTION 4 — VOICE INPUT */}
              <div className="pt-4 border-t border-[#EAE3D2] dark:border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Mic className="w-5 h-5 text-[#159B5B]" />
                    <div>
                      <h3 className="text-sm font-black text-[#17231E] dark:text-white">🎙️ Speak Instead (Voice Input)</h3>
                      <p className="text-[11px] text-stone-500">Live speech-to-text converts voice directly into description text.</p>
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center space-x-1.5 bg-stone-100 dark:bg-[#262626] p-1 rounded-xl border border-stone-200 dark:border-white/10">
                    {[
                      { code: 'en-IN', label: 'English' },
                      { code: 'ta-IN', label: 'தமிழ்' },
                      { code: 'hi-IN', label: 'हिन्दी' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setSelectedLanguage(lang.code as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          selectedLanguage === lang.code
                            ? 'bg-[#159B5B] text-white shadow-sm'
                            : 'text-stone-600 dark:text-stone-300 hover:text-[#17231E]'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse shadow-md'
                        : 'bg-[#159B5B] hover:bg-[#12824C] text-white shadow-sm'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isListening ? 'Stop Listening' : 'Start Voice Report'}</span>
                  </button>

                  {isListening && (
                    <div className="flex items-center space-x-2 text-xs font-bold text-rose-600">
                      <Radio className="w-4 h-4 animate-spin" />
                      <span>Listening in {selectedLanguage}... Speak clearly into microphone</span>
                    </div>
                  )}
                </div>

                {speechError && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{speechError}</p>
                )}
              </div>
            </div>


            {/* SECTION 5 & 6 — NUMBER OF PEOPLE & QUICK CATEGORY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Number of People */}
              <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#17231E] dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#159B5B]" />
                  <span>👥 How many people need help?</span>
                </h3>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setPeopleCount(num);
                        if (description) triggerAiAnalysis(description, num, userLocation?.lat, userLocation?.lng);
                      }}
                      className={`py-3 rounded-2xl text-xs font-black transition-all border ${
                        peopleCount === num
                          ? 'bg-[#159B5B] text-white border-[#159B5B] shadow-sm scale-105'
                          : 'bg-stone-50 dark:bg-[#0D0D0D] border-stone-200 dark:border-white/10 text-[#17231E] dark:text-white'
                      }`}
                    >
                      {num === 5 ? '5+' : num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Category Override */}
              <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#17231E] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#159B5B]" />
                  <span>Optionally Select Category Hint</span>
                </h3>

                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-black tracking-wider transition-all border ${
                        selectedCategory === cat
                          ? 'bg-[#17231E] dark:bg-white text-white dark:text-white border-[#17231E]'
                          : 'bg-stone-50 dark:bg-[#0D0D0D] border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

            </div>


            {/* AI ANALYSIS DISPLAY CARD */}
            {aiResult && (
              <div className="bg-gradient-to-br from-[#FFF9ED] to-[#E8F3E9] dark:from-[#0C1410] dark:to-[#121C18] rounded-3xl p-6 sm:p-8 border border-[#159B5B]/30 shadow-lg space-y-6 animate-fadeIn">
                
                <div className="flex items-center justify-between pb-4 border-b border-[#159B5B]/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#159B5B] text-white flex items-center justify-center font-bold">
                      🤖
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#17231E] dark:text-white">
                        SAHAAYAA AI DNN Analysis Result
                      </h3>
                      <p className="text-xs text-stone-500 font-medium">Real-time Keras tensor inference & urgency engine</p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-[#159B5B] dark:text-emerald-400">
                    Confidence: {aiResult.confidence_percentage}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10">
                    <span className="text-[10px] font-black uppercase text-stone-400">Predicted Need Category</span>
                    <div className="text-xl font-black text-[#159B5B] mt-0.5">{aiResult.category}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10">
                    <span className="text-[10px] font-black uppercase text-stone-400">Urgency Level</span>
                    <div className={`text-xl font-black mt-0.5 ${
                      aiResult.urgency === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {aiResult.urgency}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10">
                    <span className="text-[10px] font-black uppercase text-stone-400">Urgency Score</span>
                    <div className="text-xl font-black text-[#17231E] dark:text-white mt-0.5">{aiResult.urgency_score} / 100</div>
                  </div>
                </div>

                {/* Emergency Escalation Banner */}
                {aiResult.escalation_required && (
                  <div className="bg-rose-600 text-white rounded-2xl p-4 flex items-start space-x-3 shadow-md">
                    <PhoneCall className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-sm uppercase tracking-wide">🚨 Immediate Emergency Alert</div>
                      <p className="text-xs font-medium opacity-90 mt-0.5">
                        If someone is in immediate life danger, please call local emergency services (112 / 108) immediately while submitting this report.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* NEARBY MATCHED ORGANIZATIONS PREVIEW */}
            {matchedResources.length > 0 && (
              <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
                <h3 className="text-base font-black text-[#17231E] dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#159B5B]" />
                  <span>Nearby Suitable Responders ({matchedResources.length})</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchedResources.map((res) => (
                    <div key={res.resource_id} className="p-4 rounded-2xl bg-stone-50 dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-[#17231E] dark:text-white">{res.resource_name}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700">
                          Match: {res.match_score}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-1">{res.address}</p>
                      <div className="text-[10px] text-stone-400 flex items-center justify-between">
                        <span>📍 {res.distance_km} km away</span>
                        <span>Category: {res.resource_category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* SUBMIT ACTION BUTTON */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={isSubmitting || !description.trim()}
                className="w-full py-4 px-8 rounded-3xl bg-[#E11D48] hover:bg-rose-700 text-white font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Transmitting Emergency Report...</span>
                  </>
                ) : (
                  <>
                    <span>Transmit Help Someone Report</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default HelpSomeonePage;
