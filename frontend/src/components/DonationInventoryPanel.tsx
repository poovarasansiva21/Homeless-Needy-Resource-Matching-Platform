import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRightLeft, 
  CheckCircle2, 
  Building2, 
  TrendingUp, 
  Layers, 
  PlusCircle,
  ShieldCheck
} from 'lucide-react';
import { donationsApi } from '../services/api';
import { DonationInventory, UrgentDonationRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';

export const DonationInventoryPanel: React.FC = () => {
  const { user } = useAuth();
  const [inventories, setInventories] = useState<DonationInventory[]>([]);
  const [categoriesSummary, setCategoriesSummary] = useState<Record<string, { total: number; available: number; allocated: number }>>({});
  const [urgentRequests, setUrgentRequests] = useState<UrgentDonationRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Reallocation Modal State
  const [activeReallocateInv, setActiveReallocateInv] = useState<DonationInventory | null>(null);
  const [selectedTargetUrgentId, setSelectedTargetUrgentId] = useState<number | null>(null);
  const [reallocateQuantity, setReallocateQuantity] = useState<number>(5);
  const [reallocateNotes, setReallocateNotes] = useState<string>('');
  const [isSubmittingReallocate, setIsSubmittingReallocate] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create Urgent Request Modal State
  const [showCreateUrgentModal, setShowCreateUrgentModal] = useState<boolean>(false);
  const [newUrgentTitle, setNewUrgentTitle] = useState<string>('');
  const [newUrgentCategory, setNewUrgentCategory] = useState<string>('BLANKETS');
  const [newUrgentLevel, setNewUrgentLevel] = useState<string>('HIGH');
  const [newUrgentQty, setNewUrgentQty] = useState<number>(20);
  const [newUrgentDesc, setNewUrgentDesc] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const invRes = await donationsApi.getInventory();
      if (invRes.success) {
        setInventories(invRes.inventory || []);
        setCategoriesSummary(invRes.summary || {});
      }

      const uRes = await donationsApi.getUrgentRequests();
      if (uRes.success) {
        setUrgentRequests(uRes.urgent_requests || []);
      }
    } catch (err) {
      console.error('Error loading inventory and urgent requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    socketService.on('resource_reallocated', handleUpdate);
    socketService.on('urgent_request_created', handleUpdate);
    socketService.on('donation_pledged', handleUpdate);

    return () => {
      socketService.off('resource_reallocated', handleUpdate);
      socketService.off('urgent_request_created', handleUpdate);
      socketService.off('donation_pledged', handleUpdate);
    };
  }, []);

  const handlePerformReallocation = async () => {
    if (!activeReallocateInv || !selectedTargetUrgentId) return;
    setIsSubmittingReallocate(true);
    setFeedbackMsg(null);
    setErrorMsg(null);

    try {
      const res = await donationsApi.reallocateResource({
        inventory_id: activeReallocateInv.id,
        target_urgent_request_id: selectedTargetUrgentId,
        quantity: reallocateQuantity,
        notes: reallocateNotes
      });

      if (res.success) {
        setFeedbackMsg(res.message || 'Resource stock successfully reallocated.');
        setActiveReallocateInv(null);
        setReallocateNotes('');
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Reallocation failed.');
    } finally {
      setIsSubmittingReallocate(false);
    }
  };

  const handleCreateUrgentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrgentTitle) return;

    try {
      const res = await donationsApi.createUrgentRequest({
        title: newUrgentTitle,
        item_category: newUrgentCategory,
        urgency_level: newUrgentLevel,
        required_quantity: newUrgentQty,
        description: newUrgentDesc
      });

      if (res.success) {
        setFeedbackMsg('Urgent donation request published successfully!');
        setShowCreateUrgentModal(false);
        setNewUrgentTitle('');
        setNewUrgentDesc('');
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to create urgent request.');
    }
  };

  const getUrgencyBadge = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#10251E] border border-[#EAE3D2] dark:border-[#1F3F34] rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#18352D] dark:text-[#FFFDF3] flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#0B4F3A] dark:text-[#12B76A]" />
            Donation Inventory & Authorized Resource Reallocation
          </h2>
          <p className="text-[#60756D] dark:text-[#A2B5AD] text-sm mt-1">
            Real-time stock tracking by category & authorized allocation of excess stock to urgent verified needs.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="bg-[#FFFDF3] dark:bg-[#0B1713] text-[#18352D] dark:text-[#FFFDF3] p-2.5 rounded-xl border border-[#E2E8E4] dark:border-[#1F3F34] hover:bg-[#F7F8ED] dark:hover:bg-[#16322A] transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          {(user?.role === 'ngo' || user?.role === 'admin') && (
            <button
              onClick={() => setShowCreateUrgentModal(true)}
              className="bg-[#0B4F3A] hover:bg-[#083B2B] dark:bg-[#12B76A] dark:hover:bg-[#159A68] text-white dark:text-[#0B1713] px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Publish Urgent Need
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="bg-[#E2F5EC] dark:bg-[#16322A] border border-[#A8E5C8] dark:border-[#1F3F34] text-[#0B4F3A] dark:text-[#12B76A] p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 1. Category Summary Inventory Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {['FOOD', 'CLOTHING', 'BLANKETS', 'HYGIENE', 'OTHER'].map((cat) => {
          const summary = categoriesSummary[cat] || { total: 0, available: 0, allocated: 0 };
          return (
            <div key={cat} className="bg-white dark:bg-[#10251E] border border-[#EAE3D2] dark:border-[#1F3F34] rounded-xl p-4 space-y-2 shadow-sm">
              <span className="text-xs font-bold text-[#60756D] dark:text-[#A2B5AD] block tracking-wider">{cat}</span>
              <div className="text-2xl font-black text-[#18352D] dark:text-[#FFFDF3]">{summary.available}</div>
              <div className="text-[11px] text-[#60756D] dark:text-[#A2B5AD] flex justify-between">
                <span>Total: {summary.total}</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Allocated: {summary.allocated}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Urgent Needs Section (CRITICAL, HIGH, NORMAL) */}
      <div className="bg-white dark:bg-[#10251E] border border-[#EAE3D2] dark:border-[#1F3F34] rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-[#18352D] dark:text-[#FFFDF3] flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          Active Urgent Donation Requests
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {urgentRequests.map((u) => (
            <div key={u.id} className="bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] p-4 rounded-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getUrgencyBadge(u.urgency_level)}`}>
                    {u.urgency_level}
                  </span>
                  <span className="text-xs text-[#60756D] dark:text-[#A2B5AD] font-semibold">{u.item_category}</span>
                </div>

                <h4 className="text-[#18352D] dark:text-[#FFFDF3] font-bold text-base leading-snug">{u.title}</h4>
                <p className="text-xs text-[#60756D] dark:text-[#A2B5AD] line-clamp-2">{u.description}</p>

                <div className="bg-white dark:bg-[#10251E] p-2.5 rounded-lg text-xs space-y-1 border border-[#E2E8E4] dark:border-[#1F3F34]">
                  <div className="flex justify-between text-[#18352D] dark:text-[#FFFDF3]">
                    <span>Required: {u.required_quantity} {u.unit}</span>
                    <span className="text-[#0B4F3A] dark:text-[#12B76A] font-bold">Fulfilled: {u.fulfilled_quantity}</span>
                  </div>
                  <div className="w-full bg-[#E2E8E4] dark:bg-[#1F3F34] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#0B4F3A] dark:bg-[#12B76A] h-full transition-all"
                      style={{ width: `${Math.min(100, (u.fulfilled_quantity / (u.required_quantity || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Reallocate button for NGO / Admin */}
              {(user?.role === 'ngo' || user?.role === 'admin') && (
                <button
                  onClick={() => setSelectedTargetUrgentId(u.id)}
                  className="w-full bg-[#E2F5EC] hover:bg-[#C9EFE0] dark:bg-[#16322A] dark:hover:bg-[#1F3F34] text-[#0B4F3A] dark:text-[#12B76A] border border-[#A8E5C8] dark:border-[#1F3F34] font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Reallocate Excess Stock Here</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Detailed Inventory Stock & Reallocation List */}
      <div className="bg-white dark:bg-[#10251E] border border-[#EAE3D2] dark:border-[#1F3F34] rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-[#18352D] dark:text-[#FFFDF3] flex items-center gap-2">
          <Package className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
          Resource Stock Breakdown & Reallocation
        </h3>

        <div className="divide-y divide-[#E2E8E4] dark:divide-[#1F3F34]">
          {inventories.map((inv) => (
            <div key={inv.id} className="py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#18352D] dark:text-[#FFFDF3] font-bold text-base">{inv.item_name}</span>
                  <span className="bg-[#EAE3D2]/60 dark:bg-[#16322A] text-[#18352D] dark:text-[#FFFDF3] text-xs px-2 py-0.5 rounded font-mono font-semibold">
                    {inv.item_category}
                  </span>
                </div>
                <div className="text-xs text-[#60756D] dark:text-[#A2B5AD] flex items-center gap-3">
                  <span>Hub: <strong className="text-[#18352D] dark:text-[#FFFDF3]">{inv.resource_name}</strong></span>
                  <span>Available: <strong className="text-[#0B4F3A] dark:text-[#12B76A]">{inv.available_quantity} {inv.unit}</strong></span>
                  <span>Allocated: <strong className="text-amber-600 dark:text-amber-400">{inv.allocated_quantity} {inv.unit}</strong></span>
                </div>
              </div>

              {(user?.role === 'ngo' || user?.role === 'admin') && (
                <button
                  onClick={() => {
                    setActiveReallocateInv(inv);
                    if (urgentRequests.length > 0) setSelectedTargetUrgentId(urgentRequests[0].id);
                  }}
                  className="bg-[#E2F5EC] hover:bg-[#C9EFE0] dark:bg-[#16322A] dark:hover:bg-[#1F3F34] text-[#0B4F3A] dark:text-[#12B76A] border border-[#A8E5C8] dark:border-[#1F3F34] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Reallocate Stock
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reallocate Action Modal */}
      {activeReallocateInv && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10251E] border border-[#EAE3D2] dark:border-[#1F3F34] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D2] dark:border-[#1F3F34]">
              <h3 className="text-lg font-bold text-[#18352D] dark:text-[#FFFDF3] flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
                Authorized Resource Reallocation
              </h3>
              <button onClick={() => setActiveReallocateInv(null)} className="text-[#60756D] dark:text-[#A2B5AD] hover:text-[#18352D] dark:hover:text-white">✕</button>
            </div>

            <div className="bg-[#FFFDF3] dark:bg-[#0B1713] p-3 rounded-xl border border-[#E2E8E4] dark:border-[#1F3F34] text-xs space-y-1">
              <span className="text-[#60756D] dark:text-[#A2B5AD] block">Source Inventory:</span>
              <span className="text-[#18352D] dark:text-[#FFFDF3] font-bold text-sm">{activeReallocateInv.item_name} ({activeReallocateInv.available_quantity} available)</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#18352D] dark:text-[#FFFDF3] block mb-1">Target Urgent Request:</label>
                <select
                  value={selectedTargetUrgentId || ''}
                  onChange={(e) => setSelectedTargetUrgentId(Number(e.target.value))}
                  className="w-full bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] rounded-xl p-3 text-[#18352D] dark:text-[#FFFDF3] text-sm focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#12B76A]"
                >
                  {urgentRequests.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.urgency_level}] {u.title} ({u.remaining_quantity} needed)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#18352D] dark:text-[#FFFDF3] block mb-1">Quantity to Reallocate:</label>
                <input
                  type="number"
                  min={1}
                  max={activeReallocateInv.available_quantity}
                  value={reallocateQuantity}
                  onChange={(e) => setReallocateQuantity(Number(e.target.value))}
                  className="w-full bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] rounded-xl p-3 text-[#18352D] dark:text-[#FFFDF3] text-sm focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#12B76A]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#18352D] dark:text-[#FFFDF3] block mb-1">Reallocation Notes:</label>
                <input
                  type="text"
                  value={reallocateNotes}
                  onChange={(e) => setReallocateNotes(e.target.value)}
                  placeholder="e.g. Reallocating surplus blankets for monsoon cold wave"
                  className="w-full bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] rounded-xl p-3 text-[#18352D] dark:text-[#FFFDF3] text-sm focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#12B76A]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveReallocateInv(null)}
                className="flex-1 bg-[#EAE3D2]/60 dark:bg-[#16322A] hover:bg-[#EAE3D2] dark:hover:bg-[#1F3F34] text-[#18352D] dark:text-[#FFFDF3] py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePerformReallocation}
                disabled={isSubmittingReallocate}
                className="flex-1 bg-[#0B4F3A] hover:bg-[#083B2B] dark:bg-[#12B76A] dark:hover:bg-[#159A68] text-white dark:text-[#0B1713] font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isSubmittingReallocate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                <span>Confirm Reallocate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Urgent Request Modal */}
      {showCreateUrgentModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateUrgentRequest} className="bg-white dark:bg-[#10251E] border border-[#EAE3D2] dark:border-[#1F3F34] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D2] dark:border-[#1F3F34]">
              <h3 className="text-lg font-bold text-[#18352D] dark:text-[#FFFDF3] flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
                Publish Urgent Donation Request
              </h3>
              <button type="button" onClick={() => setShowCreateUrgentModal(false)} className="text-[#60756D] dark:text-[#A2B5AD] hover:text-[#18352D] dark:hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#18352D] dark:text-[#FFFDF3] block mb-1">Request Title:</label>
                <input
                  type="text"
                  required
                  value={newUrgentTitle}
                  onChange={(e) => setNewUrgentTitle(e.target.value)}
                  placeholder="e.g., Night Shelter Cold Relief Blanket Drive"
                  className="w-full bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] rounded-xl p-3 text-[#18352D] dark:text-[#FFFDF3] text-sm focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#12B76A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#18352D] dark:text-[#FFFDF3] block mb-1">Category:</label>
                  <select
                    value={newUrgentCategory}
                    onChange={(e) => setNewUrgentCategory(e.target.value)}
                    className="w-full bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] rounded-xl p-2.5 text-[#18352D] dark:text-[#FFFDF3] text-sm"
                  >
                    <option value="BLANKETS">BLANKETS</option>
                    <option value="FOOD">FOOD</option>
                    <option value="CLOTHING">CLOTHING</option>
                    <option value="HYGIENE">HYGIENE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#18352D] dark:text-[#FFFDF3] block mb-1">Urgency Level:</label>
                  <select
                    value={newUrgentLevel}
                    onChange={(e) => setNewUrgentLevel(e.target.value)}
                    className="w-full bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] rounded-xl p-2.5 text-[#18352D] dark:text-[#FFFDF3] text-sm"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="NORMAL">NORMAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#18352D] dark:text-[#FFFDF3] block mb-1">Required Quantity:</label>
                <input
                  type="number"
                  min={1}
                  value={newUrgentQty}
                  onChange={(e) => setNewUrgentQty(Number(e.target.value))}
                  className="w-full bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] rounded-xl p-3 text-[#18352D] dark:text-[#FFFDF3] text-sm focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#12B76A]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#18352D] dark:text-[#FFFDF3] block mb-1">Description:</label>
                <textarea
                  value={newUrgentDesc}
                  onChange={(e) => setNewUrgentDesc(e.target.value)}
                  rows={3}
                  placeholder="Details of the need..."
                  className="w-full bg-[#FFFDF3] dark:bg-[#0B1713] border border-[#E2E8E4] dark:border-[#1F3F34] rounded-xl p-3 text-[#18352D] dark:text-[#FFFDF3] text-sm focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#12B76A]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateUrgentModal(false)}
                className="flex-1 bg-[#EAE3D2]/60 dark:bg-[#16322A] hover:bg-[#EAE3D2] dark:hover:bg-[#1F3F34] text-[#18352D] dark:text-[#FFFDF3] py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#0B4F3A] hover:bg-[#083B2B] dark:bg-[#12B76A] dark:hover:bg-[#159A68] text-white dark:text-[#0B1713] font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                Publish Need
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
