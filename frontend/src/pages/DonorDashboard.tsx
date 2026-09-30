import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  Gift, 
  Users, 
  MapPin, 
  Filter, 
  CheckCircle, 
  Clock, 
  Sparkles,
  Search,
  Package,
  ShieldCheck,
  Camera,
  X
} from 'lucide-react';
import { dashboardApi, requestsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';
import { RequestItem, Donation, DonationVisionScanResponse } from '../types';
import { useLanguage } from '../i18n';
import { AiDonationScanner } from '../components/AiDonationScanner';
import { IntelligentDonationMatcher } from '../components/IntelligentDonationMatcher';
import { DonationInventoryPanel } from '../components/DonationInventoryPanel';
import { formatReportDateTime } from '../utils/dateFormatter';

export const DonorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeMainTab, setActiveMainTab] = useState<'matcher' | 'inventory' | 'requests'>('matcher');

  const [metrics, setMetrics] = useState<any>({
    active_verified_needs: 0,
    my_total_donations: 0,
    completed_assistance: 0,
    people_impacted: 0,
  });

  const [verifiedRequests, setVerifiedRequests] = useState<RequestItem[]>([]);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [scanResultNotice, setScanResultNotice] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');

  // "HELP THIS PERSON" Modal State
  const [activeDonationModalReq, setActiveDonationModalReq] = useState<RequestItem | null>(null);
  const [donationType, setDonationType] = useState<string>('food_package');
  const [donationNotes, setDonationNotes] = useState<string>('');
  const [isSubmittingPledge, setIsSubmittingPledge] = useState<boolean>(false);
  const [pledgeSuccessMsg, setPledgeSuccessMsg] = useState<string | null>(null);
  const [pledgeErrorMsg, setPledgeErrorMsg] = useState<string | null>(null);

  const { loginAsDemoRole } = useAuth();

  const fetchDonorData = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardApi.getDonor();
      setMetrics(data.metrics);
      setVerifiedRequests(data.verified_requests);
      setMyDonations(data.my_donations);
    } catch (err) {
      console.error('Error fetching donor dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorData();

    // Listen to live events
    const handleNewRequest = () => {
      fetchDonorData();
    };
    const handleStatusUpdate = () => {
      fetchDonorData();
    };

    socketService.on('new_request', handleNewRequest);
    socketService.on('request_status_updated', handleStatusUpdate);
    socketService.on('donation_pledged', handleStatusUpdate);

    return () => {
      socketService.off('new_request', handleNewRequest);
      socketService.off('request_status_updated', handleStatusUpdate);
      socketService.off('donation_pledged', handleStatusUpdate);
    };
  }, []);

  const handleOpenPledgeModal = (req: RequestItem) => {
    setActiveDonationModalReq(req);
    setPledgeErrorMsg(null);
    setPledgeSuccessMsg(null);
    setDonationNotes('');
    
    // Intelligently set default donation type based on case category
    const cat = (req.dnn_category || req.category || '').toUpperCase();
    if (cat === 'MEDICAL') {
      setDonationType('medical_aid');
    } else if (cat === 'SHELTER') {
      setDonationType('shelter_aid');
    } else if (cat === 'CLOTHING') {
      setDonationType('clothing');
    } else {
      setDonationType('food_package');
    }
  };

  const getContributionTypes = (req: RequestItem | null) => {
    const cat = (req?.dnn_category || req?.category || '').toUpperCase();
    if (cat === 'MEDICAL') {
      return [
        { id: 'medical_aid', label: '🩺 Medical Aid & Doctor Care' },
        { id: 'emergency_medicines', label: '💊 Emergency Medicines / Nebulizer' },
        { id: 'financial_support', label: '💳 Hospital / Medical Fund Aid' },
        { id: 'volunteer_delivery', label: '🚑 Medical Transport / Escort' }
      ];
    }
    if (cat === 'SHELTER') {
      return [
        { id: 'shelter_aid', label: '🏠 Shelter Home Bedding / Space' },
        { id: 'clothing', label: '🛏️ Blankets & Tarpaulins' },
        { id: 'food_package', label: '🍲 Food Kit & Water Rations' },
        { id: 'volunteer_delivery', label: '🚚 Transport to Verified Shelter' }
      ];
    }
    if (cat === 'CLOTHING') {
      return [
        { id: 'clothing', label: '👕 Clothing, Sweaters & Blankets' },
        { id: 'footwear', label: '👟 Clean Footwear / Slippers' },
        { id: 'hygiene_kit', label: '🧼 Personal Hygiene & Sanitation Kit' },
        { id: 'volunteer_delivery', label: '🚚 Doorstep Pickup & Delivery' }
      ];
    }
    return [
      { id: 'food_package', label: '🍲 Cooked Meals & Grocery Kit' },
      { id: 'water_rations', label: '💧 Clean Drinking Water Supply' },
      { id: 'financial_support', label: '💳 Direct Ration Financial Aid' },
      { id: 'volunteer_delivery', label: '🚚 Volunteer Delivery / Hot Food Drop' }
    ];
  };

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDonationModalReq) return;

    setIsSubmittingPledge(true);
    setPledgeErrorMsg(null);

    try {
      // If user is unauthenticated or not a donor/admin, seamlessly authenticate as demo donor
      if (!user || (user.role !== 'donor' && user.role !== 'admin')) {
        await loginAsDemoRole('donor');
      }

      await requestsApi.donate(activeDonationModalReq.id, donationType, donationNotes);
      setPledgeSuccessMsg(`Thank you! Your pledge (${donationType.replace('_', ' ')}) for Request #${activeDonationModalReq.id} has been recorded.`);
      setTimeout(() => {
        setActiveDonationModalReq(null);
        setPledgeSuccessMsg(null);
        setDonationNotes('');
        fetchDonorData();
      }, 1800);
    } catch (err: any) {
      console.error('Failed to pledge donation:', err);
      const serverMsg = err.response?.data?.error || err.message || 'Failed to record donation pledge. Please verify connection and try again.';
      setPledgeErrorMsg(serverMsg);
    } finally {
      setIsSubmittingPledge(false);
    }
  };

  const filteredRequests = verifiedRequests.filter((r) => {
    if (selectedCategory !== 'ALL' && r.dnn_category !== selectedCategory && r.category !== selectedCategory) return false;
    if (selectedUrgency !== 'ALL' && r.urgency_level !== selectedUrgency) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0c1410] text-[#17231E] dark:text-[#FFF9ED] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 text-xs font-black px-3.5 py-1 rounded-full border border-[#159B5B]/30 mb-2">
              <Gift className="w-3.5 h-3.5" />
              <span>{t('dashboards.donorTitle')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#17231E] dark:text-[#FFF9ED] tracking-tight">
              Direct Social Impact Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#17231E]/70 dark:text-[#FFF9ED]/70 mt-1 font-medium">
              Connect directly with verified community cases in Coimbatore. Provide food kits, blankets, medical funds, or volunteer delivery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="px-4 py-2.5 rounded-2xl bg-[#159B5B] hover:bg-[#12824C] text-white text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md transition-all border border-white/20"
            >
              <Camera className="w-4 h-4" />
              <span>AI Donation Scanner</span>
            </button>
            <span className="text-xs bg-[#E8F3E9] dark:bg-[#159B5B]/25 text-[#159B5B] dark:text-emerald-300 font-black px-3 py-1.5 rounded-full border border-[#159B5B]/30">
              ● Live Synchronized
            </span>
          </div>
        </div>

        {/* AI Scanner Section / Drawer */}
        {showScanner && (
          <div className="animate-fadeIn">
            <AiDonationScanner 
              onClose={() => setShowScanner(false)}
              onCategoryConfirmed={(confirmedCategory, scanData) => {
                setSelectedCategory(confirmedCategory.toUpperCase());
                setShowScanner(false);
                setScanResultNotice(`AI MobileNetV2 detected ${confirmedCategory.toUpperCase()} (${scanData.confidence_percentage}% confidence). Showing matching verified needs below.`);
                // Find first matching request if any
                const match = verifiedRequests.find(r => 
                  (r.dnn_category || r.category || '').toUpperCase() === confirmedCategory.toUpperCase()
                );
                if (match) {
                  handleOpenPledgeModal(match);
                }
              }}
            />
          </div>
        )}

        {/* Scan Result Notice Banner */}
        {scanResultNotice && (
          <div className="bg-[#E8F3E9] dark:bg-[#159B5B]/20 border border-[#159B5B]/40 text-[#17231E] dark:text-white rounded-2xl p-4 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#159B5B]" />
              <span>{scanResultNotice}</span>
            </div>
            <button onClick={() => setScanResultNotice(null)} className="text-xs underline opacity-70 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Impact Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t('dashboards.requests')}</div>
            <div className="text-3xl font-black text-[#17231E] dark:text-[#FFF9ED] mt-2">{metrics.active_verified_needs}</div>
            <div className="text-[11px] text-[#159B5B] dark:text-emerald-400 font-semibold mt-1">Awaiting direct community help</div>
          </div>

          <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t('dashboards.donations')}</div>
            <div className="text-3xl font-black text-[#159B5B] dark:text-emerald-400 mt-2">{metrics.my_total_donations}</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Relief packages pledged</div>
          </div>

          <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t('dashboards.completed')}</div>
            <div className="text-3xl font-black text-[#159B5B] dark:text-emerald-400 mt-2">{metrics.completed_assistance}</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Confirmed handovers</div>
          </div>

          <div className="bg-white dark:bg-[#121C18] p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t('hero.statLives')}</div>
            <div className="text-3xl font-black text-[#F2A33A] dark:text-amber-400 mt-2">{metrics.people_impacted}</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Individuals assisted directly</div>
          </div>
        </div>

        {/* Main Tab Switcher */}
        <div className="flex bg-white dark:bg-[#10251E] p-1.5 rounded-2xl border border-[#EAE3D2] dark:border-[#1F3F34] gap-2 shadow-sm">
          <button
            onClick={() => setActiveMainTab('matcher')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeMainTab === 'matcher' 
                ? 'bg-[#0B4F3A] dark:bg-[#12B76A] text-white dark:text-[#0B1713] shadow-sm' 
                : 'text-[#60756D] dark:text-[#A2B5AD] hover:text-[#18352D] dark:hover:text-white hover:bg-[#F7F8ED] dark:hover:bg-[#16322A]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Intelligent Need Matcher
          </button>

          <button
            onClick={() => setActiveMainTab('inventory')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeMainTab === 'inventory' 
                ? 'bg-[#0B4F3A] dark:bg-[#12B76A] text-white dark:text-[#0B1713] shadow-sm' 
                : 'text-[#60756D] dark:text-[#A2B5AD] hover:text-[#18352D] dark:hover:text-white hover:bg-[#F7F8ED] dark:hover:bg-[#16322A]'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventory & Urgent Needs
          </button>

          <button
            onClick={() => setActiveMainTab('requests')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeMainTab === 'requests' 
                ? 'bg-[#0B4F3A] dark:bg-[#12B76A] text-white dark:text-[#0B1713] shadow-sm' 
                : 'text-[#60756D] dark:text-[#A2B5AD] hover:text-[#18352D] dark:hover:text-white hover:bg-[#F7F8ED] dark:hover:bg-[#16322A]'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            Community Cases ({verifiedRequests.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeMainTab === 'matcher' && (
          <IntelligentDonationMatcher onPledgeSuccess={fetchDonorData} />
        )}

        {activeMainTab === 'inventory' && (
          <DonationInventoryPanel />
        )}

        {activeMainTab === 'requests' && (
          <div className="space-y-6">
            {/* Filters and Search Bar */}
            <div className="bg-white dark:bg-[#121C18] p-4 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-stone-400" />
                <span className="font-bold text-[#17231E] dark:text-[#FFF9ED]">Filter Needs:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="p-2 border border-[#EAE3D2] dark:border-[#24332D] rounded-xl outline-none bg-white dark:bg-[#17231E] text-[#17231E] dark:text-[#FFF9ED] font-semibold"
                >
                  <option value="ALL">All Categories</option>
                  <option value="FOOD">Food Supplies</option>
                  <option value="SHELTER">Shelter Needs</option>
                  <option value="CLOTHING">Clothing & Blankets</option>
                  <option value="MEDICAL">Medical & Medicines</option>
                  <option value="EDUCATION">Education Aid</option>
                </select>

                <select
                  value={selectedUrgency}
                  onChange={(e) => setSelectedUrgency(e.target.value)}
                  className="p-2 border border-[#EAE3D2] dark:border-[#24332D] rounded-xl outline-none bg-white dark:bg-[#17231E] text-[#17231E] dark:text-[#FFF9ED] font-semibold"
                >
                  <option value="ALL">All Urgency</option>
                  <option value="CRITICAL">Critical Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                </select>
              </div>
            </div>

        {/* Verified Requests Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#17231E] dark:text-[#FFF9ED]">
              Verified Community Requests ({filteredRequests.length})
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">Approximated locations for safety</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <div 
                key={req.id}
                className="bg-white dark:bg-[#121C18] rounded-3xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFF9ED] dark:bg-[#17231E] text-[#17231E] dark:text-[#FFF9ED] border border-[#EAE3D2] dark:border-[#24332D]">
                      {req.dnn_category || req.category}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full text-white ${
                      req.urgency_level === 'CRITICAL' ? 'bg-rose-600' :
                      req.urgency_level === 'HIGH' ? 'bg-[#F2A33A]' : 'bg-[#159B5B]'
                    }`}>
                      {req.urgency_level}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-[#17231E] dark:text-[#FFF9ED] text-base mt-3">
                    Request #{req.id} • {req.people_count} People Affected
                  </h3>

                  <p className="text-xs text-[#17231E]/75 dark:text-[#FFF9ED]/75 mt-2 leading-relaxed line-clamp-3 font-medium">
                    {req.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#EAE3D2]/60 dark:border-[#24332D] flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-[#159B5B]" />
                      {req.address}
                    </span>
                    <span className="font-bold text-[#159B5B] dark:text-emerald-400">
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    onClick={() => handleOpenPledgeModal(req)}
                    className="w-full py-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold rounded-xl text-xs shadow-md shadow-[#159B5B]/20 hover:scale-[1.02] transition-all flex items-center justify-center space-x-2"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    <span>HELP THIS PERSON</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Pledged Donations Table */}
        {myDonations.length > 0 && (
          <div className="bg-white dark:bg-[#121C18] rounded-2xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
            <h3 className="font-bold text-[#17231E] dark:text-[#FFF9ED] text-base mb-4">My Direct Contribution History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase bg-[#FFF9ED] dark:bg-[#17231E]/60 border-b border-[#EAE3D2] dark:border-[#24332D]">
                  <tr>
                    <th className="p-3">Donation ID</th>
                    <th className="p-3">Request Ref</th>
                    <th className="p-3">Assistance Package</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Pledged At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE3D2]/50 dark:divide-[#24332D]">
                  {myDonations.map((d) => (
                    <tr key={d.id} className="hover:bg-[#FFF9ED]/60 dark:hover:bg-[#17231E]/50">
                      <td className="p-3 font-semibold text-[#17231E] dark:text-[#FFF9ED]">#{d.id}</td>
                      <td className="p-3 font-bold text-[#159B5B]">Request #{d.request_id}</td>
                      <td className="p-3 capitalize font-medium text-[#17231E] dark:text-[#FFF9ED]">{d.donation_type.replace('_', ' ')}</td>
                      <td className="p-3 text-stone-500 dark:text-stone-400">{d.notes || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] rounded font-bold uppercase text-[10px]">
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 text-stone-400">{d.created_at ? formatReportDateTime(d.created_at) : 'Today'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* "HELP THIS PERSON" Pledge Modal */}
      {activeDonationModalReq && (
        <div className="fixed inset-0 bg-[#17231E]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#EAE3D2] dark:border-[#24332D] space-y-5 animate-in zoom-in-95">
            
            <div className="flex justify-between items-start pb-3 border-b border-[#EAE3D2] dark:border-[#24332D]">
              <div>
                <span className="text-[10px] font-black text-[#159B5B] uppercase tracking-wider">Direct Assistance</span>
                <h3 className="font-extrabold text-lg text-[#17231E] dark:text-[#FFF9ED]">
                  Pledge Support for Request #{activeDonationModalReq.id}
                </h3>
              </div>
              <button 
                onClick={() => setActiveDonationModalReq(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {pledgeErrorMsg && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 rounded-2xl flex items-start space-x-2">
                <span className="font-bold text-rose-600 dark:text-rose-400">⚠️</span>
                <div>
                  <div className="font-bold">Unable to complete pledge</div>
                  <div className="text-[11px] mt-0.5">{pledgeErrorMsg}</div>
                </div>
              </div>
            )}

            {pledgeSuccessMsg ? (
              <div className="p-5 bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 rounded-2xl text-xs text-center font-bold flex flex-col items-center space-y-2 border border-[#159B5B]/30">
                <CheckCircle className="w-10 h-10 text-[#159B5B]" />
                <span className="text-sm font-black">{pledgeSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handlePledgeSubmit} className="space-y-4 text-xs">
                
                <div className="p-3.5 bg-[#FFF9ED] dark:bg-[#17231E] rounded-2xl border border-[#EAE3D2] dark:border-[#24332D]">
                  <div className="flex items-center justify-between text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                    <span>Beneficiary Need</span>
                    <span className="px-2 py-0.5 rounded bg-[#E8F3E9] text-[#159B5B] font-black">
                      {activeDonationModalReq.dnn_category || activeDonationModalReq.category}
                    </span>
                  </div>
                  <p className="text-[#17231E] dark:text-[#FFF9ED] font-medium leading-relaxed">
                    {activeDonationModalReq.description}
                  </p>
                  <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-[#159B5B]" />
                    <span>{activeDonationModalReq.address}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-2">
                    Select Contribution Type *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getContributionTypes(activeDonationModalReq).map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setDonationType(t.id)}
                        className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                          donationType === t.id 
                            ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/25 border-[#159B5B] text-[#159B5B] dark:text-emerald-300 shadow-sm' 
                            : 'bg-white dark:bg-[#17231E] border-[#EAE3D2] dark:border-[#24332D] text-[#17231E] dark:text-[#FFF9ED] hover:border-[#159B5B]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1">
                    Notes / Delivery Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={donationNotes}
                    onChange={(e) => setDonationNotes(e.target.value)}
                    placeholder="e.g. Can deliver medical aid/grocery kit this evening; please coordinate with local volunteer."
                    className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#17231E] text-[#17231E] dark:text-[#FFF9ED] p-3 outline-none focus:border-[#159B5B]"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveDonationModalReq(null)}
                    className="px-5 py-2.5 bg-[#FFF9ED] hover:bg-[#F7EBD2] dark:bg-[#17231E] dark:hover:bg-[#24332D] text-[#17231E] dark:text-[#FFF9ED] font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPledge}
                    className="px-7 py-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-black rounded-xl shadow-md shadow-[#159B5B]/25 hover:scale-105 transition-all"
                  >
                    {isSubmittingPledge ? 'Recording Pledge...' : 'CONFIRM PLEDGE'}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default DonorDashboard;
