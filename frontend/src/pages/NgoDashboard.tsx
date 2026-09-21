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
  Sparkles
} from 'lucide-react';
import { dashboardApi, requestsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';
import { RequestItem, Resource, RequestStatus } from '../types';

export const NgoDashboard: React.FC = () => {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState<any>({
    verified_incoming_count: 0,
    critical_cases_count: 0,
    assigned_active_count: 0,
    completed_count: 0,
  });

  const [incomingRequests, setIncomingRequests] = useState<RequestItem[]>([]);
  const [criticalCases, setCriticalCases] = useState<RequestItem[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<RequestItem[]>([]);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchNgoData = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardApi.getNgo();
      setMetrics(data.metrics);
      setIncomingRequests(data.incoming_verified);
      setCriticalCases(data.critical_cases);
      setAssignedRequests(data.assigned_requests);
      setAvailableResources(data.available_resources);
    } catch (err) {
      console.error('Error loading NGO dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoData();

    // Socket.IO real-time event sync
    const handleRefresh = () => fetchNgoData();

    socketService.on('new_request', handleRefresh);
    socketService.on('request_status_updated', handleRefresh);
    socketService.on('donation_pledged', handleRefresh);

    return () => {
      socketService.off('new_request', handleRefresh);
      socketService.off('request_status_updated', handleRefresh);
      socketService.off('donation_pledged', handleRefresh);
    };
  }, []);

  const handleAcceptRequest = async (reqId: number) => {
    setActionLoadingId(reqId);
    try {
      await requestsApi.accept(reqId);
      await fetchNgoData();
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

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-[#159B5B]/20 dark:border-[#159B5B]/30 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>NGO Operations & Case Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231E] dark:text-white tracking-tight">
              {user?.organization_name || 'Aravind Relief Mission'} Desk
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Live intake, field dispatch coordination, and relief delivery tracking across Coimbatore.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 font-bold px-3 py-1.5 rounded-full border border-[#159B5B]/30">
              ● Live Sync Active
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Incoming Verified</div>
            <div className="text-3xl font-black text-[#17231E] dark:text-white mt-2">{metrics.verified_incoming_count}</div>
            <div className="text-[11px] text-[#159B5B] dark:text-emerald-400 font-semibold mt-1">Awaiting organization pickup</div>
          </div>

          <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Critical Priority</div>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">{metrics.critical_cases_count}</div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">Immediate action needed</div>
          </div>

          <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">My Active Cases</div>
            <div className="text-3xl font-black text-[#F2A33A] dark:text-amber-400 mt-2">{metrics.assigned_active_count}</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Currently in progress</div>
          </div>

          <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Successfully Completed</div>
            <div className="text-3xl font-black text-[#159B5B] dark:text-emerald-400 mt-2">{metrics.completed_count}</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Confirmed handovers</div>
          </div>
        </div>

        {/* Critical Cases Spotlight if any */}
        {criticalCases.length > 0 && (
          <div className="bg-rose-50/70 dark:bg-rose-950/40 rounded-3xl p-6 border border-rose-200 dark:border-rose-900/60 space-y-4">
            <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h2 className="font-extrabold text-base">Critical Emergency Escalations Requiring Immediate Action</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criticalCases.map((req) => (
                <div key={req.id} className="bg-white dark:bg-[#121C18] p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                      CRITICAL • {req.dnn_category || req.category}
                    </span>
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Request #{req.id}</span>
                  </div>

                  <p className="text-xs text-[#17231E] dark:text-[#FFF9ED] font-medium leading-relaxed">
                    {req.description}
                  </p>

                  <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between pt-2 border-t border-[#EAE3D2] dark:border-[#24332D]">
                    <span>{req.address} • {req.phone}</span>
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                    >
                      {actionLoadingId === req.id ? 'Accepting...' : 'ACCEPT CASE'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Cases Active Pipeline */}
        <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#FFF9ED]">Cases Assigned To Our Organization</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Advance case along the status pipeline: Accepted → In Progress → Delivered → Completed</p>
            </div>
            <span className="text-xs bg-[#E8F3E9] dark:bg-[#159B5B]/20 font-bold px-3 py-1 rounded-full text-[#159B5B] dark:text-emerald-400 border border-[#159B5B]/30">
              {assignedRequests.length} Cases
            </span>
          </div>

          {assignedRequests.length === 0 ? (
            <p className="text-xs text-stone-400 dark:text-stone-500 py-6 text-center">No active cases assigned yet. Accept an incoming request below.</p>
          ) : (
            <div className="divide-y divide-[#EAE3D2] dark:divide-[#24332D]">
              {assignedRequests.map((req) => (
                <div key={req.id} className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-[#17231E] dark:text-white">Request #{req.id}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 uppercase border border-[#159B5B]/30">
                          {req.dnn_category || req.category}
                        </span>
                        <span className="text-xs font-semibold text-[#159B5B] dark:text-emerald-400">
                          Current: {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 mt-1">{req.description}</p>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                        Contact: {req.full_name} ({req.phone}) • {req.address}
                      </div>
                    </div>

                    {/* Status Pipeline Transition Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
                      {req.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'IN_PROGRESS', 'Relief team dispatched to location')}
                          disabled={actionLoadingId === req.id}
                          className="px-3.5 py-1.5 bg-[#F2A33A] hover:bg-[#d98b25] text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-sm transition-all"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch (In Progress)</span>
                        </button>
                      )}

                      {req.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'DELIVERED', 'Supplies directly handed over to beneficiary')}
                          disabled={actionLoadingId === req.id}
                          className="px-3.5 py-1.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-sm transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mark Delivered</span>
                        </button>
                      )}

                      {req.status === 'DELIVERED' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'COMPLETED', 'Case resolved and verified by NGO coordinator')}
                          disabled={actionLoadingId === req.id}
                          className="px-3.5 py-1.5 bg-[#17231E] dark:bg-[#1A2621] hover:bg-black dark:hover:bg-[#22332C] text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-sm transition-all"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      )}

                      {req.status === 'COMPLETED' && (
                        <span className="text-xs font-bold text-[#159B5B] dark:text-emerald-400 bg-[#E8F3E9] dark:bg-[#159B5B]/20 px-2.5 py-1 rounded-xl border border-[#159B5B]/30">
                          ✓ Case Fully Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Verified Requests Pool */}
        <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#17231E] dark:text-[#FFF9ED]">Incoming Verified Requests Pool</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">Verified by Admin coordination team. Click Accept to dispatch your NGO volunteers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomingRequests.map((req) => (
              <div key={req.id} className="p-4 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-[#FFF9ED]/40 dark:bg-[#0C1410]/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 border border-[#159B5B]/30">
                      {req.dnn_category || req.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                      req.urgency_level === 'CRITICAL' ? 'bg-rose-500' :
                      req.urgency_level === 'HIGH' ? 'bg-[#F2A33A]' : 'bg-[#159B5B]'
                    }`}>
                      {req.urgency_level}
                    </span>
                  </div>

                  <p className="text-xs text-[#17231E] dark:text-[#FFF9ED] font-medium mt-2 line-clamp-3">
                    {req.description}
                  </p>

                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-2">
                    <div>{req.people_count} people affected</div>
                    <div className="truncate">{req.address}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleAcceptRequest(req.id)}
                  disabled={actionLoadingId === req.id}
                  className="w-full py-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  {actionLoadingId === req.id ? 'Accepting...' : 'ACCEPT REQUEST'}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default NgoDashboard;
