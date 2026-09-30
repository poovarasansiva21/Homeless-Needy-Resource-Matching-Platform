import React, { useState, useEffect } from 'react';
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
  Ban
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
import { dashboardApi, adminApi, requestsApi, resourcesApi, mobilityApi, trustApi } from '../services/api';
import socketService from '../services/socket';
import { RequestItem, User, Resource, TransportInfoItem } from '../types';
import { formatReportDateTime } from '../utils/dateFormatter';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'queue' | 'duplicates' | 'resources' | 'transport' | 'reports' | 'audit' | 'users'
  >('overview');
  
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

  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [duplicateRequests, setDuplicateRequests] = useState<RequestItem[]>([]);
  const [resourcesList, setResourcesList] = useState<Resource[]>([]);
  const [transportsList, setTransportsList] = useState<TransportInfoItem[]>([]);
  const [trustReportsList, setTrustReportsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [dashData, allReqs, dupData, logsData, usersData, resData, transData, reportsData] = await Promise.all([
        dashboardApi.getAdmin(),
        requestsApi.getAll({ status: 'PENDING_VERIFICATION' }),
        adminApi.getDuplicates(),
        adminApi.getAuditLogs(),
        adminApi.getUsers(),
        resourcesApi.getAll(),
        mobilityApi.getRoutes(),
        adminApi.getTrustReports(),
      ]);

      setMetrics(dashData.metrics);
      setCharts(dashData.charts);
      setPendingRequests(allReqs);
      setDuplicateRequests(dupData);
      setAuditLogs(logsData);
      setUsersList(usersData);
      setResourcesList(resData);
      if (transData?.routes) setTransportsList(transData.routes);
      setTrustReportsList(reportsData || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
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

  const handleVerifyRequest = async (reqId: number) => {
    setActionLoadingId(reqId);
    try {
      await adminApi.verify(reqId, 'Verified by Central Directorate verification officer.');
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to verify request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (reqId: number) => {
    const reason = prompt('Please provide reason for rejection:', 'Does not meet urgent humanitarian assistance criteria.');
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
      console.error(err);
      alert('Failed to update resource verification badge.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateTransportStatus = async (tId: number, status: string) => {
    setActionLoadingId(`trans-${tId}`);
    try {
      await adminApi.updateTransportStatus(tId, status);
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to update transport trust status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveTrustReport = async (reportId: number, status: string) => {
    const notes = prompt('Enter resolution notes for safety record:', 'Investigated and resolved by safety officer.') || 'Resolved';
    setActionLoadingId(`report-${reportId}`);
    try {
      await adminApi.updateTrustReportStatus(reportId, status, notes);
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to update trust report.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0D0D0D] text-[#17231E] dark:text-[#F5F5F0] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-white/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-[#E8F3E9] dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full border border-[#159B5B]/20 dark:border-orange-500/40 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sahaayaa Central Directorate</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231E] dark:text-white tracking-tight">
              Platform Trust, Verification & Administration
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Verify NGO/Shelter/Food resources, manage transport trust, resolve safety reports, and inspect security audit logs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAdminData}
              className="p-2.5 text-stone-500 dark:text-stone-300 hover:text-[#17231E] dark:hover:text-white bg-[#FFF9ED] dark:bg-[#262626] rounded-xl hover:bg-[#F7EBD2] dark:hover:bg-[#292929] text-xs font-semibold flex items-center space-x-1.5 border border-[#EAE3D2] dark:border-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#EAE3D2] dark:border-white/10 pb-2">
          {[
            { id: 'overview', label: '📊 Overview & Charts' },
            { id: 'queue', label: `📋 Request Queue (${pendingRequests.length})` },
            { id: 'resources', label: `🏛️ Resource Verification (${resourcesList.length})` },
            { id: 'transport', label: `🚌 Transport Trust (${transportsList.length})` },
            { id: 'reports', label: `⚠️ Trust Reports (${trustReportsList.length})` },
            { id: 'duplicates', label: `⚠️ Duplicate Alerts (${duplicateRequests.length})` },
            { id: 'audit', label: `🔒 Audit Trail (${auditLogs.length})` },
            { id: 'users', label: `👥 User Directory (${usersList.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#159B5B] dark:bg-[#F25C38] text-white shadow-sm'
                  : 'bg-white dark:bg-[#161616] text-stone-600 dark:text-stone-300 hover:bg-[#FFF9ED] dark:hover:bg-[#262626] border border-[#EAE3D2] dark:border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Analytics */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-[#EAE3D2] dark:border-white/10 shadow-sm">
                <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Total Requests</div>
                <div className="text-3xl font-black text-[#17231E] dark:text-white mt-2">{metrics.total_requests}</div>
                <div className="text-[11px] text-[#159B5B] dark:text-orange-400 font-semibold mt-1">Processed through DNN</div>
              </div>

              <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-[#EAE3D2] dark:border-white/10 shadow-sm">
                <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Pending Review</div>
                <div className="text-3xl font-black text-[#F2A33A] dark:text-amber-400 mt-2">{metrics.pending_verification}</div>
                <div className="text-[11px] text-[#F2A33A] dark:text-amber-400 font-semibold mt-1">Awaiting admin action</div>
              </div>

              <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-[#EAE3D2] dark:border-white/10 shadow-sm">
                <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Verified Resources</div>
                <div className="text-3xl font-black text-[#159B5B] dark:text-orange-400 mt-2">
                  {resourcesList.filter(r => r.verified).length} / {resourcesList.length}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Badged NGO / Shelter / Food</div>
              </div>

              <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-[#EAE3D2] dark:border-white/10 shadow-sm">
                <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Trust Reports</div>
                <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  {trustReportsList.filter(r => r.status === 'PENDING').length}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Pending safety reviews</div>
              </div>
            </div>

            {/* Recharts Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Requests by Category */}
              <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
                <h3 className="font-bold text-[#17231E] dark:text-[#F5F5F0] text-sm">Requests by AI Category</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.by_category}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#24332D" opacity={0.4} />
                      <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#121C18', borderColor: '#24332D', color: '#FFF9ED', borderRadius: '12px' }} />
                      <Bar dataKey="count" fill="#159B5B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Urgency Priorities */}
              <div className="bg-white dark:bg-[#161616] p-6 rounded-3xl border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
                <h3 className="font-bold text-[#17231E] dark:text-[#F5F5F0] text-sm">Urgency Priority Distribution</h3>
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
                              entry.level === 'HIGH' ? '#F2A33A' :
                              entry.level === 'MEDIUM' ? '#eab308' : '#159B5B'
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#121C18', borderColor: '#24332D', color: '#FFF9ED', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Verification Queue */}
        {activeTab === 'queue' && (
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#F5F5F0]">Pending Request Verification Queue</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Every distress request must be verified before public exposure or volunteer dispatch.</p>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">No pending requests awaiting verification. All caught up!</p>
            ) : (
              <div className="divide-y divide-[#EAE3D2] dark:divide-[#24332D]">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[#17231E] dark:text-white">Request #{req.id}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F3E9] dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 border border-[#159B5B]/30 dark:border-orange-500/40">
                          {req.dnn_category || req.category} ({(req.dnn_confidence || 1) * 100}%)
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                          req.urgency_level === 'CRITICAL' ? 'bg-rose-500' :
                          req.urgency_level === 'HIGH' ? 'bg-[#F2A33A]' : 'bg-[#159B5B] dark:bg-emerald-600'
                        }`}>
                          {req.urgency_level}
                        </span>
                      </div>

                      <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80 font-medium">{req.description}</p>
                      
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        Submitted by: <strong className="text-[#17231E] dark:text-[#F5F5F0]">{req.full_name}</strong> ({req.phone}) • {req.address}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-2 border border-[#EAE3D2] dark:border-white/10 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 text-[#17231E] dark:text-[#F5F5F0] font-bold rounded-xl text-xs transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerifyRequest(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="px-5 py-2 bg-[#159B5B] hover:bg-[#12834D] dark:bg-[#F25C38] dark:hover:bg-[#d94e2b] text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                      >
                        {actionLoadingId === req.id ? 'Verifying...' : 'VERIFY REQUEST'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Resource Verification (NGO, SHELTER, FOOD) */}
        {activeTab === 'resources' && (
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#F5F5F0]">Resource Verification & Badging</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Grant or revoke official verification badges: ✓ VERIFIED NGO, ✓ VERIFIED SHELTER, ✓ VERIFIED FOOD RESOURCE.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resourcesList.map((res) => (
                <div key={res.id} className="p-4 rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-[#FFFDF3] dark:bg-[#0D0D0D] space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-[#18352D] dark:text-white">{res.name}</h4>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold">{res.organization_type} • {res.category}</span>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        res.verified
                          ? 'bg-emerald-100 dark:bg-orange-950/60 text-emerald-800 dark:text-orange-300 border-emerald-300 dark:border-orange-500/40'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300'
                      }`}
                    >
                      {res.verified ? `✓ ${(res as any).verification_badge || 'VERIFIED NGO'}` : 'UNVERIFIED'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">{res.description}</p>
                  
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 pt-1">
                    📞 {res.phone} • 📍 {res.address}
                  </div>

                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleToggleResourceVerification(res)}
                      disabled={actionLoadingId === `res-${res.id}`}
                      className={`px-4 py-1.5 rounded-xl font-extrabold text-xs shadow-sm transition-all ${
                        res.verified
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-[#F25C38] dark:hover:bg-[#d94e2b] text-white'
                      }`}
                    >
                      {actionLoadingId === `res-${res.id}`
                        ? 'Updating...'
                        : res.verified
                        ? 'Revoke Verification'
                        : 'Verify & Grant Badge'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Transport Trust */}
        {activeTab === 'transport' && (
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#F5F5F0]">Transport Mobility Trust Verification</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Manage verification status of municipal and volunteer transit routes: VERIFIED, NEEDS VERIFICATION, REPORTED.
              </p>
            </div>

            <div className="space-y-3">
              {transportsList.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-[#FFFDF3] dark:bg-[#0D0D0D] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-[#18352D] dark:text-white">{t.provider}</span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          t.status === 'VERIFIED'
                            ? 'bg-emerald-600 text-white'
                            : t.status === 'REPORTED'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-stone-600 dark:text-stone-400 font-bold">{t.route_name} • Fare: {t.fare_display}</div>
                    <div className="text-[10px] text-stone-500">{t.eligibility}</div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {['VERIFIED', 'NEEDS VERIFICATION', 'REPORTED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateTransportStatus(t.id, st)}
                        disabled={t.status === st || actionLoadingId === `trans-${t.id}`}
                        className={`px-3 py-1.5 rounded-xl font-black text-[10px] transition-all ${
                          t.status === st
                            ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 cursor-default'
                            : 'bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 hover:bg-stone-100 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Trust Reports Management */}
        {activeTab === 'reports' && (
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#F5F5F0]">Filed Trust & Safety Reports</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Reports filed by community users or anonymous reporters regarding resources, transport, or requests.</p>
            </div>

            {trustReportsList.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">No trust or safety reports filed.</p>
            ) : (
              <div className="space-y-3">
                {trustReportsList.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-2xl border border-rose-200 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-black text-rose-700 dark:text-rose-300 text-xs">
                          [{rep.report_type}] Report #{rep.id} • Target: {rep.target_title}
                        </span>
                        <span className="block text-[10px] text-stone-500 font-semibold">
                          Filed by: {rep.reporter} • {formatReportDateTime(rep.created_at)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          rep.status === 'RESOLVED'
                            ? 'bg-emerald-600 text-white'
                            : rep.status === 'INVESTIGATING'
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-[#161616] rounded-xl border border-rose-200 dark:border-rose-900/40 text-stone-800 dark:text-stone-200 font-medium">
                      <strong>Reason:</strong> {rep.reason}<br />
                      <strong>Details:</strong> {rep.details || 'No additional text provided.'}
                    </div>

                    {rep.resolution_notes && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                        ✓ Resolution Notes: {rep.resolution_notes}
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-1">
                      {['INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleResolveTrustReport(rep.id, st)}
                          disabled={rep.status === st || actionLoadingId === `report-${rep.id}`}
                          className="px-3 py-1.5 rounded-xl font-bold text-[10px] bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 hover:bg-stone-100 text-stone-800 dark:text-stone-200 shadow-sm"
                        >
                          Mark {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Duplicate Alerts */}
        {activeTab === 'duplicates' && (
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#F5F5F0]">Duplicate Request Alerts</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Flagged by heuristic analysis. Not auto-rejected.</p>
            </div>

            {duplicateRequests.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">No suspected duplicate requests detected in the recent window.</p>
            ) : (
              <div className="space-y-3">
                {duplicateRequests.map((d) => (
                  <div key={d.id} className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-[#17231E] dark:text-[#F5F5F0] text-xs">
                        Request #{d.id} • {d.full_name} ({d.phone})
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                        {d.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#17231E]/80 dark:text-[#F5F5F0]/80">{d.description}</p>
                    
                    <div className="p-3 bg-white dark:bg-[#161616] rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300 font-medium">
                      ⚠️ Duplicate Detector Flag: {d.duplicate_notes || 'Identical contact or similar text detected.'}
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => handleVerifyRequest(d.id)}
                        className="px-3.5 py-1.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                      >
                        Override & Verify
                      </button>
                      <button
                        onClick={() => handleRejectRequest(d.id)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                      >
                        Confirm Duplicate & Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#F5F5F0]">System Security & Action Audit Trail</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Immutable chronological record of logins, status transitions, verifications, and trust reports.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-stone-400 uppercase bg-[#FFF9ED] dark:bg-[#0D0D0D] border-b border-[#EAE3D2] dark:border-white/10">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE3D2] dark:divide-[#24332D]">
                  {auditLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-[#FFF9ED]/50 dark:hover:bg-[#262626]/50">
                      <td className="p-3 text-stone-500 dark:text-stone-400 font-mono text-[11px]">{formatReportDateTime(log.timestamp)}</td>
                      <td className="p-3 font-semibold text-[#17231E] dark:text-[#F5F5F0]">{log.user}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-[#E8F3E9] dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 border border-[#159B5B]/30 dark:border-orange-500/30">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-stone-600 dark:text-stone-300">{log.details}</td>
                      <td className="p-3 text-stone-400 font-mono text-[11px]">{log.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 8: Registered Users Directory */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#F5F5F0]">Platform User Directory</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">All registered Requesters, Donors, Volunteers, NGOs, and Staff members.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-stone-400 uppercase bg-[#FFF9ED] dark:bg-[#0D0D0D] border-b border-[#EAE3D2] dark:border-white/10">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Organization</th>
                    <th className="p-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE3D2] dark:divide-[#24332D]">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FFF9ED]/50 dark:hover:bg-[#262626]/50">
                      <td className="p-3 text-stone-400">#{u.id}</td>
                      <td className="p-3 font-bold text-[#17231E] dark:text-white">{u.full_name}</td>
                      <td className="p-3 text-stone-600 dark:text-stone-300">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          u.role === 'admin' ? 'bg-[#17231E] text-white dark:bg-[#262626] dark:text-white' :
                          u.role === 'ngo' ? 'bg-[#E8F3E9] dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 border border-[#159B5B]/30 dark:border-orange-500/30' :
                          u.role === 'volunteer' ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300' :
                          u.role === 'donor' ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' : 'bg-[#FFF9ED] dark:bg-[#0D0D0D] text-[#17231E] dark:text-[#F5F5F0] border border-[#EAE3D2] dark:border-white/10'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-stone-600 dark:text-stone-300">{u.organization_name || '—'}</td>
                      <td className="p-3 text-stone-500 dark:text-stone-400">{u.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
