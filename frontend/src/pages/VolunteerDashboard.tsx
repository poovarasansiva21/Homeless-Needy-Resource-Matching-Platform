import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Truck, 
  CheckCheck, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  RefreshCw,
  History,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { dashboardApi, requestsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';
import { RequestItem, RequestStatus } from '../types';
import { CaseHistoryTimeline } from '../components/CaseHistoryTimeline';

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [authorizedTasks, setAuthorizedTasks] = useState<RequestItem[]>([]);
  const [completedTasks, setCompletedTasks] = useState<RequestItem[]>([]);
  const [metrics, setMetrics] = useState<any>({ authorized_tasks_count: 0, completed_tasks_count: 0 });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [historyModalReqId, setHistoryModalReqId] = useState<number | null>(null);

  const fetchVolunteerData = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardApi.getVolunteer();
      setMetrics(data.metrics || {});
      setAuthorizedTasks(data.authorized_tasks || []);
      setCompletedTasks(data.completed_tasks || []);
    } catch (err) {
      console.error('Error loading Volunteer dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteerData();

    const handleRefresh = () => fetchVolunteerData();
    socketService.on('request_status_updated', handleRefresh);
    socketService.on('new_transport_assistance_request', handleRefresh);

    return () => {
      socketService.off('request_status_updated', handleRefresh);
      socketService.off('new_transport_assistance_request', handleRefresh);
    };
  }, []);

  const handleUpdateStatus = async (reqId: number, nextStatus: RequestStatus, notes?: string) => {
    setActionLoadingId(reqId);
    try {
      await requestsApi.updateStatus(reqId, nextStatus, notes);
      await fetchVolunteerData();
    } catch (err) {
      console.error(err);
      alert(`Failed to update status to ${nextStatus}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0D0D0D] text-[#17231E] dark:text-[#F5F5F0] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#EAE3D2] dark:border-white/10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
              <span>Authorized Field Responder Center</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#17231E] dark:text-white mt-1">
              Volunteer Responder Console
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
              Only authorized tasks are displayed. Maintain privacy compliance during field dispatches.
            </p>
          </div>

          <button
            onClick={fetchVolunteerData}
            className="px-4 py-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Tasks
          </button>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#161616] border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 block">Authorized Field Tasks</span>
              <span className="text-3xl font-black text-amber-500">{metrics.authorized_tasks_count || authorizedTasks.length}</span>
            </div>
            <UserCheck className="w-10 h-10 text-amber-400/80" />
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#161616] border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 block">Completed Relief Dispatches</span>
              <span className="text-3xl font-black text-emerald-500">{metrics.completed_tasks_count || completedTasks.length}</span>
            </div>
            <CheckCheck className="w-10 h-10 text-emerald-400/80" />
          </div>
        </div>

        {/* Authorized Field Tasks Section */}
        <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D2] dark:border-white/10">
            <h3 className="font-black text-lg text-[#17231E] dark:text-white uppercase tracking-tight">
              🛡️ Authorized Active Field Tasks
            </h3>
            <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
              Privacy Masking Active
            </span>
          </div>

          {authorizedTasks.length === 0 ? (
            <div className="p-10 text-center text-stone-400 text-xs font-medium">
              No pending authorized field tasks assigned currently.
            </div>
          ) : (
            <div className="space-y-4">
              {authorizedTasks.map((task) => (
                <div 
                  key={task.id}
                  className="p-5 rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-[#FFF9ED]/30 dark:bg-[#0D0D0D]/40 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                        {task.urgency_level} PRIORITY
                      </span>
                      <span className="text-xs font-bold text-slate-400 font-mono">#{task.id}</span>
                    </div>

                    <button
                      onClick={() => setHistoryModalReqId(task.id)}
                      className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 flex items-center gap-1"
                    >
                      <History className="w-3.5 h-3.5 text-amber-400" /> Case History
                    </button>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-[#17231E] dark:text-white">
                      {task.dnn_category || task.category} Support • {task.full_name}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-stone-100/60 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                    <div>
                      <span className="text-stone-400 font-bold block">Pickup/Destination Location:</span>
                      <span className="font-medium text-[#17231E] dark:text-stone-200">📍 {task.address}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-bold block">Contact Phone:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{task.phone}</span>
                    </div>
                  </div>

                  {/* Volunteer Field Progression Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EAE3D2] dark:border-white/10">
                    {task.status !== 'ON_THE_WAY' && task.status !== 'ASSISTANCE_PROVIDED' && task.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'ON_THE_WAY', 'Volunteer departed to location')}
                        disabled={actionLoadingId === task.id}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" /> Start Trip (On The Way)
                      </button>
                    )}

                    {task.status === 'ON_THE_WAY' && (
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'ASSISTANCE_PROVIDED', 'Relief assistance delivered at site')}
                        disabled={actionLoadingId === task.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark Assistance Provided
                      </button>
                    )}

                    {task.status === 'ASSISTANCE_PROVIDED' && (
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'COMPLETED', 'Volunteer verified case completion')}
                        disabled={actionLoadingId === task.id}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Complete Field Mission
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

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

export default VolunteerDashboard;
