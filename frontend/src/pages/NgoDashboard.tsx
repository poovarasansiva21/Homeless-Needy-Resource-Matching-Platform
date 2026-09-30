import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Users, 
  ArrowRight, 
  MapPin, 
  Phone, 
  Send,
  Truck,
  CheckCheck,
  ShieldAlert,
  Sparkles,
  Bus,
  RefreshCw,
  History,
  Activity,
  UserCheck,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { dashboardApi, requestsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';
import { RequestItem, Resource, RequestStatus } from '../types';
import { CaseHistoryTimeline } from '../components/CaseHistoryTimeline';
import { DonationInventoryPanel } from '../components/DonationInventoryPanel';

export const NgoDashboard: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'NEW' | 'CRITICAL' | 'NEARBY' | 'TRANSPORT' | 'ACTIVE' | 'COMPLETED' | 'INVENTORY'>('NEW');

  const [metrics, setMetrics] = useState<any>({
    new_requests_count: 0,
    critical_cases_count: 0,
    nearby_requests_count: 0,
    transport_requests_count: 0,
    active_cases_count: 0,
    completed_cases_count: 0
  });

  const [newRequests, setNewRequests] = useState<RequestItem[]>([]);
  const [criticalCases, setCriticalCases] = useState<RequestItem[]>([]);
  const [nearbyRequests, setNearbyRequests] = useState<RequestItem[]>([]);
  const [transportRequests, setTransportRequests] = useState<RequestItem[]>([]);
  const [activeCases, setActiveCases] = useState<RequestItem[]>([]);
  const [completedCases, setCompletedCases] = useState<RequestItem[]>([]);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  
  // Real-time toast alert state
  const [socketToast, setSocketToast] = useState<{ title: string; message: string } | null>(null);
  const [historyModalReqId, setHistoryModalReqId] = useState<number | null>(null);

  const fetchNgoData = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardApi.getNgo();
      setMetrics(data.metrics || {});
      setNewRequests(data.new_requests || []);
      setCriticalCases(data.critical_cases || []);
      setNearbyRequests(data.nearby_requests || []);
      setTransportRequests(data.transport_requests || []);
      setActiveCases(data.active_cases || []);
      setCompletedCases(data.completed_cases || []);
      setAvailableResources(data.available_resources || []);
    } catch (err) {
      console.error('Error loading NGO dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoData();

    // Socket.IO real-time event handlers
    const handleRefresh = () => fetchNgoData();

    const handleNewRequest = (data: any) => {
      setSocketToast({
        title: "🚨 New Critical Request Nearby",
        message: data.message || `New ${data.category || 'humanitarian'} request registered in Coimbatore.`
      });
      fetchNgoData();
      setTimeout(() => setSocketToast(null), 5000);
    };

    const handleStatusUpdated = (data: any) => {
      setSocketToast({
        title: `Request #${data.request_id} Updated`,
        message: `Status: ${data.new_status} by ${data.changed_by || 'System'}`
      });
      fetchNgoData();
      setTimeout(() => setSocketToast(null), 5000);
    };

    socketService.on('new_request', handleNewRequest);
    socketService.on('request_status_updated', handleStatusUpdated);
    socketService.on('request_escalated', handleNewRequest);

    return () => {
      socketService.off('new_request', handleNewRequest);
      socketService.off('request_status_updated', handleStatusUpdated);
      socketService.off('request_escalated', handleNewRequest);
    };
  }, []);

  const handleAcceptRequest = async (reqId: number) => {
    setActionLoadingId(reqId);
    try {
      await requestsApi.accept(reqId);
      await fetchNgoData();
      setSocketToast({
        title: "Case Accepted",
        message: "Your request has been accepted."
      });
      setTimeout(() => setSocketToast(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to accept request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateStatus = async (reqId: number, nextStatus: RequestStatus, notes?: string) => {
    setActionLoadingId(reqId);
    try {
      await requestsApi.updateStatus(reqId, nextStatus, notes);
      await fetchNgoData();
    } catch (err) {
      console.error(err);
      alert(`Failed to update status to ${nextStatus}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTriggerEscalation = async () => {
    try {
      const res = await requestsApi.triggerEscalation(30);
      alert(`Escalation check complete: ${res.escalated_count} stale requests re-routed.`);
      await fetchNgoData();
    } catch (e) {
      console.error("Escalation trigger error:", e);
    }
  };

  const getActiveTabList = () => {
    switch (activeTab) {
      case 'NEW': return newRequests;
      case 'CRITICAL': return criticalCases;
      case 'NEARBY': return nearbyRequests;
      case 'TRANSPORT': return transportRequests;
      case 'ACTIVE': return activeCases;
      case 'COMPLETED': return completedCases;
      default: return newRequests;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0D0D0D] text-[#17231E] dark:text-[#F5F5F0] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Real-time Socket.IO Toast Banner */}
        {socketToast && (
          <div className="fixed top-20 right-5 z-50 bg-slate-900 text-white p-4 rounded-2xl border border-emerald-500/40 shadow-2xl flex items-center gap-3 animate-slide-in">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-emerald-300">{socketToast.title}</div>
              <div className="text-xs text-slate-200">{socketToast.message}</div>
            </div>
          </div>
        )}

        {/* NGO Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#EAE3D2] dark:border-white/10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#159B5B]">
              <Building2 className="w-4 h-4" />
              <span>Phase 4 Humanitarian Rescue Chain</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#17231E] dark:text-white mt-1">
              {user?.organization_name || 'NGO Relief Operations Center'}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
              Real-time dispatch, field responder tracking, and auditable case history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerEscalation}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30 transition-all flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" /> Run Escalation Check
            </button>
            <button
              onClick={fetchNgoData}
              className="px-4 py-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* SECTION METRICS COUNTER GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { id: 'NEW', label: 'New Requests', count: metrics.new_requests_count || newRequests.length, icon: '📥', color: 'border-blue-500/30 text-blue-500' },
            { id: 'CRITICAL', label: 'Critical Requests', count: metrics.critical_cases_count || criticalCases.length, icon: '🚨', color: 'border-rose-500/30 text-rose-500' },
            { id: 'NEARBY', label: 'Nearby Requests', count: metrics.nearby_requests_count || nearbyRequests.length, icon: '📍', color: 'border-emerald-500/30 text-emerald-500' },
            { id: 'TRANSPORT', label: 'Transport Requests', count: metrics.transport_requests_count || transportRequests.length, icon: '🚌', color: 'border-amber-500/30 text-amber-500' },
            { id: 'ACTIVE', label: 'Active Cases', count: metrics.active_cases_count || activeCases.length, icon: '⚡', color: 'border-indigo-500/30 text-indigo-500' },
            { id: 'COMPLETED', label: 'Completed Cases', count: metrics.completed_cases_count || completedCases.length, icon: '✅', color: 'border-emerald-500/30 text-emerald-400' },
            { id: 'INVENTORY', label: 'Stock & Reallocation', count: '📦', icon: '📦', color: 'border-indigo-500/30 text-indigo-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#161616] border-[#159B5B] shadow-md scale-105'
                  : 'bg-white/60 dark:bg-[#161616]/60 border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{tab.icon}</span>
                <span className={`text-xl font-black ${tab.color.split(' ')[1]}`}>{tab.count}</span>
              </div>
              <div className="text-[11px] font-bold text-[#17231E] dark:text-[#F5F5F0] mt-2 line-clamp-1">{tab.label}</div>
            </button>
          ))}
        </div>

        {activeTab === 'INVENTORY' ? (
          <DonationInventoryPanel />
        ) : (
          /* TAB LIST CONTENT */
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D2] dark:border-white/10">
              <div>
                <h3 className="font-black text-xl text-[#17231E] dark:text-white uppercase tracking-tight">
                  {activeTab.replace('_', ' ')} CASE DIRECTORY
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  End-to-end assistance pipeline progression with privacy masking.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-600 dark:text-stone-300">
              Showing {getActiveTabList().length} Cases
            </span>
          </div>

          {getActiveTabList().length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-sm">
              No cases listed under {activeTab} section currently.
            </div>
          ) : (
            <div className="space-y-4">
              {getActiveTabList().map((req) => (
                <div 
                  key={req.id}
                  className="p-5 rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-[#FFF9ED]/30 dark:bg-[#0D0D0D]/40 space-y-4 hover:border-[#159B5B] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black px-3 py-1 rounded-full border ${getUrgencyBadge(req.urgency_level)}`}>
                        {req.urgency_level} PRIORITY
                      </span>
                      <span className="text-xs font-bold text-slate-400 font-mono">#{req.id}</span>
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHistoryModalReqId(req.id)}
                        className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5 text-amber-400" /> Case History
                      </button>
                    </div>
                  </div>

                  {/* Requester & Description */}
                  <div>
                    <div className="font-extrabold text-base text-[#17231E] dark:text-white flex items-center gap-2">
                      <span>{req.full_name}</span>
                      <span className="text-xs font-normal text-stone-400">({req.people_count} people affected)</span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                      {req.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-stone-100/60 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                    <div>
                      <span className="text-stone-400 font-bold block">Location:</span>
                      <span className="font-medium text-[#17231E] dark:text-stone-200">📍 {req.address}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-bold block">Contact Phone:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{req.phone}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-bold block">AI Category:</span>
                      <span className="font-bold text-[#159B5B] uppercase">{req.dnn_category || req.category}</span>
                    </div>
                  </div>

                  {/* State Progression Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
                    {req.status !== 'NGO_ACCEPTED' && req.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-2 bg-gradient-to-r from-[#159B5B] to-[#12834D] text-white font-bold text-xs rounded-xl shadow-sm hover:scale-105 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Accept Case
                      </button>
                    )}

                    {req.status === 'NGO_ACCEPTED' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'RESPONDER_ASSIGNED', 'Assigned field volunteer unit')}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assign Responder
                      </button>
                    )}

                    {req.status === 'RESPONDER_ASSIGNED' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'ON_THE_WAY', 'Field responder departed with relief vehicle')}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" /> Dispatch / On The Way
                      </button>
                    )}

                    {req.status === 'ON_THE_WAY' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'ASSISTANCE_PROVIDED', 'Relief food/shelter delivered at location')}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark Assistance Provided
                      </button>
                    )}

                    {req.status === 'ASSISTANCE_PROVIDED' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'COMPLETED', 'Case verified and completed')}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Finalize & Complete Case
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Case History Timeline Drawer / Modal */}
        {historyModalReqId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base">Request #{historyModalReqId} Timeline</h3>
                <button
                  onClick={() => setHistoryModalReqId(null)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300"
                >
                  Close
                </button>
              </div>

              <CaseHistoryTimeline requestId={historyModalReqId} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NgoDashboard;
