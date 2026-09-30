import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Package, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight, 
  HeartHandshake,
  Building2,
  RefreshCw,
  Send
} from 'lucide-react';
import { donationsApi } from '../services/api';
import { IntelligentDonationMatch, Donation, UrgentDonationRequest } from '../types';
import socketService from '../services/socket';

interface IntelligentDonationMatcherProps {
  onPledgeSuccess?: () => void;
}

export const IntelligentDonationMatcher: React.FC<IntelligentDonationMatcherProps> = ({ onPledgeSuccess }) => {
  const [promptText, setPromptText] = useState<string>('I can donate 10 blankets');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [parsedInfo, setParsedInfo] = useState<{ item_category: string; quantity: number; unit: string } | null>(null);
  const [matches, setMatches] = useState<IntelligentDonationMatch[]>([]);
  const [myPledges, setMyPledges] = useState<Donation[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<UrgentDonationRequest[]>([]);
  
  const [selectedMatch, setSelectedMatch] = useState<IntelligentDonationMatch | null>(null);
  const [pledgeNotes, setPledgeNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleSearchMatches = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptText.trim()) return;

    setIsSearching(true);
    setErrorNotice(null);
    try {
      const res = await donationsApi.matchPreview(promptText);
      if (res.success) {
        setParsedInfo(res.parsed);
        setMatches(res.matches || []);
      }
    } catch (err: any) {
      console.error('Error fetching donation matches:', err);
      setErrorNotice(err.response?.data?.error || 'Failed to match donation. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const loadMyPledges = async () => {
    try {
      const res = await donationsApi.getAll({ status: '' });
      if (res.success) {
        setMyPledges(res.donations || []);
      }
    } catch (err) {
      console.error('Error loading pledges:', err);
    }
  };

  const loadUrgentRequests = async () => {
    try {
      const res = await donationsApi.getUrgentRequests();
      if (res.success) {
        setUrgentRequests(res.urgent_requests || []);
      }
    } catch (err) {
      console.error('Error loading urgent requests:', err);
    }
  };

  useEffect(() => {
    handleSearchMatches();
    loadMyPledges();
    loadUrgentRequests();

    const handleDonationEvent = () => {
      loadMyPledges();
      loadUrgentRequests();
    };

    socketService.on('donation_pledged', handleDonationEvent);
    socketService.on('donation_status_updated', handleDonationEvent);
    socketService.on('urgent_request_created', handleDonationEvent);

    return () => {
      socketService.off('donation_pledged', handleDonationEvent);
      socketService.off('donation_status_updated', handleDonationEvent);
      socketService.off('urgent_request_created', handleDonationEvent);
    };
  }, []);

  const handleConfirmPledge = async () => {
    if (!selectedMatch) return;
    setIsSubmitting(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const payload = {
        item_category: selectedMatch.donation.item_category,
        quantity: selectedMatch.donation.quantity,
        unit: parsedInfo?.unit || 'items',
        item_description: selectedMatch.donation.description,
        notes: pledgeNotes,
        urgent_request_id: selectedMatch.current_need.urgent_request_id,
        request_id: selectedMatch.current_need.request_id,
        resource_id: selectedMatch.resource.id
      };

      const res = await donationsApi.createPledge(payload);
      if (res.success) {
        setSuccessNotice('Donation pledge created successfully! Thank you for your support.');
        setSelectedMatch(null);
        setPledgeNotes('');
        loadMyPledges();
        loadUrgentRequests();
        if (onPledgeSuccess) onPledgeSuccess();
      }
    } catch (err: any) {
      setErrorNotice(err.response?.data?.error || 'Could not register pledge. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyBadgeColor = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const getStatusStepperColor = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'COMPLETED') return 'bg-emerald-500 text-white';
    if (s === 'DELIVERED') return 'bg-blue-500 text-white';
    if (s === 'ASSIGNED' || s === 'ACCEPTED') return 'bg-amber-500 text-white';
    return 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* 1. Natural Language Donation Matcher Input */}
      <div className="bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#12B76A]/10 dark:bg-[#12B76A]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-[#E2F5EC] dark:bg-[#262626] border border-[#A8E5C8] dark:border-white/10 rounded-xl text-[#0B4F3A] dark:text-[#12B76A] shadow-sm">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#18352D] dark:text-white flex items-center gap-2">
              Intelligent Need-Driven Donation Matcher
            </h2>
            <p className="text-[#60756D] dark:text-[#A8A29E] text-sm">
              State what you wish to donate. AI parses needs and matches verified distribution hubs in real time.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchMatches} className="space-y-4">
          <div className="flex gap-2 flex-col md:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder='e.g. "I can donate 10 blankets" or "50 hot meals"'
                className="w-full bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 focus:border-[#0B4F3A] dark:focus:border-[#12B76A] rounded-xl px-4 py-3 text-[#18352D] dark:text-white placeholder-[#8A9B93] dark:placeholder-[#60756D] text-base focus:outline-none focus:ring-2 focus:ring-[#12B76A]/20 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-[#0B4F3A] hover:bg-[#083B2B] dark:bg-[#12B76A] dark:hover:bg-[#159A68] text-white dark:text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>Search Need Matches</span>
            </button>
          </div>

          {/* Parsed Info Tags */}
          {parsedInfo && (
            <div className="flex items-center gap-3 text-xs text-[#60756D] dark:text-[#A8A29E] bg-[#F7F8ED] dark:bg-[#0D0D0D] p-3 rounded-xl border border-[#E2E8E4] dark:border-white/10">
              <span className="text-[#18352D] dark:text-white font-semibold">Parsed Donation:</span>
              <span className="bg-[#E2F5EC] text-[#0B4F3A] dark:bg-[#262626] dark:text-[#12B76A] border border-[#A8E5C8] dark:border-white/10 px-2.5 py-1 rounded-md font-bold">
                Category: {parsedInfo.item_category}
              </span>
              <span className="bg-[#EAE3D2]/60 dark:bg-[#262626] text-[#18352D] dark:text-white px-2.5 py-1 rounded-md font-semibold">
                Quantity: {parsedInfo.quantity} {parsedInfo.unit}
              </span>
            </div>
          )}
        </form>

        {/* Privacy Protection Callout */}
        <div className="mt-4 flex items-center gap-2 text-xs text-[#0B4F3A] dark:text-[#12B76A] bg-[#E2F5EC]/70 dark:bg-[#262626]/70 border border-[#A8E5C8] dark:border-white/10 p-3 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-[#0B4F3A] dark:text-[#12B76A] shrink-0" />
          <span>
            <strong>Strict Privacy Protection Enforced:</strong> Beneficiary names, contact numbers, and precise addresses are 100% masked. All donations are delivered via verified NGO hubs.
          </span>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successNotice && (
        <div className="bg-[#E2F5EC] dark:bg-[#262626] border border-[#A8E5C8] dark:border-white/10 text-[#0B4F3A] dark:text-[#12B76A] p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {errorNotice && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="font-medium">{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 2. Algorithmic Match Results Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#18352D] dark:text-white flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
          Matched Verified Needs ({matches.length})
        </h3>

        {matches.length === 0 ? (
          <div className="bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 rounded-2xl p-8 text-center text-[#60756D] dark:text-[#A8A29E] shadow-sm">
            No active matching verified needs found for this category right now. You can pledge directly to central inventory.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((m) => (
              <div 
                key={m.match_id}
                className="bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 hover:border-[#0B4F3A]/50 dark:hover:border-[#12B76A]/50 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Match Score & Urgency Header */}
                  <div className="flex items-center justify-between">
                    <span className="bg-[#E2F5EC] dark:bg-[#262626] border border-[#A8E5C8] dark:border-white/10 text-[#0B4F3A] dark:text-[#12B76A] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      {m.match_score}% Match
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getUrgencyBadgeColor(m.current_need.urgency_level)}`}>
                      {m.current_need.urgency_level} URGENCY
                    </span>
                  </div>

                  {/* 4-Tuple Structured Match Information */}
                  <div className="space-y-2 bg-[#FFFDF3] dark:bg-[#0D0D0D] p-4 rounded-xl border border-[#E2E8E4] dark:border-white/10">
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-[#0B4F3A] dark:text-[#12B76A] mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-[#60756D] dark:text-[#A8A29E] block font-medium">DONATION</span>
                        <span className="text-[#18352D] dark:text-white text-sm font-semibold">{m.donation.quantity} units of {m.donation.item_category}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2 border-t border-[#E2E8E4] dark:border-white/10">
                      <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-[#60756D] dark:text-[#A8A29E] block font-medium">CURRENT NEED</span>
                        <span className="text-[#18352D] dark:text-white text-sm font-semibold">{m.current_need.title}</span>
                        {m.current_need.description && (
                          <p className="text-xs text-[#60756D] dark:text-[#A8A29E] mt-0.5 line-clamp-2">{m.current_need.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2 border-t border-[#E2E8E4] dark:border-white/10">
                      <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-[#60756D] dark:text-[#A8A29E] block font-medium">RESOURCE CENTER</span>
                        <span className="text-[#18352D] dark:text-white text-sm font-semibold">{m.resource.name}</span>
                        <span className="text-xs text-[#60756D] dark:text-[#A8A29E] block">{m.resource.organization_type}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2 border-t border-[#E2E8E4] dark:border-white/10">
                      <MapPin className="w-4 h-4 text-rose-500 dark:text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-[#60756D] dark:text-[#A8A29E] block font-medium">LOCATION</span>
                        <span className="text-[#18352D] dark:text-white text-xs font-medium">{m.location.locality} ({m.location.distance_km} km away)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setSelectedMatch(m)}
                    className="w-full bg-[#0B4F3A] hover:bg-[#083B2B] dark:bg-[#12B76A] dark:hover:bg-[#159A68] text-white dark:text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm group-hover:shadow"
                  >
                    <span>Pledge This Donation</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Pledge Confirmation Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D2] dark:border-white/10">
              <h3 className="text-lg font-bold text-[#18352D] dark:text-white flex items-center gap-2">
                Confirm Donation Pledge
              </h3>
              <button 
                onClick={() => setSelectedMatch(null)}
                className="text-[#60756D] dark:text-[#A8A29E] hover:text-[#18352D] dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#FFFDF3] dark:bg-[#0D0D0D] p-4 rounded-xl border border-[#E2E8E4] dark:border-white/10 space-y-2 text-sm">
              <div>
                <span className="text-[#60756D] dark:text-[#A8A29E] block text-xs">Pledging Item:</span>
                <span className="text-[#18352D] dark:text-white font-bold text-base">
                  {selectedMatch.donation.quantity} {selectedMatch.donation.item_category}
                </span>
              </div>
              <div>
                <span className="text-[#60756D] dark:text-[#A8A29E] block text-xs">Destination Need:</span>
                <span className="text-[#0B4F3A] dark:text-[#12B76A] font-semibold">{selectedMatch.current_need.title}</span>
              </div>
              <div>
                <span className="text-[#60756D] dark:text-[#A8A29E] block text-xs">Distribution Center:</span>
                <span className="text-teal-700 dark:text-teal-300 font-semibold">{selectedMatch.resource.name}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#18352D] dark:text-white">Delivery Notes / Pickup Instructions (Optional):</label>
              <textarea
                value={pledgeNotes}
                onChange={(e) => setPledgeNotes(e.target.value)}
                placeholder="e.g., I can drop this off at the shelter on Saturday morning between 10am-12pm."
                rows={3}
                className="w-full bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 focus:border-[#0B4F3A] dark:focus:border-[#12B76A] rounded-xl p-3 text-[#18352D] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#12B76A]/20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="flex-1 bg-[#EAE3D2]/60 dark:bg-[#262626] hover:bg-[#EAE3D2] dark:hover:bg-[#1F3F34] text-[#18352D] dark:text-white py-2.5 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPledge}
                disabled={isSubmitting}
                className="flex-1 bg-[#0B4F3A] hover:bg-[#083B2B] dark:bg-[#12B76A] dark:hover:bg-[#159A68] text-white dark:text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm"
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Confirm Pledge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Pledges & Lifecycle Progress Tracker */}
      <div className="bg-white dark:bg-[#161616] border border-[#EAE3D2] dark:border-white/10 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-[#18352D] dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
          My Donation Pledges & Status Tracker ({myPledges.length})
        </h3>

        {myPledges.length === 0 ? (
          <p className="text-[#60756D] dark:text-[#A8A29E] text-sm">You have not registered any pledges yet.</p>
        ) : (
          <div className="space-y-4">
            {myPledges.map((p) => {
              const statusSteps = ['PLEDGED', 'ACCEPTED', 'ASSIGNED', 'DELIVERED', 'COMPLETED'];
              const currentIdx = statusSteps.indexOf(p.status.toUpperCase());

              return (
                <div key={p.id} className="bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[#18352D] dark:text-white font-bold text-base">{p.item_description}</span>
                      <span className="text-xs text-[#60756D] dark:text-[#A8A29E] block">
                        Pledged to: {p.urgent_request_title || p.resource_name || 'Community Hub'}
                      </span>
                    </div>
                    <span className="bg-[#E2F5EC] text-[#0B4F3A] border border-[#A8E5C8] dark:bg-[#262626] dark:text-[#12B76A] dark:border-white/10 text-xs px-3 py-1 rounded-full font-bold">
                      {p.status}
                    </span>
                  </div>

                  {/* Visual Lifecycle Stepper */}
                  <div className="grid grid-cols-5 gap-1.5 pt-2">
                    {statusSteps.map((step, idx) => {
                      const isPassed = idx <= currentIdx;
                      return (
                        <div key={step} className="text-center space-y-1">
                          <div className={`h-2 rounded-full transition-all ${isPassed ? 'bg-[#0B4F3A] dark:bg-[#12B76A]' : 'bg-[#E2E8E4] dark:bg-[#262626]'}`} />
                          <span className={`text-[10px] block font-semibold ${isPassed ? 'text-[#0B4F3A] dark:text-[#12B76A]' : 'text-[#60756D] dark:text-[#A8A29E]'}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

