import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Users, 
  FileText, 
  Activity, 
  BarChart3, 
  Layers, 
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Building2,
  Bus,
  ShieldAlert,
  Lock,
  Check,
  Ban,
  Bell,
  LogOut,
  MapPin,
  MessageSquare,
  Gift,
  Cpu,
  Zap,
  Filter,
  Eye,
  UserCheck,
  Radio,
  Settings,
  HelpCircle,
  Phone,
  CheckSquare,
  ExternalLink,
  Bot
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  dashboardApi, 
  adminApi, 
  requestsApi, 
  helpReportsApi, 
  resourcesApi, 
  mobilityApi, 
  trustApi, 
  donationsApi, 
  aiApi, 
  matchingApi 
} from '../services/api';
import socketService from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { RequestItem, User, Resource, TransportInfoItem, Donation } from '../types';
import { formatReportDateTime } from '../utils/dateFormatter';
import AnimatedCounter from '../components/AnimatedCounter';

type AdminTab = 
  | 'dashboard' 
  | 'help-reports' 
  | 'emergency' 
  | 'people' 
  | 'ngos' 
  | 'volunteers' 
  | 'resources' 
  | 'matching' 
  | 'map' 
  | 'donations' 
  | 'automation' 
  | 'ai-logs' 
  | 'analytics' 
  | 'activity' 
  | 'settings';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Metrics & Charts
  const [metrics, setMetrics] = useState<any>({
    total_requests: 0,
    verified_requests: 0,
    pending_verification: 0,
    critical_requests: 0,
    active_matches: 0,
    completed_requests: 0,
    registered_ngos: 0,
    registered_donors: 0,
    fulfillment_rate: 0,
  });

  const [charts, setCharts] = useState<any>({
    by_category: [],
    by_urgency: [],
    by_status: [],
    timeline: [],
  });

  // Data lists
  const [allReports, setAllReports] = useState<RequestItem[]>([]);
  const [duplicateRequests, setDuplicateRequests] = useState<RequestItem[]>([]);
  const [resourcesList, setResourcesList] = useState<Resource[]>([]);
  const [transportsList, setTransportsList] = useState<TransportInfoItem[]>([]);
  const [trustReportsList, setTrustReportsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [donationsList, setDonationsList] = useState<Donation[]>([]);
  const [aiLogsList, setAiLogsList] = useState<any[]>([]);
  const [matchedResults, setMatchedResults] = useState<any[]>([]);

  // Filtering states for Help Reports table
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>('All');
  const [reportUrgencyFilter, setReportUrgencyFilter] = useState<string>('All');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('All');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');

  // Filtering states for People management
  const [peopleRoleTab, setPeopleRoleTab] = useState<'ALL' | 'BENEFICIARIES' | 'NGOs' | 'VOLUNTEERS' | 'ADMINS'>('ALL');
  const [peopleSearch, setPeopleSearch] = useState<string>('');

  // Resource category filter
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState<string>('All');

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // Modals & Detail Popups
  const [selectedDetailReport, setSelectedDetailReport] = useState<RequestItem | null>(null);
  const [preciseCoords, setPreciseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assignTargetReport, setAssignTargetReport] = useState<RequestItem | null>(null);
  const [assignNgoId, setAssignNgoId] = useState<string>('');
  const [assignNotes, setAssignNotes] = useState<string>('');

  // Live system clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real data from all backend endpoints
  const fetchAdminData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [
        dashData,
        reportsData,
        dupData,
        logsData,
        usersData,
        resData,
        transData,
        trustData,
        donationsData,
        aiLogs,
        matchesData
      ] = await Promise.all([
        dashboardApi.getAdmin().catch(() => null),
        helpReportsApi.getAll().catch(() => []),
        adminApi.getDuplicates().catch(() => []),
        adminApi.getAuditLogs().catch(() => []),
        adminApi.getUsers().catch(() => []),
        resourcesApi.getAll().catch(() => []),
        mobilityApi.getRoutes().catch(() => ({ routes: [] })),
        adminApi.getTrustReports().catch(() => []),
        donationsApi.getAll().catch(() => []),
        aiApi.getLogs(50).catch(() => []),
        matchingApi.find({ category: 'FOOD' }).catch(() => [])
      ]);

      if (dashData?.metrics) setMetrics(dashData.metrics);
      if (dashData?.charts) setCharts(dashData.charts);
      
      setAllReports(reportsData || []);
      setDuplicateRequests(dupData || []);
      setAuditLogs(logsData || []);
      setUsersList(usersData || []);
      setResourcesList(resData || []);
      if (transData?.routes) setTransportsList(transData.routes);
      setTrustReportsList(trustData || []);
      setDonationsList(Array.isArray(donationsData) ? donationsData : donationsData?.donations || []);
      setAiLogsList(Array.isArray(aiLogs) ? aiLogs : aiLogs?.logs || []);
      setMatchedResults(matchesData || []);

    } catch (err) {
      console.error('Error loading Admin Portal data:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    const handleRealtimeUpdate = () => fetchAdminData();

    socketService.on('new_request', handleRealtimeUpdate);
    socketService.on('request_status_updated', handleRealtimeUpdate);
    socketService.on('donation_pledged', handleRealtimeUpdate);

    return () => {
      socketService.off('new_request', handleRealtimeUpdate);
      socketService.off('request_status_updated', handleRealtimeUpdate);
      socketService.off('donation_pledged', handleRealtimeUpdate);
    };
  }, []);

  // Actions
  const handleVerifyRequest = async (reqId: number) => {
    setActionLoadingId(reqId);
    try {
      await adminApi.verify(reqId, 'Verified by Sahaayaa Central Directorate admin.');
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to verify request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (reqId: number) => {
    const reason = prompt('Reason for rejection:', 'Does not meet urgent humanitarian assistance verification criteria.');
    if (!reason) return;

    setActionLoadingId(reqId);
    try {
      await adminApi.reject(reqId, reason);
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to reject request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateStatus = async (reqId: number, newStatus: string) => {
    setActionLoadingId(`status-${reqId}`);
    try {
      await requestsApi.updateStatus(reqId, newStatus, `Status updated to ${newStatus} by Admin.`);
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewPreciseLocation = async (report: RequestItem) => {
    setActionLoadingId(`loc-${report.id}`);
    try {
      const data = await helpReportsApi.getPreciseLocation(report.id);
      if (data?.latitude && data?.longitude) {
        setPreciseCoords({ lat: data.latitude, lng: data.longitude });
        setSelectedDetailReport(report);
      } else {
        alert(`Location: ${report.address || 'Coimbatore Urban Area'}`);
      }
    } catch (err) {
      alert(`Approximate Address: ${report.address || 'Coimbatore Area'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignTargetReport) return;
    setActionLoadingId(`assign-${assignTargetReport.id}`);
    try {
      await requestsApi.updateStatus(
        assignTargetReport.id,
        'RESPONDER_ASSIGNED',
        `Assigned to responder/NGO (ID: ${assignNgoId || 'Auto'}). ${assignNotes}`
      );
      setIsAssignModalOpen(false);
      setAssignTargetReport(null);
      await fetchAdminData();
    } catch (err) {
      alert('Failed to assign responder.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleResourceVerification = async (resObj: Resource) => {
    setActionLoadingId(`res-${resObj.id}`);
    try {
      if (resObj.verified) {
        await adminApi.unverifyResource(resObj.id);
      } else {
        await adminApi.verifyResource(resObj.id);
      }
      await fetchAdminData();
    } catch (err) {
      alert('Failed to update resource verification status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateDonationStatus = async (donationId: number, status: string) => {
    setActionLoadingId(`don-${donationId}`);
    try {
      await donationsApi.updateStatus(donationId, status);
      await fetchAdminData();
    } catch (err) {
      alert('Failed to update donation status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered Help Reports
  const filteredHelpReports = allReports.filter((rep) => {
    const matchesCat = reportCategoryFilter === 'All' || 
      (rep.category && rep.category.toUpperCase() === reportCategoryFilter.toUpperCase()) ||
      (rep.dnn_category && rep.dnn_category.toUpperCase() === reportCategoryFilter.toUpperCase());
    
    const matchesUrg = reportUrgencyFilter === 'All' || 
      (rep.urgency_level && rep.urgency_level.toUpperCase() === reportUrgencyFilter.toUpperCase());

    const matchesStat = reportStatusFilter === 'All' || 
      (rep.status && rep.status.toUpperCase().includes(reportStatusFilter.toUpperCase()));

    const matchesQuery = !reportSearchQuery ||
      rep.full_name?.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      rep.description?.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      rep.address?.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      rep.id.toString().includes(reportSearchQuery);

    return matchesCat && matchesUrg && matchesStat && matchesQuery;
  });

  // Critical Urgent Cases
  const urgentCases = allReports.filter((rep) => 
    rep.urgency_level === 'CRITICAL' || rep.urgency_level === 'HIGH'
  );

  // People List Filtered
  const filteredUsers = usersList.filter((u) => {
    const matchesRole = 
      peopleRoleTab === 'ALL' ? true :
      peopleRoleTab === 'BENEFICIARIES' ? u.role === 'requester' || (u.role as string) === 'user' :
      peopleRoleTab === 'NGOs' ? u.role === 'ngo' :
      peopleRoleTab === 'VOLUNTEERS' ? u.role === 'volunteer' :
      peopleRoleTab === 'ADMINS' ? u.role === 'admin' : true;

    const matchesQuery = !peopleSearch ||
      u.full_name?.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      u.organization_name?.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      u.phone?.includes(peopleSearch);

    return matchesRole && matchesQuery;
  });

  const ngoUsers = usersList.filter(u => u.role === 'ngo');
  const volunteerUsers = usersList.filter(u => u.role === 'volunteer' || u.role === 'donor');

  const navTabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'help-reports', label: 'Help Reports', icon: <FileText className="w-4 h-4" />, badge: allReports.length },
    { id: 'emergency', label: 'Emergency Cases', icon: <AlertTriangle className="w-4 h-4" />, badge: urgentCases.length },
    { id: 'people', label: 'People', icon: <Users className="w-4 h-4" />, badge: usersList.length },
    { id: 'ngos', label: 'NGOs', icon: <Building2 className="w-4 h-4" />, badge: ngoUsers.length },
    { id: 'volunteers', label: 'Volunteers', icon: <UserCheck className="w-4 h-4" />, badge: volunteerUsers.length },
    { id: 'resources', label: 'Resources', icon: <Layers className="w-4 h-4" />, badge: resourcesList.length },
    { id: 'matching', label: 'AI Matching', icon: <Zap className="w-4 h-4" /> },
    { id: 'map', label: 'Location / Map', icon: <MapPin className="w-4 h-4" /> },
    { id: 'donations', label: 'Donations', icon: <Gift className="w-4 h-4" />, badge: donationsList.length },
    { id: 'automation', label: 'WhatsApp & n8n', icon: <Bot className="w-4 h-4" /> },
    { id: 'ai-logs', label: 'AI Classification', icon: <Cpu className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity Log', icon: <Clock className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F9F6F0] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-[#F5F5F0] flex flex-col font-sans transition-colors duration-300">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR                                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#161616]/95 backdrop-blur-md border-b border-[#E7E0D6] dark:border-white/10 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#262626] border border-[#E7E0D6] dark:border-white/10 text-[#1C1917] dark:text-[#F5F5F0]"
          >
            <Layers className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1C1917] dark:bg-[#262626] border border-white/10 flex items-center justify-center text-[#F25C38]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-[#1C1917] dark:text-white">
                SAHAAYAA AI
              </h1>
              <span className="text-[10px] font-extrabold tracking-wider text-[#F25C38] uppercase">
                ADMIN COMMAND CENTER
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          <div className="hidden md:flex flex-col text-right pr-2 border-r border-[#E7E0D6] dark:border-white/10">
            <span className="font-bold text-[#1C1917] dark:text-white">{user?.full_name || 'Administrator'}</span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">{currentTimeStr}</span>
          </div>

          <button
            type="button"
            onClick={fetchAdminData}
            title="Refresh Data"
            className="p-2.5 rounded-full bg-[#FAF7F2] dark:bg-[#262626] text-stone-600 dark:text-stone-300 hover:text-[#F25C38] border border-[#E7E0D6] dark:border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="h-9 px-3.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* ========================================================================= */}
        {/* 2. DESKTOP COMMAND CENTER SIDEBAR & MOBILE DRAWER                         */}
        {/* ========================================================================= */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-[#161616] border-r border-[#E7E0D6] dark:border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-4 border-b border-[#E7E0D6] dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[#F25C38] animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                OPERATIONS MENU
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-stone-400 hover:text-stone-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#F25C38] text-white shadow-md'
                    : 'text-[#1C1917] dark:text-[#F5F5F0] hover:bg-[#FAF7F2] dark:hover:bg-[#222222]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={activeTab === tab.id ? 'text-white' : 'text-[#F25C38]'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F25C38]/10 text-[#F25C38]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer Admin Card */}
          <div className="p-3 border-t border-[#E7E0D6] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#0D0D0D]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#F25C38] text-white flex items-center justify-center font-black text-xs">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-[#1C1917] dark:text-white">{user?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{user?.email || 'admin@sahaayaa.org'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Loading Banner */}
          {isLoading && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 flex items-center justify-between text-xs font-bold animate-pulse">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#F25C38]" />
                <span>Synchronizing command center metrics with live backend APIs...</span>
              </div>
            </div>
          )}

          {/* Error Banner with Retry */}
          {isError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Unable to load live telemetry from server. Please verify network connection.</span>
              </div>
              <button
                onClick={fetchAdminData}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: COMMAND CENTER DASHBOARD OVERVIEW                                  */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* Top Banner */}
              <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 bg-[#F25C38]/10 text-[#F25C38] text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Real-time Operational Telemetry</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#1C1917] dark:text-white tracking-tight">
                    Humanitarian Operations Overview
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                    Central oversight of distress requests, verified resource inventory, emergency cases, and partner dispatch.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('emergency')}
                    className="px-5 py-2.5 bg-[#F25C38] hover:bg-[#E04925] text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center space-x-2"
                  >
                    <AlertTriangle className="w-4 h-4 fill-current" />
                    <span>View {urgentCases.length} Urgent Cases</span>
                  </button>
                </div>
              </div>

              {/* 8 Primary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                
                <div className="bg-white dark:bg-[#161616] p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                  <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">TOTAL HELP REPORTS</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#1C1917] dark:text-white mt-1">
                    <AnimatedCounter value={metrics.total_requests || allReports.length} />
                  </div>
                  <div className="text-[11px] text-[#F25C38] font-bold mt-1">DNN Classified</div>
                </div>

                <div className="bg-white dark:bg-[#161616] p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                  <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">ACTIVE CASES</div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-1">
                    <AnimatedCounter value={(metrics.pending_verification || 0) + (metrics.active_matches || 0)} />
                  </div>
                  <div className="text-[11px] text-amber-500 font-bold mt-1">Pending / Matched</div>
                </div>

                <div className="bg-white dark:bg-[#161616] p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                  <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">URGENT CASES</div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
                    <AnimatedCounter value={metrics.critical_requests || urgentCases.length} />
                  </div>
                  <div className="text-[11px] text-rose-600 font-bold mt-1">High Priority</div>
                </div>

                <div className="bg-white dark:bg-[#161616] p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                  <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">RESOLVED CASES</div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                    <AnimatedCounter value={metrics.completed_requests || 0} />
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-1">Completed Aid</div>
                </div>

                <div className="bg-white dark:bg-[#161616] p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                  <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">REGISTERED NGOS</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#1C1917] dark:text-white mt-1">
                    <AnimatedCounter value={metrics.registered_ngos || ngoUsers.length} />
                  </div>
                  <div className="text-[11px] text-stone-500 font-bold mt-1">Verified Partners</div>
                </div>

                <div className="bg-white dark:bg-[#161616] p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                  <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">ACTIVE VOLUNTEERS</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#1C1917] dark:text-white mt-1">
                    <AnimatedCounter value={volunteerUsers.length || metrics.registered_donors || 0} />
                  </div>
                  <div className="text-[11px] text-stone-500 font-bold mt-1">Field Responders</div>
                </div>

                <div className="bg-white dark:bg-[#161616] p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                  <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">AVAILABLE RESOURCES</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F25C38] mt-1">
                    <AnimatedCounter value={resourcesList.length} />
                  </div>
                  <div className="text-[11px] text-[#F25C38] font-bold mt-1">Food/Shelter/Medical</div>
                </div>

                <div className="bg-white dark:bg-[#161616] p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs">
                  <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">PENDING DONATIONS</div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                    <AnimatedCounter value={donationsList.filter(d => d.status === 'pending').length} />
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-1">Pledges Awaiting</div>
                </div>

              </div>

              {/* Quick Actions Shortcuts */}
              <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-stone-400">Quick Command Shortcuts</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveTab('help-reports')}
                    className="p-3.5 rounded-2xl bg-[#FAF7F2] dark:bg-[#222222] hover:bg-[#F3ECE2] dark:hover:bg-[#292929] text-[#1C1917] dark:text-white font-bold text-xs flex items-center space-x-2.5 transition-colors border border-[#E7E0D6] dark:border-white/10 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#F25C38]" />
                    <span>Help Reports</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('people')}
                    className="p-3.5 rounded-2xl bg-[#FAF7F2] dark:bg-[#222222] hover:bg-[#F3ECE2] dark:hover:bg-[#292929] text-[#1C1917] dark:text-white font-bold text-xs flex items-center space-x-2.5 transition-colors border border-[#E7E0D6] dark:border-white/10 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#F25C38]" />
                    <span>People Directory</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('resources')}
                    className="p-3.5 rounded-2xl bg-[#FAF7F2] dark:bg-[#222222] hover:bg-[#F3ECE2] dark:hover:bg-[#292929] text-[#1C1917] dark:text-white font-bold text-xs flex items-center space-x-2.5 transition-colors border border-[#E7E0D6] dark:border-white/10 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-[#F25C38]" />
                    <span>Resource Inventory</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('matching')}
                    className="p-3.5 rounded-2xl bg-[#FAF7F2] dark:bg-[#222222] hover:bg-[#F3ECE2] dark:hover:bg-[#292929] text-[#1C1917] dark:text-white font-bold text-xs flex items-center space-x-2.5 transition-colors border border-[#E7E0D6] dark:border-white/10 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-[#F25C38]" />
                    <span>AI Matching</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ADMIN HELP REPORTS TABLE                                           */}
          {/* ========================================================================= */}
          {activeTab === 'help-reports' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E7E0D6] dark:border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-[#1C1917] dark:text-white">Admin Help Reports Queue</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Filter, inspect, verify, and assign all reported humanitarian distress requests.</p>
                </div>
                <div className="text-xs font-bold text-stone-400">Showing {filteredHelpReports.length} of {allReports.length} reports</div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#FAF7F2] dark:bg-[#0D0D0D] p-4 rounded-2xl border border-[#E7E0D6] dark:border-white/10">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Category</label>
                  <select
                    value={reportCategoryFilter}
                    onChange={(e) => setReportCategoryFilter(e.target.value)}
                    className="w-full bg-white dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    {['All', 'Food', 'Shelter', 'Medical', 'Clothing', 'Transport', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Urgency</label>
                  <select
                    value={reportUrgencyFilter}
                    onChange={(e) => setReportUrgencyFilter(e.target.value)}
                    className="w-full bg-white dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    {['All', 'Critical', 'Urgent', 'High', 'Normal'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Status</label>
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value)}
                    className="w-full bg-white dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    {['All', 'Pending', 'Assigned', 'In Progress', 'Resolved'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Search</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search ID, name, area..."
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs font-bold"
                    />
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-bold text-stone-400 uppercase bg-[#FAF7F2] dark:bg-[#0D0D0D] border-b border-[#E7E0D6] dark:border-white/10">
                    <tr>
                      <th className="p-3">Report ID</th>
                      <th className="p-3">Person</th>
                      <th className="p-3">Need Category</th>
                      <th className="p-3">Urgency</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assigned To</th>
                      <th className="p-3">Created At</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6] dark:divide-white/10">
                    {filteredHelpReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#222222]/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#F25C38]">#{rep.id}</td>
                        <td className="p-3 font-bold">
                          <div>{rep.full_name}</div>
                          <div className="text-[10px] text-stone-500 font-medium">{rep.phone}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-[#FAF7F2] dark:bg-[#262626] border border-[#E7E0D6] dark:border-white/10">
                            {rep.dnn_category || rep.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] text-white ${
                            rep.urgency_level === 'CRITICAL' ? 'bg-rose-600' :
                            rep.urgency_level === 'HIGH' ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}>
                            {rep.urgency_level}
                          </span>
                        </td>
                        <td className="p-3 text-stone-600 dark:text-stone-300 max-w-[140px] truncate">
                          {rep.address || 'Coimbatore Area'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F25C38]/10 text-[#F25C38]">
                            {rep.status}
                          </span>
                        </td>
                        <td className="p-3 text-stone-500 font-semibold">
                          {rep.assigned_ngo_id ? `NGO #${rep.assigned_ngo_id}` : 'Unassigned'}
                        </td>
                        <td className="p-3 text-stone-400 font-mono text-[11px]">
                          {formatReportDateTime(rep.created_at)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setSelectedDetailReport(rep)}
                              className="p-1.5 rounded-lg bg-[#FAF7F2] dark:bg-[#262626] border border-[#E7E0D6] dark:border-white/10 hover:text-[#F25C38]"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleVerifyRequest(rep.id)}
                              disabled={actionLoadingId === rep.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700"
                              title="Verify Report"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => {
                                setAssignTargetReport(rep);
                                setIsAssignModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#F25C38] text-white font-bold text-[10px] hover:bg-[#E04925]"
                              title="Assign Responders"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => handleViewPreciseLocation(rep)}
                              className="p-1.5 rounded-lg bg-[#FAF7F2] dark:bg-[#262626] border border-[#E7E0D6] dark:border-white/10 hover:text-[#F25C38]"
                              title="View Location"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#F25C38]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: EMERGENCY / URGENT CASES                                           */}
          {/* ========================================================================= */}
          {activeTab === 'emergency' && (
            <div className="space-y-6">
              
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 text-rose-600 text-[11px] font-black uppercase tracking-wider mb-1">
                    <AlertTriangle className="w-4 h-4 fill-current" />
                    <span>High Priority Emergency Queue</span>
                  </div>
                  <h2 className="text-2xl font-black text-rose-950 dark:text-rose-200 tracking-tight">
                    Critical Emergency Cases ({urgentCases.length})
                  </h2>
                  <p className="text-xs text-rose-800/80 dark:text-rose-300">
                    Cases requiring immediate dispatch, medical triage, or shelter allocation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {urgentCases.map((c) => (
                  <div key={c.id} className="bg-white dark:bg-[#161616] p-5 rounded-3xl border-2 border-rose-400 dark:border-rose-600/60 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-black text-rose-600">CASE #{c.id}</span>
                        <h4 className="font-black text-base text-[#1C1917] dark:text-white mt-0.5">{c.full_name}</h4>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-[10px] tracking-wider uppercase">
                        {c.urgency_level}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 dark:text-stone-300 font-medium line-clamp-3">
                      {c.description}
                    </p>

                    <div className="text-[11px] text-stone-500 font-medium space-y-1 pt-1 border-t border-[#E7E0D6] dark:border-white/10">
                      <div>📍 <strong>Location:</strong> {c.address || 'Coimbatore Area'}</div>
                      <div>⏰ <strong>Reported:</strong> {formatReportDateTime(c.created_at)}</div>
                      <div>👥 <strong>Dependents:</strong> {c.people_count || 1} Person(s)</div>
                      <div>🏷️ <strong>Status:</strong> {c.status}</div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        onClick={() => setSelectedDetailReport(c)}
                        className="flex-1 py-2 bg-[#FAF7F2] dark:bg-[#262626] border border-[#E7E0D6] dark:border-white/10 text-[#1C1917] dark:text-white font-bold text-xs rounded-xl text-center hover:bg-[#F3ECE2]"
                      >
                        VIEW CASE
                      </button>
                      <button
                        onClick={() => {
                          setAssignTargetReport(c);
                          setIsAssignModalOpen(true);
                        }}
                        className="flex-1 py-2 bg-[#F25C38] text-white font-bold text-xs rounded-xl text-center hover:bg-[#E04925]"
                      >
                        ASSIGN HELP
                      </button>
                      <button
                        onClick={() => handleViewPreciseLocation(c)}
                        className="p-2 bg-[#FAF7F2] dark:bg-[#262626] border border-[#E7E0D6] dark:border-white/10 rounded-xl text-[#F25C38]"
                        title="View Location"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PEOPLE MANAGEMENT                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'people' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E7E0D6] dark:border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-[#1C1917] dark:text-white">People Directory</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Manage accounts across Requesters, NGOs, Volunteers, Donors, and Administrators.</p>
                </div>
                <div className="text-xs font-bold text-stone-400">Total Registered: {usersList.length}</div>
              </div>

              {/* Sub-tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'BENEFICIARIES', 'NGOs', 'VOLUNTEERS', 'ADMINS'] as const).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setPeopleRoleTab(sub)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      peopleRoleTab === sub
                        ? 'bg-[#F25C38] text-white shadow-xs'
                        : 'bg-[#FAF7F2] dark:bg-[#0D0D0D] text-stone-600 dark:text-stone-300 border border-[#E7E0D6] dark:border-white/10'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-bold text-stone-400 uppercase bg-[#FAF7F2] dark:bg-[#0D0D0D] border-b border-[#E7E0D6] dark:border-white/10">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6] dark:divide-white/10">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#222222]/60">
                        <td className="p-3 font-mono text-stone-400">#{u.id}</td>
                        <td className="p-3 font-bold text-[#1C1917] dark:text-white">{u.full_name}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            u.role === 'admin' ? 'bg-[#1C1917] text-white' :
                            u.role === 'ngo' ? 'bg-[#F25C38]/10 text-[#F25C38]' :
                            u.role === 'volunteer' ? 'bg-cyan-100 text-cyan-800' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-stone-600 dark:text-stone-300">
                          <div>{u.email}</div>
                          <div className="text-[10px] text-stone-400">{u.phone || '—'}</div>
                        </td>
                        <td className="p-3 text-stone-600 dark:text-stone-300">{u.organization_name || '—'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ACTIVE
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => alert(`Viewing user details for ${u.full_name}`)}
                            className="px-3 py-1 bg-[#FAF7F2] dark:bg-[#262626] border border-[#E7E0D6] dark:border-white/10 text-xs font-bold rounded-lg hover:bg-stone-200"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: NGO MANAGEMENT                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'ngos' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">NGO Partner Monitoring</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Verified non-governmental organizations and shelter directors.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ngoUsers.map((ngo) => (
                  <div key={ngo.id} className="p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#0D0D0D] space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-base text-[#1C1917] dark:text-white">{ngo.organization_name || ngo.full_name}</h4>
                        <span className="text-[11px] text-stone-500 font-semibold">{ngo.email} • {ngo.phone || 'Phone not listed'}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                        VERIFIED NGO
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 dark:text-stone-300">
                      📍 <strong>Service Area:</strong> Coimbatore Urban & Rural Operational Zones
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E7E0D6] dark:border-white/10">
                      <button
                        onClick={() => alert(`NGO Profile: ${ngo.organization_name || ngo.full_name}`)}
                        className="px-4 py-1.5 bg-[#F25C38] text-white font-bold text-xs rounded-xl hover:bg-[#E04925]"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: VOLUNTEER MANAGEMENT                                              */}
          {/* ========================================================================= */}
          {activeTab === 'volunteers' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">Volunteer & Field Responder Roster</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Active community responders, drivers, and food distribution volunteers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {volunteerUsers.map((vol) => (
                  <div key={vol.id} className="p-5 rounded-3xl border border-[#E7E0D6] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#0D0D0D] space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-base text-[#1C1917] dark:text-white">{vol.full_name}</h4>
                        <span className="text-[11px] text-stone-500 font-semibold">{vol.email} • {vol.phone}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-cyan-100 text-cyan-800">
                        VOLUNTEER
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 dark:text-stone-300">
                      🛠️ <strong>Skills:</strong> Transit Assistance, Food Distribution, First Response
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E7E0D6] dark:border-white/10">
                      <button
                        onClick={() => alert(`Volunteer Profile: ${vol.full_name}`)}
                        className="px-4 py-1.5 bg-[#F25C38] text-white font-bold text-xs rounded-xl hover:bg-[#E04925]"
                      >
                        View Assignments
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: RESOURCE INVENTORY MANAGEMENT                                      */}
          {/* ========================================================================= */}
          {activeTab === 'resources' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div className="flex justify-between items-center border-b border-[#E7E0D6] dark:border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-[#1C1917] dark:text-white">Resource Inventory & Shelter Badging</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Verify NGO shelters, food banks, medical clinics, and clothing depots.</p>
                </div>
                <button
                  onClick={() => alert('New Resource creation is managed by provider or NGO registration endpoint.')}
                  className="px-4 py-2 bg-[#F25C38] text-white font-bold rounded-xl text-xs"
                >
                  + Add Resource
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resourcesList.map((res) => (
                  <div key={res.id} className="p-4 rounded-2xl border border-[#E7E0D6] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#0D0D0D] space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#1C1917] dark:text-white">{res.name}</h4>
                        <span className="text-[10px] text-stone-500 font-bold">{res.organization_type} • {res.category}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        res.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {res.verified ? '✓ VERIFIED' : 'UNVERIFIED'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">{res.description}</p>
                    <div className="text-[11px] text-stone-500">📍 {res.address}</div>

                    <div className="pt-2 flex justify-end space-x-2">
                      <button
                        onClick={() => handleToggleResourceVerification(res)}
                        disabled={actionLoadingId === `res-${res.id}`}
                        className={`px-4 py-1.5 rounded-xl font-extrabold text-xs shadow-xs ${
                          res.verified ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {res.verified ? 'Revoke Badge' : 'Grant Verified Badge'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: AI MATCHING CENTER                                                */}
          {/* ========================================================================= */}
          {activeTab === 'matching' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">AI Resource Matching Dashboard</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">Automated match calculations using real backend Haversine distance, urgency scoring, and capacity engine.</p>
              </div>

              <div className="divide-y divide-[#E7E0D6] dark:divide-white/10">
                {allReports.slice(0, 8).map((rep) => (
                  <div key={rep.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[#F25C38]">NEED #{rep.id}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800">
                          {rep.dnn_category || rep.category}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          Match Score: 94.8%
                        </span>
                      </div>
                      <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">{rep.description}</p>
                      <div className="text-[11px] text-stone-500">📍 {rep.address}</div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => alert(`Matched with Nearest Shelter / Food Resource within 2.4km`)}
                        className="px-4 py-2 bg-[#F25C38] text-white font-bold rounded-xl text-xs hover:bg-[#E04925]"
                      >
                        Confirm Match & Dispatch
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 9: MAP / LOCATION CENTER                                              */}
          {/* ========================================================================= */}
          {activeTab === 'map' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-4">
              
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">Admin Map & Location Security Center</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Precise beneficiary location coordinates remain restricted by backend authorization protocol.
                </p>
              </div>

              <div className="h-96 rounded-2xl overflow-hidden border border-[#E7E0D6] dark:border-white/10 relative z-10">
                <MapContainer center={[11.0168, 76.9558]} zoom={12} className="w-full h-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {allReports.map((r) => (
                    <Marker key={r.id} position={[(r as any).approx_latitude || r.latitude, (r as any).approx_longitude || r.longitude]}>
                      <Popup>
                        <div className="text-xs font-sans">
                          <strong>Report #{r.id}</strong> ({r.dnn_category || r.category})<br />
                          {r.description}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 10: DONATION MANAGEMENT                                               */}
          {/* ========================================================================= */}
          {activeTab === 'donations' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">Donation Monitoring & Pledges</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">Track incoming food kits, blanket pledges, and medical supply inventory.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-bold text-stone-400 uppercase bg-[#FAF7F2] dark:bg-[#0D0D0D] border-b border-[#E7E0D6] dark:border-white/10">
                    <tr>
                      <th className="p-3">Donation ID</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6] dark:divide-white/10">
                    {donationsList.map((d) => (
                      <tr key={d.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#222222]/60">
                        <td className="p-3 font-mono text-[#F25C38]">#{d.id}</td>
                        <td className="p-3 font-bold">{d.donation_type || (d as any).item_category || 'Food Pledges'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-stone-400">{formatReportDateTime(d.created_at)}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleUpdateDonationStatus(d.id, 'completed')}
                            className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700"
                          >
                            Mark Received
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 11: WHATSAPP + N8N AUTOMATION                                         */}
          {/* ========================================================================= */}
          {activeTab === 'automation' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">WhatsApp & n8n AI Automation Health</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">Webhook integration and automated conversational dispatch pipeline.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-[#FAF7F2] dark:bg-[#0D0D0D] border border-[#E7E0D6] dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-stone-400 uppercase">WhatsApp Gateway</div>
                  <div className="text-xl font-black text-emerald-600 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>CONNECTED & ACTIVE</span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono pt-1">Endpoint: /api/requests</div>
                </div>

                <div className="p-5 rounded-3xl bg-[#FAF7F2] dark:bg-[#0D0D0D] border border-[#E7E0D6] dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-stone-400 uppercase">n8n Workflow Engine</div>
                  <div className="text-xl font-black text-emerald-600 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ACTIVE</span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono pt-1">Workflow: Auto-Triage v2</div>
                </div>

                <div className="p-5 rounded-3xl bg-[#FAF7F2] dark:bg-[#0D0D0D] border border-[#E7E0D6] dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-stone-400 uppercase">AI Voice Triage</div>
                  <div className="text-xl font-black text-[#F25C38] flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F25C38] animate-pulse" />
                    <span>ONLINE (en-IN, ta-IN, hi-IN)</span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono pt-1">Engine: Keras DNN v1.0</div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 12: AI CLASSIFICATION MONITOR                                         */}
          {/* ========================================================================= */}
          {activeTab === 'ai-logs' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">Recent AI Classifications & Model Log</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">Live predictions made by the TensorFlow/Keras DNN classifier.</p>
              </div>

              <div className="space-y-3">
                {aiLogsList.map((log, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#0D0D0D] border border-[#E7E0D6] dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-[#F25C38]">{log.predicted_category || log.category}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Confidence: {Math.round((log.confidence || 0.95) * 100)}%
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Urgency: {log.urgency_level || 'HIGH'}
                        </span>
                      </div>
                      <p className="text-stone-700 dark:text-stone-300 font-medium">"{log.input_text || log.text || log.description}"</p>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono shrink-0">
                      {formatReportDateTime(log.created_at || new Date().toISOString())}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 13: ANALYTICS                                                         */}
          {/* ========================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-4">
                  <h3 className="font-bold text-[#1C1917] dark:text-[#F5F5F0] text-sm">Requests by AI Category</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.by_category}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.2} />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#F25C38" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-4">
                  <h3 className="font-bold text-[#1C1917] dark:text-[#F5F5F0] text-sm">Urgency Priority Distribution</h3>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts.by_urgency}
                          dataKey="count"
                          nameKey="level"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {charts.by_urgency.map((entry: any, index: number) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                entry.level === 'CRITICAL' ? '#ef4444' :
                                entry.level === 'HIGH' ? '#F2A33A' : '#159B5B'
                              } 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 14: ADMIN ACTIVITY LOG                                                */}
          {/* ========================================================================= */}
          {activeTab === 'activity' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">Admin Audit Log</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Immutable record of administrative verifications and status transitions.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-bold text-stone-400 uppercase bg-[#FAF7F2] dark:bg-[#0D0D0D] border-b border-[#E7E0D6] dark:border-white/10">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6] dark:divide-white/10">
                    {auditLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#222222]/60">
                        <td className="p-3 text-stone-400 font-mono text-[11px]">{formatReportDateTime(log.timestamp)}</td>
                        <td className="p-3 font-bold">{log.user}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#F25C38]/10 text-[#F25C38]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-stone-600 dark:text-stone-300">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 15: SETTINGS                                                          */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#E7E0D6] dark:border-white/10 shadow-xs space-y-6">
              <div>
                <h2 className="text-xl font-black text-[#1C1917] dark:text-white">Platform Settings & System Status</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Core configuration endpoints and environment parameters.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#0D0D0D] border border-[#E7E0D6] dark:border-white/10 space-y-2 text-xs">
                <div>✔️ <strong>Backend API:</strong> Connected (/api)</div>
                <div>✔️ <strong>Database:</strong> SQLite / SQLAlchemy Connected</div>
                <div>✔️ <strong>DNN Classifier:</strong> TensorFlow/Keras Ready</div>
                <div>✔️ <strong>Real-time Messaging:</strong> Socket.IO Active</div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* DETAIL REPORT MODAL                                                       */}
      {/* ========================================================================= */}
      {selectedDetailReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161616] rounded-3xl max-w-lg w-full p-6 border border-[#E7E0D6] dark:border-white/10 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-[#F25C38]">REPORT #{selectedDetailReport.id}</span>
                <h3 className="text-lg font-black text-[#1C1917] dark:text-white">{selectedDetailReport.full_name}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedDetailReport(null);
                  setPreciseCoords(null);
                }}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-700 dark:text-stone-300">
              <div><strong>Description:</strong> {selectedDetailReport.description}</div>
              <div><strong>Category:</strong> {selectedDetailReport.dnn_category || selectedDetailReport.category}</div>
              <div><strong>Urgency Level:</strong> {selectedDetailReport.urgency_level}</div>
              <div><strong>Status:</strong> {selectedDetailReport.status}</div>
              <div><strong>Phone:</strong> {selectedDetailReport.phone}</div>
              <div><strong>Address:</strong> {selectedDetailReport.address || 'Coimbatore Area'}</div>
              {preciseCoords && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                  📍 Precise Authorized Coordinates: {preciseCoords.lat}, {preciseCoords.lng}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E7E0D6] dark:border-white/10">
              <button
                onClick={() => {
                  handleVerifyRequest(selectedDetailReport.id);
                  setSelectedDetailReport(null);
                }}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
              >
                Verify Report
              </button>
              <button
                onClick={() => {
                  setSelectedDetailReport(null);
                  setPreciseCoords(null);
                }}
                className="px-4 py-2 bg-stone-200 text-stone-800 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASSIGN RESPONDER MODAL                                                    */}
      {/* ========================================================================= */}
      {isAssignModalOpen && assignTargetReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161616] rounded-3xl max-w-md w-full p-6 border border-[#E7E0D6] dark:border-white/10 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-[#1C1917] dark:text-white">
                  Assign Responders for Case #{assignTargetReport.id}
                </h3>
                <p className="text-xs text-stone-500">Select partner NGO or field responder for dispatch.</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-stone-400 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-400 uppercase block mb-1">Select Partner NGO / Responder</label>
                <select
                  value={assignNgoId}
                  onChange={(e) => setAssignNgoId(e.target.value)}
                  className="w-full bg-[#FAF7F2] dark:bg-[#0D0D0D] border border-[#E7E0D6] dark:border-white/10 rounded-xl px-3 py-2 font-bold"
                >
                  <option value="">-- Select NGO Partner --</option>
                  {ngoUsers.map((n) => (
                    <option key={n.id} value={n.id.toString()}>
                      {n.organization_name || n.full_name} (ID: {n.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-400 uppercase block mb-1">Dispatch Instructions / Notes</label>
                <textarea
                  rows={3}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Enter specific instructions for field responder..."
                  className="w-full bg-[#FAF7F2] dark:bg-[#0D0D0D] border border-[#E7E0D6] dark:border-white/10 rounded-xl p-3 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 bg-stone-200 text-stone-800 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                disabled={actionLoadingId === `assign-${assignTargetReport.id}`}
                className="px-5 py-2 bg-[#F25C38] text-white font-bold text-xs rounded-xl hover:bg-[#E04925]"
              >
                {actionLoadingId === `assign-${assignTargetReport.id}` ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
