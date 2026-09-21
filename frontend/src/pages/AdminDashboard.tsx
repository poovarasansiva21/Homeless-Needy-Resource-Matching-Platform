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
  Search
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
import { dashboardApi, adminApi, requestsApi } from '../services/api';
import socketService from '../services/socket';
import { RequestItem, User } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'duplicates' | 'audit' | 'users'>('overview');
  
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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [dashData, allReqs, dupData, logsData, usersData] = await Promise.all([
        dashboardApi.getAdmin(),
        requestsApi.getAll({ status: 'PENDING_VERIFICATION' }),
        adminApi.getDuplicates(),
        adminApi.getAuditLogs(),
        adminApi.getUsers(),
      ]);

      setMetrics(dashData.metrics);
      setCharts(dashData.charts);
      setPendingRequests(allReqs);
      setDuplicateRequests(dupData);
      setAuditLogs(logsData);
      setUsersList(usersData);
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

  const handleVerify = async (reqId: number) => {
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

  const handleReject = async (reqId: number) => {
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

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-[#159B5B]/20 dark:border-[#159B5B]/30 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sahaayaa Central Directorate</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231E] dark:text-white tracking-tight">
              Platform Administration & Verification Hub
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Verify incoming cases, inspect duplicate alerts, monitor DNN performance, and view system audit logs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAdminData}
              className="p-2.5 text-stone-500 dark:text-stone-300 hover:text-[#17231E] dark:hover:text-white bg-[#FFF9ED] dark:bg-[#1A2621] rounded-xl hover:bg-[#F7EBD2] dark:hover:bg-[#22332C] text-xs font-semibold flex items-center space-x-1.5 border border-[#EAE3D2] dark:border-[#24332D] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#EAE3D2] dark:border-[#24332D] pb-2">
          {[
            { id: 'overview', label: '📊 Overview & Charts' },
            { id: 'queue', label: `📋 Verification Queue (${pendingRequests.length})` },
            { id: 'duplicates', label: `⚠️ Duplicate Alerts (${duplicateRequests.length})` },
            { id: 'audit', label: `🔒 Audit Trail (${auditLogs.length})` },
            { id: 'users', label: `👥 User Directory (${usersList.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#159B5B] dark:bg-[#159B5B] text-white shadow-sm'
                  : 'bg-white dark:bg-[#121C18] text-stone-600 dark:text-stone-300 hover:bg-[#FFF9ED] dark:hover:bg-[#1A2621] border border-[#EAE3D2] dark:border-[#24332D]'
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
              <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
                <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Total Requests</div>
                <div className="text-3xl font-black text-[#17231E] dark:text-white mt-2">{metrics.total_requests}</div>
                <div className="text-[11px] text-[#159B5B] dark:text-emerald-400 font-semibold mt-1">Processed through DNN</div>
              </div>

              <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
                <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Pending Review</div>
                <div className="text-3xl font-black text-[#F2A33A] dark:text-amber-400 mt-2">{metrics.pending_verification}</div>
                <div className="text-[11px] text-[#F2A33A] dark:text-amber-400 font-semibold mt-1">Awaiting admin action</div>
              </div>

              <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
                <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Verified Requests</div>
                <div className="text-3xl font-black text-[#159B5B] dark:text-emerald-400 mt-2">{metrics.verified_requests}</div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Ready for fulfillment</div>
              </div>

              <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
                <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Fulfillment Rate</div>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">{metrics.fulfillment_rate}%</div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Cases marked completed</div>
              </div>
            </div>

            {/* Recharts Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Requests by Category */}
              <div className="bg-white dark:bg-[#121C18] p-6 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
                <h3 className="font-bold text-[#17231E] dark:text-[#FFF9ED] text-sm">Requests by AI Category</h3>
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

              {/* Chart 2: Requests by Urgency Level */}
              <div className="bg-white dark:bg-[#121C18] p-6 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
                <h3 className="font-bold text-[#17231E] dark:text-[#FFF9ED] text-sm">Urgency Priority Distribution</h3>
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

              {/* Chart 3: Requests Intake Timeline */}
              <div className="bg-white dark:bg-[#121C18] p-6 rounded-3xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4 lg:col-span-2">
                <h3 className="font-bold text-[#17231E] dark:text-[#FFF9ED] text-sm">Intake Trend (Past 7 Days)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.timeline}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#24332D" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#121C18', borderColor: '#24332D', color: '#FFF9ED', borderRadius: '12px' }} />
                      <Line type="monotone" dataKey="requests" stroke="#159B5B" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Verification Queue */}
        {activeTab === 'queue' && (
          <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#FFF9ED]">Pending Verification Queue</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Every request submitted must be verified before public exposure or dispatch.</p>
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 border border-[#159B5B]/30">
                          {req.dnn_category || req.category} ({(req.dnn_confidence || 1) * 100}%)
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                          req.urgency_level === 'CRITICAL' ? 'bg-rose-500' :
                          req.urgency_level === 'HIGH' ? 'bg-[#F2A33A]' : 'bg-[#159B5B]'
                        }`}>
                          {req.urgency_level}
                        </span>
                        {req.is_flagged_duplicate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            Duplicate Alert
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80 font-medium">{req.description}</p>
                      
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        Submitted by: <strong className="text-[#17231E] dark:text-[#FFF9ED]">{req.full_name}</strong> ({req.phone}) • {req.address}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-2 border border-[#EAE3D2] dark:border-[#24332D] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 text-[#17231E] dark:text-[#FFF9ED] font-bold rounded-xl text-xs transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerify(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="px-5 py-2 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
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

        {/* Tab 3: Duplicate Alerts */}
        {activeTab === 'duplicates' && (
          <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#FFF9ED]">Duplicate Request Alerts</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Flagged by heuristic analysis (phone match, text similarity, proximity). Not auto-rejected.</p>
            </div>

            {duplicateRequests.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">No suspected duplicate requests detected in the recent window.</p>
            ) : (
              <div className="space-y-3">
                {duplicateRequests.map((d) => (
                  <div key={d.id} className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-[#17231E] dark:text-[#FFF9ED] text-xs">
                        Request #{d.id} • {d.full_name} ({d.phone})
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                        {d.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#17231E]/80 dark:text-[#FFF9ED]/80">{d.description}</p>
                    
                    <div className="p-3 bg-white dark:bg-[#121C18] rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300 font-medium">
                      ⚠️ Duplicate Detector Flag: {d.duplicate_notes || 'Identical contact or similar text detected.'}
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => handleVerify(d.id)}
                        className="px-3.5 py-1.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                      >
                        Override & Verify
                      </button>
                      <button
                        onClick={() => handleReject(d.id)}
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

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#FFF9ED]">System Security & Action Audit Trail</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Immutable chronological record of logins, status transitions, and verifications.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-stone-400 uppercase bg-[#FFF9ED] dark:bg-[#0C1410] border-b border-[#EAE3D2] dark:border-[#24332D]">
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
                    <tr key={idx} className="hover:bg-[#FFF9ED]/50 dark:hover:bg-[#1A2621]/50">
                      <td className="p-3 text-stone-500 dark:text-stone-400 font-mono text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-[#17231E] dark:text-[#FFF9ED]">{log.user}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 border border-[#159B5B]/30">
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

        {/* Tab 5: Registered Users Directory */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#17231E] dark:text-[#FFF9ED]">Platform User Directory</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">All registered Requesters, Donors, NGOs, and Staff members.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-stone-400 uppercase bg-[#FFF9ED] dark:bg-[#0C1410] border-b border-[#EAE3D2] dark:border-[#24332D]">
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
                    <tr key={u.id} className="hover:bg-[#FFF9ED]/50 dark:hover:bg-[#1A2621]/50">
                      <td className="p-3 text-stone-400">#{u.id}</td>
                      <td className="p-3 font-bold text-[#17231E] dark:text-white">{u.full_name}</td>
                      <td className="p-3 text-stone-600 dark:text-stone-300">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          u.role === 'admin' ? 'bg-[#17231E] text-white dark:bg-[#24332D] dark:text-white' :
                          u.role === 'ngo' ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-400 border border-[#159B5B]/30' :
                          u.role === 'donor' ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' : 'bg-[#FFF9ED] dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] border border-[#EAE3D2] dark:border-[#24332D]'
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
