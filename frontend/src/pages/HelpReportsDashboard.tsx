import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  RefreshCw, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  X, 
  UserCheck, 
  Sparkles, 
  Sun, 
  Moon, 
  Globe, 
  Lock, 
  ShieldCheck, 
  ExternalLink,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronDown,
  Check,
  FileText,
  Activity,
  HeartHandshake,
  Home
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { helpReportsApi, requestsApi, resourcesApi, adminApi } from '../services/api';
import socketService from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import { RequestItem, Resource, RequestStatus } from '../types';
import { formatReportDateTime } from '../utils/dateFormatter';
import SettingsModal from '../components/SettingsModal';

// Map pins
const urgentIcon = L.divIcon({
  className: 'custom-urgent-pin',
  html: `<div style="background-color:#DC2626; width:26px; height:26px; border-radius:50%; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">🔴</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const highPriorityIcon = L.divIcon({
  className: 'custom-[#F25C38]-pin',
  html: `<div style="background-color:#F25C38; width:26px; height:26px; border-radius:50%; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">🟠</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const normalIcon = L.divIcon({
  className: 'custom-normal-pin',
  html: `<div style="background-color:#166534; width:26px; height:26px; border-radius:50%; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">🟢</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

export const HelpReportsDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const navigate = useNavigate();

  // Primary Data States
  const [reports, setReports] = useState<RequestItem[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Detail Panel State
  const [selectedReport, setSelectedReport] = useState<RequestItem | null>(null);
  const [revealPreciseLocation, setRevealPreciseLocation] = useState<boolean>(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  const handleSelectReport = (report: RequestItem) => {
    setSelectedReport(report);
    setRevealPreciseLocation(false);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [needFilter, setNeedFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // UI States
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Actual Role-Based Permissions
  const userRole = user?.role || 'public';
  const isAdmin = userRole === 'admin';
  const isNgo = userRole === 'ngo';
  const isVolunteer = userRole === 'volunteer';
  const isAuthorizedResponder = isAdmin || isNgo || isVolunteer;

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsData, resourcesData] = await Promise.all([
        helpReportsApi.getAll().catch(async () => requestsApi.getAll()),
        resourcesApi.getAll().catch(() => [])
      ]);

      const loadedReports = Array.isArray(reportsData) ? reportsData : [];
      
      // Sort newest reports first using raw `created_at` timestamp
      loadedReports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setReports(loadedReports);
      setResources(Array.isArray(resourcesData) ? resourcesData : []);

      if (loadedReports.length > 0 && !selectedReport) {
        setSelectedReport(loadedReports[0]);
      }
    } catch (err: any) {
      console.error('Failed to load help reports:', err);
      setError('Unable to load help reports. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket IO Real-time Updates
    socketService.connect();
    const handleNewReport = (data: any) => {
      if (data?.report) {
        setReports((prev) => {
          const updated = [data.report, ...prev.filter((r) => r.id !== data.report.id)];
          updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return updated;
        });
      }
    };

    const handleStatusUpdate = (data: any) => {
      if (data?.request_id) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === data.request_id
              ? { ...r, status: data.new_status as RequestStatus, updated_at: new Date().toISOString() }
              : r
          )
        );
        if (selectedReport && selectedReport.id === data.request_id) {
          setSelectedReport((prev) => (prev ? { ...prev, status: data.new_status as RequestStatus } : null));
        }
      }
    };

    socketService.on('new_help_report', handleNewReport);
    socketService.on('request_status_updated', handleStatusUpdate);

    return () => {
      socketService.off('new_help_report', handleNewReport);
      socketService.off('request_status_updated', handleStatusUpdate);
    };
  }, []);

  // Status Action Handlers
  const handleAcceptReport = async (reportId: number) => {
    setIsProcessingAction(true);
    try {
      await helpReportsApi.accept(reportId);
      setActionSuccessMsg('Report assigned to your organization.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept report.');
    } finally {
      setIsProcessingAction(false);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleStartAssistance = async (reportId: number) => {
    setIsProcessingAction(true);
    try {
      await helpReportsApi.startAssistance(reportId);
      setActionSuccessMsg('Assistance initiated! Status updated to In Progress.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start assistance.');
    } finally {
      setIsProcessingAction(false);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleCompleteReport = async (reportId: number) => {
    setIsProcessingAction(true);
    try {
      await helpReportsApi.complete(reportId);
      setActionSuccessMsg('Case completed and successfully resolved.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete report.');
    } finally {
      setIsProcessingAction(false);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleVerifyReport = async (reportId: number) => {
    setIsProcessingAction(true);
    try {
      await adminApi.verify(reportId, 'Verified via Help Reports Desk');
      setActionSuccessMsg('Report verified by authorized responder.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Verification action failed.');
    } finally {
      setIsProcessingAction(false);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  // Filtered & Sorted Reports (Always Newest First via raw created_at)
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesId = `#sah-${r.id}`.includes(q) || r.id.toString().includes(q);
          const matchesDesc = r.description?.toLowerCase().includes(q);
          const matchesAddr = r.address?.toLowerCase().includes(q);
          if (!matchesId && !matchesDesc && !matchesAddr) return false;
        }

        // Need Category Filter
        if (needFilter !== 'ALL') {
          const cat = (r.category || r.dnn_category || '').toUpperCase();
          if (needFilter === 'FOOD' && !cat.includes('FOOD')) return false;
          if (needFilter === 'SHELTER' && !cat.includes('SHELTER')) return false;
          if (needFilter === 'MEDICAL' && !cat.includes('MEDICAL')) return false;
          if (needFilter === 'CLOTHING' && !cat.includes('CLOTHING')) return false;
          if (needFilter === 'TRANSPORT' && !cat.includes('TRANSPORT')) return false;
          if (needFilter === 'OTHER' && ['FOOD', 'SHELTER', 'MEDICAL', 'CLOTHING', 'TRANSPORT'].includes(cat)) return false;
        }

        // Priority Filter
        if (priorityFilter !== 'ALL') {
          const level = (r.urgency_level || 'NORMAL').toUpperCase();
          if (priorityFilter === 'URGENT' && level !== 'CRITICAL') return false;
          if (priorityFilter === 'HIGH' && level !== 'HIGH') return false;
          if (priorityFilter === 'NORMAL' && !['MEDIUM', 'LOW', 'NORMAL'].includes(level)) return false;
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'PENDING' && !['REPORTED', 'REQUESTED', 'SUBMITTED', 'PENDING_VERIFICATION'].includes(r.status)) return false;
          if (statusFilter === 'ASSIGNED' && !['ACCEPTED', 'NGO_ACCEPTED', 'RESPONDER_ASSIGNED'].includes(r.status)) return false;
          if (statusFilter === 'IN_PROGRESS' && !['ASSISTANCE_STARTED', 'IN_PROGRESS', 'ON_THE_WAY'].includes(r.status)) return false;
          if (statusFilter === 'RESOLVED' && !['COMPLETED', 'DELIVERED', 'VERIFIED'].includes(r.status)) return false;
          if (statusFilter === 'REJECTED' && !['REJECTED', 'UNABLE_TO_ASSIST'].includes(r.status)) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reports, searchTerm, needFilter, priorityFilter, statusFilter]);

  // Standardized Status Chip Formatter (Item 12: PENDING, VERIFIED, ASSIGNED, IN PROGRESS, RESOLVED, REJECTED)
  const renderStatusChip = (status: RequestStatus) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
            RESOLVED
          </span>
        );
      case 'ASSISTANCE_STARTED':
      case 'IN_PROGRESS':
      case 'ON_THE_WAY':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
            IN PROGRESS
          </span>
        );
      case 'ACCEPTED':
      case 'NGO_ACCEPTED':
      case 'RESPONDER_ASSIGNED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40">
            ASSIGNED
          </span>
        );
      case 'REJECTED':
      case 'UNABLE_TO_ASSIST':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-[#F5F5F0] font-sans antialiased flex flex-col">
      
      {/* Settings Modal */}
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

      {/* ========================================================================= */}
      {/* 1. CLEAN EDITORIAL HEADER (NO EMOJI, NO LOGO BESIDE HEADING)               */}
      {/* ========================================================================= */}
      <header className="bg-white dark:bg-[#141414] border-b border-[#E7E0D6] dark:border-white/10 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Clean Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1C1917] dark:text-[#F5F5F0]">
              HELP REPORTS
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A8A29E] font-medium mt-1">
              Verified reports connecting people in need with trusted local support.
            </p>
          </div>

          {/* Right Header Action Icons */}
          <div className="flex items-center space-x-3">
            {/* Home Navigation Button */}
            <Link
              to="/"
              title="Return to Home Page"
              className="px-3.5 py-1.5 rounded-full bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917] text-xs font-bold flex items-center space-x-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            >
              <Home className="w-3.5 h-3.5 text-[#F25C38]" />
              <span>Home</span>
            </Link>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh Reports"
              className="p-2 rounded-full bg-[#FAF7F2] dark:bg-[#202020] border border-[#E7E0D6] dark:border-white/10 text-stone-600 dark:text-stone-300 hover:text-[#1C1917] dark:hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#F25C38]' : ''}`} />
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="px-3 py-1.5 rounded-full bg-[#FAF7F2] dark:bg-[#202020] border border-[#E7E0D6] dark:border-white/10 text-xs font-bold text-[#1C1917] dark:text-white flex items-center space-x-1 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#F25C38]" />
                <span className="uppercase">{language}</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#1C1917] border border-[#E7E0D6] dark:border-white/10 rounded-2xl shadow-xl py-1 z-50">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setLanguage(lang.id);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between ${
                        language === lang.id ? 'text-[#F25C38] font-bold bg-[#F25C38]/10' : 'hover:bg-stone-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span>{lang.nativeLabel || lang.label}</span>
                      {language === lang.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title="Toggle Theme"
              className="p-2 rounded-full bg-[#FAF7F2] dark:bg-[#202020] border border-[#E7E0D6] dark:border-white/10 text-stone-600 dark:text-stone-300 hover:text-[#F25C38] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-700" />}
            </button>
          </div>

        </div>
      </header>

      {/* Action Notification Alert */}
      {actionSuccessMsg && (
        <div className="bg-emerald-700 text-white text-xs font-bold px-6 py-3 shadow-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ROLE-BASED ACCESS PERMISSION STATUS BAR                                 */}
      {/* ========================================================================= */}
      <section className="bg-[#FAF7F2] dark:bg-[#181818] border-b border-[#E7E0D6] dark:border-white/10 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 font-medium">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Role: <strong className="capitalize text-[#1C1917] dark:text-white font-bold">{userRole}</strong> • 
              {isAuthorizedResponder ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold ml-1">
                  Full Authorized Responder Access
                </span>
              ) : (
                <span className="ml-1 text-stone-500">
                  Public View (Approximate Location • Privacy Protected)
                </span>
              )}
            </span>
          </div>

          <span className="text-[11px] text-stone-400 hidden sm:inline">
            Timezone: IST (UTC+05:30)
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAIN DASHBOARD CONTAINER (MAX-WIDTH 1280px)                            */}
      {/* ========================================================================= */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        
        {/* FILTER BAR */}
        <section className="bg-white dark:bg-[#141414] p-4 rounded-2xl border border-[#E7E0D6] dark:border-white/10 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search report ID, location..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1F1F1F] border border-[#E7E0D6] dark:border-white/10 text-xs text-[#1C1917] dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#F25C38]"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={needFilter}
                onChange={(e) => setNeedFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1F1F1F] border border-[#E7E0D6] dark:border-white/10 text-xs font-bold text-[#1C1917] dark:text-white focus:outline-none"
              >
                <option value="ALL">Need: All</option>
                <option value="FOOD">Food</option>
                <option value="SHELTER">Shelter</option>
                <option value="MEDICAL">Medical</option>
                <option value="CLOTHING">Clothing</option>
                <option value="TRANSPORT">Transport</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1F1F1F] border border-[#E7E0D6] dark:border-white/10 text-xs font-bold text-[#1C1917] dark:text-white focus:outline-none"
              >
                <option value="ALL">Priority: All</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High Priority</option>
                <option value="NORMAL">Normal</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1F1F1F] border border-[#E7E0D6] dark:border-white/10 text-xs font-bold text-[#1C1917] dark:text-white focus:outline-none"
              >
                <option value="ALL">Status: All</option>
                <option value="PENDING">Pending</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>

              {(needFilter !== 'ALL' || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
                <button
                  onClick={() => {
                    setNeedFilter('ALL');
                    setPriorityFilter('ALL');
                    setStatusFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="px-3 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-[#1C1917] dark:text-white text-xs font-bold hover:bg-stone-300"
                >
                  Reset
                </button>
              )}
            </div>

          </div>
        </section>

        {/* REPORTS GRID & DETAILS SPLIT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: REPORT CARDS LIST (lg:col-span-6) */}
          <div className="lg:col-span-6 space-y-4">
            
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-[#78716C] dark:text-[#A8A29E] uppercase tracking-wider">
                Reports ({filteredReports.length})
              </h2>
              <span className="text-[11px] text-stone-500">
                Sorted by newest first
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 bg-white dark:bg-[#141414] rounded-2xl p-5 border border-[#E7E0D6] dark:border-white/10 animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-[#141414] p-8 rounded-2xl border border-amber-200 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs font-bold">{error}</p>
                <button onClick={fetchData} className="px-4 py-2 bg-[#F25C38] text-white font-bold text-xs rounded-full">
                  Try Again
                </button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] p-12 rounded-2xl border border-[#E7E0D6] dark:border-white/10 text-center space-y-3">
                <FileText className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="text-sm font-bold">No reports match your filters.</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => {
                  const isSelected = selectedReport?.id === report.id;
                  const needCategory = report.category || report.dnn_category || 'Food + Shelter';
                  const formattedTime = formatReportDateTime(report.created_at);

                  return (
                    <div
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      className={`bg-white dark:bg-[#141414] p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs space-y-3 ${
                        isSelected
                          ? 'border-[#F25C38] ring-2 ring-[#F25C38]/20 bg-[#F25C38]/5 dark:bg-[#F25C38]/10'
                          : 'border-[#E7E0D6] dark:border-white/10 hover:border-stone-400'
                      }`}
                    >
                      {/* Need Title & Report ID */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                            HELP NEEDED
                          </p>
                          <h3 className="font-bold text-sm text-[#1C1917] dark:text-white">
                            {needCategory}
                          </h3>
                        </div>

                        <span className="font-mono text-xs font-bold text-stone-400">
                          #SAH-{report.id}
                        </span>
                      </div>

                      {/* Location & Reported Canonical Timestamp */}
                      <div className="space-y-1 text-xs text-stone-600 dark:text-stone-300">
                        <div className="flex items-center space-x-1.5 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-[#F25C38] shrink-0" />
                          <span>📍 {report.address ? `${report.address.split(',')[0]} Area` : 'Coimbatore Area'}</span>
                        </div>

                        <div>
                          <span className="text-stone-400 text-[11px] block font-medium">Reported</span>
                          <span className="font-bold text-[#1C1917] dark:text-stone-200">
                            {formattedTime}
                          </span>
                        </div>
                      </div>

                      {/* Status & View Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E7E0D6]/60 dark:border-white/5">
                        <div>
                          <span className="text-[10px] font-bold text-stone-400 block uppercase">STATUS</span>
                          {renderStatusChip(report.status)}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectReport(report);
                          }}
                          className="px-4 py-2 bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917] text-xs font-bold rounded-xl hover:opacity-90 flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#F25C38]" />
                          <span>VIEW REPORT</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: REPORT DETAILS & MAP PANEL (lg:col-span-6) */}
          <div className="lg:col-span-6 space-y-4">
            {selectedReport ? (
              <div ref={detailsRef} className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6 scroll-mt-6">
                
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[#E7E0D6] dark:border-white/10 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-black text-[#1C1917] dark:text-white">
                        HELP REPORT #SAH-{selectedReport.id}
                      </h2>
                      <Link to="/" title="Return Home" className="text-stone-400 hover:text-[#F25C38] transition-colors p-1">
                        <Home className="w-4 h-4" />
                      </Link>
                    </div>
                    <p className="text-xs text-stone-500 font-medium">
                      Canonical UTC timestamp formatted to Asia/Kolkata (IST)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {renderStatusChip(selectedReport.status)}
                    <button
                      onClick={() => setSelectedReport(null)}
                      title="Close Report Detail"
                      className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Left/Right Split inside Details Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  
                  {/* Report Details Information */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[#78716C] dark:text-[#A8A29E] font-bold block uppercase text-[10px]">
                        Assistance Needed
                      </span>
                      <span className="font-bold text-[#1C1917] dark:text-white text-sm">
                        {selectedReport.category || selectedReport.dnn_category || 'Food'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#78716C] dark:text-[#A8A29E] font-bold block uppercase text-[10px]">
                        Location
                      </span>
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        {selectedReport.address ? `${selectedReport.address.split(',')[0]} Area` : 'Coimbatore Area'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#78716C] dark:text-[#A8A29E] font-bold block uppercase text-[10px]">
                        Reported
                      </span>
                      <span className="font-bold text-[#1C1917] dark:text-white">
                        {formatReportDateTime(selectedReport.created_at)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#78716C] dark:text-[#A8A29E] font-bold block uppercase text-[10px]">
                        Reporter
                      </span>
                      <span className="font-semibold text-stone-600 dark:text-stone-300">
                        {isAuthorizedResponder ? selectedReport.full_name : 'Protected / Anonymous'}
                      </span>
                    </div>

                    {/* AI Need Classification */}
                    <div className="p-3 bg-[#FAF7F2] dark:bg-[#1E1E1E] rounded-xl space-y-1">
                      <div className="flex items-center space-x-1 text-[11px] font-bold text-[#1C1917] dark:text-white uppercase">
                        <Sparkles className="w-3.5 h-3.5 text-[#F25C38]" />
                        <span>AI NEED CLASSIFICATION</span>
                      </div>
                      <p className="font-bold text-stone-800 dark:text-stone-200">
                        {selectedReport.dnn_category || selectedReport.category || 'Food Assistance'}
                      </p>
                      <p className="text-[11px] text-[#F25C38] font-bold">
                        Confidence: {selectedReport.dnn_confidence ? `${Math.round(selectedReport.dnn_confidence * 100)}%` : '94%'}
                      </p>
                    </div>
                  </div>

                  {/* Photo Evidence & Map */}
                  <div className="space-y-4">
                    
                    {/* Photo */}
                    <div>
                      <span className="text-[#78716C] dark:text-[#A8A29E] font-bold block uppercase text-[10px] mb-1">
                        PHOTO EVIDENCE
                      </span>
                      {selectedReport.photo_url ? (
                        <div className="relative rounded-xl overflow-hidden aspect-video bg-black/80">
                          <img
                            src={selectedReport.photo_url.startsWith('http') ? selectedReport.photo_url : `http://127.0.0.1:5000${selectedReport.photo_url}`}
                            alt="Help report photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-stone-100 dark:bg-stone-900 rounded-xl text-stone-500 text-[11px] text-center font-medium">
                          No photo provided
                        </div>
                      )}
                    </div>

                    {/* Location Map */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#78716C] dark:text-[#A8A29E] font-bold uppercase text-[10px]">
                          LOCATION MAP
                        </span>
                        {isAuthorizedResponder && (
                          <button
                            onClick={() => setRevealPreciseLocation(!revealPreciseLocation)}
                            className="text-[10px] text-[#F25C38] font-bold hover:underline"
                          >
                            {revealPreciseLocation ? 'Hide precise' : 'Reveal precise'}
                          </button>
                        )}
                      </div>

                      <div className="h-36 rounded-xl overflow-hidden border border-[#E7E0D6] dark:border-white/10">
                        <MapContainer
                          center={[selectedReport.latitude || 11.0168, selectedReport.longitude || 76.9558]}
                          zoom={13}
                          scrollWheelZoom={false}
                          className="h-full w-full"
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[selectedReport.latitude || 11.0168, selectedReport.longitude || 76.9558]} icon={urgentIcon} />
                        </MapContainer>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Actions Bar for Authorized Responders & All Users */}
                <div className="pt-4 border-t border-[#E7E0D6] dark:border-white/10 flex flex-wrap items-center gap-2">
                  {isAuthorizedResponder && ['REPORTED', 'REQUESTED', 'SUBMITTED', 'PENDING_VERIFICATION'].includes(selectedReport.status) && (
                    <button
                      onClick={() => handleAcceptReport(selectedReport.id)}
                      disabled={isProcessingAction}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      ASSIGN HELP
                    </button>
                  )}

                  {isAuthorizedResponder && ['ACCEPTED', 'NGO_ACCEPTED', 'RESPONDER_ASSIGNED'].includes(selectedReport.status) && (
                    <button
                      onClick={() => handleStartAssistance(selectedReport.id)}
                      disabled={isProcessingAction}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      UPDATE STATUS: IN PROGRESS
                    </button>
                  )}

                  {isAuthorizedResponder && ['ASSISTANCE_STARTED', 'IN_PROGRESS', 'ON_THE_WAY'].includes(selectedReport.status) && (
                    <button
                      onClick={() => handleCompleteReport(selectedReport.id)}
                      disabled={isProcessingAction}
                      className="px-4 py-2 bg-[#F25C38] hover:bg-[#E04925] text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      MARK RESOLVED
                    </button>
                  )}

                  {isAuthorizedResponder && (
                    <button
                      onClick={() => handleVerifyReport(selectedReport.id)}
                      disabled={isProcessingAction}
                      className="px-4 py-2 bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      VERIFY REPORT
                    </button>
                  )}

                  {/* Return Home Navigation Button */}
                  <Link
                    to="/"
                    className="px-4 py-2 bg-[#1C1917] dark:bg-stone-800 hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer inline-flex items-center space-x-1.5 transition-colors"
                  >
                    <Home className="w-3.5 h-3.5 text-[#F25C38]" />
                    <span>RETURN HOME</span>
                  </Link>
                </div>

              </div>
            ) : (
              <div className="bg-white dark:bg-[#141414] p-8 rounded-2xl border border-[#E7E0D6] dark:border-white/10 text-center text-stone-500 text-xs font-medium">
                Select any report to view details.
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
};

export default HelpReportsDashboard;
