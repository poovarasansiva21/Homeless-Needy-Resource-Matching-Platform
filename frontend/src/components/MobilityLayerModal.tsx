import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  AlertTriangle, 
  Handshake, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  X, 
  ChevronRight,
  UserCheck,
  AlertOctagon,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import { mobilityApi } from '../services/api';
import { 
  TransportInfoItem, 
  TransportBarrierReason, 
  TransportReportReason, 
  AssistanceTrip, 
  TripStatus 
} from '../types';

interface MobilityLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId?: number;
  resourceName?: string;
  resourceAddress?: string;
  requestId?: number;
  initialBarrierReason?: TransportBarrierReason;
}

export const MobilityLayerModal: React.FC<MobilityLayerModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceName = 'Selected Resource Center',
  resourceAddress = 'Coimbatore Location',
  requestId,
  initialBarrierReason
}) => {
  const [activeTab, setActiveTab] = useState<'BARRIER_SELECT' | 'ROUTES_LIST' | 'REPORT_FORM' | 'REQUEST_ASSISTANCE' | 'TRIP_TRACKER'>('BARRIER_SELECT');
  
  const [selectedReason, setSelectedReason] = useState<TransportBarrierReason>(initialBarrierReason || 'cannot_afford_transport');
  const [routes, setRoutes] = useState<TransportInfoItem[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState<boolean>(false);
  const [safetyNotice, setSafetyNotice] = useState<string>('');

  // Report Form State
  const [selectedRouteToReport, setSelectedRouteToReport] = useState<TransportInfoItem | null>(null);
  const [reportReason, setReportReason] = useState<TransportReportReason>('wrong_fare');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);

  // Assistance Request State
  const [pickupAddress, setPickupAddress] = useState<string>('Gandhipuram Central Bus Stand, Coimbatore');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [requestNotes, setRequestNotes] = useState<string>('');
  const [submittingAssistance, setSubmittingAssistance] = useState<boolean>(false);
  const [currentTrip, setCurrentTrip] = useState<AssistanceTrip | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialBarrierReason) {
        setSelectedReason(initialBarrierReason);
        fetchRoutes();
        setActiveTab('ROUTES_LIST');
      } else {
        setActiveTab('BARRIER_SELECT');
      }
    }
  }, [isOpen, resourceId, initialBarrierReason]);

  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const res = await mobilityApi.getRoutes(resourceId);
      setRoutes(res.routes || []);
      setSafetyNotice(res.safety_disclaimer || "Free/concession travel may be available for eligible users. Verify eligibility before travelling.");
    } catch (err) {
      console.error("Failed to load transport routes:", err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleSelectBarrier = async (reason: TransportBarrierReason) => {
    setSelectedReason(reason);
    try {
      await mobilityApi.logBarrier({
        resource_id: resourceId,
        request_id: requestId,
        barrier_reason: reason
      });
    } catch (e) {
      console.error("Failed to log barrier:", e);
    }
    await fetchRoutes();
    setActiveTab('ROUTES_LIST');
  };

  const handleOpenReportForm = (route: TransportInfoItem) => {
    setSelectedRouteToReport(route);
    setReportSubmitted(false);
    setActiveTab('REPORT_FORM');
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mobilityApi.reportInfo({
        transport_info_id: selectedRouteToReport?.id,
        reason: reportReason,
        details: reportDetails
      });
      setReportSubmitted(true);
      setTimeout(() => {
        fetchRoutes();
        setActiveTab('ROUTES_LIST');
      }, 1500);
    } catch (err) {
      console.error("Failed to submit transport report:", err);
    }
  };

  const handleRequestAssistanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAssistance(true);
    try {
      const res = await mobilityApi.requestAssistance({
        pickup_address: pickupAddress,
        destination_address: `${resourceName}, ${resourceAddress}`,
        barrier_reason: selectedReason,
        resource_id: resourceId,
        request_id: requestId,
        people_count: peopleCount
      });
      if (res.trip) {
        setCurrentTrip(res.trip);
        setActiveTab('TRIP_TRACKER');
      }
    } catch (err) {
      console.error("Failed to request transport assistance:", err);
    } finally {
      setSubmittingAssistance(false);
    }
  };

  const refreshTripStatus = async () => {
    if (!currentTrip?.trip_code) return;
    try {
      const res = await mobilityApi.getTripDetails(currentTrip.trip_code);
      if (res.trip) {
        setCurrentTrip(res.trip);
      }
    } catch (err) {
      console.error("Failed to refresh trip status:", err);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            🟢 VERIFIED
          </span>
        );
      case 'NEEDS_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            🟡 NEEDS VERIFICATION
          </span>
        );
      case 'UNVERIFIED_REPORTED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            🔴 UNVERIFIED / REPORTED
          </span>
        );
    }
  };

  const tripPipelineSteps: { state: TripStatus; label: string }[] = [
    { state: 'REQUESTED', label: 'Requested' },
    { state: 'ACCEPTED', label: 'Accepted' },
    { state: 'RESPONDER_ASSIGNED', label: 'Responder Assigned' },
    { state: 'ON_THE_WAY', label: 'On The Way' },
    { state: 'PICKUP_CONFIRMED', label: 'Pickup Confirmed' },
    { state: 'DESTINATION_REACHED', label: 'Destination Reached' },
    { state: 'COMPLETED', label: 'Completed' }
  ];

  const getStepIndex = (status: TripStatus) => {
    return tripPipelineSteps.findIndex(s => s.state === status);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-emerald-950/20 text-slate-100 my-8">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Mobility & Trust-Route Layer</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Phase 3</span>
              </div>
              <p className="text-xs text-slate-400">Can this person realistically reach the recommended resource?</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          
          {/* TAB 1: BARRIER SELECTION */}
          {activeTab === 'BARRIER_SELECT' && (
            <div className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-300 text-sm">Resource Accessibility Check</h4>
                  <p className="text-xs text-amber-200/80 mt-1">
                    Destination: <span className="font-bold text-white">{resourceName}</span> ({resourceAddress})
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-base text-white mb-1">🚌 Why can't you reach this resource?</h4>
                <p className="text-xs text-slate-400 mb-4">Select your primary mobility barrier so Sahaayaa AI can find verified routes or dispatch volunteer transit assistance.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'cannot_afford_transport', title: 'Cannot Afford Transport', desc: 'No funds for bus, auto or train ticket', icon: DollarSign },
                    { id: 'too_far', title: 'Too Far to Walk', desc: 'Distance exceeds safe walking capability', icon: MapPin },
                    { id: 'no_transport', title: 'No Available Transport', desc: 'No direct bus route or public vehicle option', icon: Bus },
                    { id: 'with_children', title: 'Travelling with Children', desc: 'Accompanied by infants/dependents', icon: UserCheck },
                    { id: 'other', title: 'Other Mobility Barrier', desc: 'Physical disability, age or unsafe route', icon: AlertOctagon },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectBarrier(item.id as TransportBarrierReason)}
                      className="text-left p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 transition-all group flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-200 group-hover:text-white flex items-center justify-between">
                          {item.title}
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROUTES LIST & SAFETY NOTICES */}
          {activeTab === 'ROUTES_LIST' && (
            <div className="space-y-6">
              {/* Back to selection */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setActiveTab('BARRIER_SELECT')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                >
                  ← Change Mobility Barrier
                </button>
                <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded">
                  Barrier: {selectedReason.toUpperCase().replace(/_/g, ' ')}
                </span>
              </div>

              {/* Safety Rule Warning Banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">Important Safety Rule</h4>
                  <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                    "{safetyNotice}"
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    * No fake bus routes or unverified fares are displayed. Only authenticated municipal & shelter shuttle registries are listed.
                  </p>
                </div>
              </div>

              {/* Verified Routes List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">Verified Public & Shuttle Transit Options</h4>
                  <button onClick={fetchRoutes} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {loadingRoutes ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    Fetching verified transport directory...
                  </div>
                ) : routes.length === 0 ? (
                  <div className="p-6 bg-slate-800/40 rounded-2xl text-center text-slate-400 text-xs">
                    No direct public routes verified for this exact location. Proceed to request verified volunteer assistance below.
                  </div>
                ) : (
                  routes.map((route) => (
                    <div key={route.id} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{route.provider}</span>
                            {getStatusBadge(route.status)}
                          </div>
                          <p className="text-xs text-amber-300 font-medium mt-1">📍 {route.route_name}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-bold text-emerald-400">{route.fare_display}</span>
                          {route.is_free_or_concession && (
                            <div className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mt-1">
                              Concession / Free Pass Available
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-400 font-semibold">Eligibility:</span> <span className="text-slate-200">{route.eligibility}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold">Verified Source:</span> <span className="text-slate-200">{route.source}</span>
                        </div>
                        {route.last_verified && (
                          <div>
                            <span className="text-slate-400 font-semibold">Last Verified:</span> <span className="text-slate-300">{route.last_verified}</span>
                          </div>
                        )}
                        {route.review_expiry_date && (
                          <div>
                            <span className="text-slate-400 font-semibold">Expiry Date:</span> <span className="text-slate-300">{route.review_expiry_date}</span>
                          </div>
                        )}
                      </div>

                      {/* Safety Report Action */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleOpenReportForm(route)}
                          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> ⚠️ REPORT TRANSPORT INFORMATION
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Prompt for Volunteer Assistance */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-2xl p-5 text-center space-y-3">
                <Handshake className="w-8 h-8 text-amber-400 mx-auto" />
                <div>
                  <h4 className="font-bold text-sm text-white">Is public transport unavailable or unsuitable for you?</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Request emergency Sahaayaa verified volunteer ride assistance directly to {resourceName}.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('REQUEST_ASSISTANCE')}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <Handshake className="w-4 h-4" /> 🤝 REQUEST TRANSPORT ASSISTANCE
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: REPORT TRANSPORT INFORMATION (⚠️ REPORT FORM) */}
          {activeTab === 'REPORT_FORM' && (
            <div className="space-y-5">
              <button 
                onClick={() => setActiveTab('ROUTES_LIST')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
              >
                ← Back to Routes
              </button>

              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-rose-300">⚠️ REPORT TRANSPORT INFORMATION</h4>
                  <p className="text-xs text-rose-200/80 mt-0.5">
                    Flag incorrect details or suspicious activity. Flagged routes are immediately moved to <span className="font-bold text-white">🔴 UNVERIFIED/REPORTED</span> state.
                  </p>
                  {selectedRouteToReport && (
                    <p className="text-xs text-slate-300 font-mono mt-2 bg-slate-900/60 p-2 rounded border border-slate-800">
                      Target Route: {selectedRouteToReport.provider} - {selectedRouteToReport.route_name}
                    </p>
                  )}
                </div>
              </div>

              {reportSubmitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-base text-emerald-300">Report Submitted Successfully</h4>
                  <p className="text-xs text-slate-300">Thank you for keeping our community safe. This transport route has been flagged for immediate audit.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Select Reason for Report *</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value as TransportReportReason)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="wrong_fare">Wrong Fare Charged</option>
                      <option value="wrong_route">Wrong Bus Route Number</option>
                      <option value="wrong_timing">Incorrect Schedule / Timing</option>
                      <option value="fake_driver">Fake Driver / Unauthorized Vehicle</option>
                      <option value="fake_volunteer">Fake Volunteer Impression</option>
                      <option value="unexpected_payment">Unexpected Payment Demand</option>
                      <option value="fake_ngo">Fake NGO Claim</option>
                      <option value="suspicious_information">Suspicious Information / Safety Threat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Additional Incident Details (Optional)</label>
                    <textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Provide vehicle number, location or description..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('ROUTES_LIST')}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all"
                    >
                      Submit Safety Report ⚠️
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: REQUEST TRANSPORT ASSISTANCE FORM */}
          {activeTab === 'REQUEST_ASSISTANCE' && (
            <div className="space-y-5">
              <button 
                onClick={() => setActiveTab('ROUTES_LIST')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
              >
                ← Back to Verified Routes
              </button>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                <Handshake className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-300">🤝 REQUEST TRANSPORT ASSISTANCE</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Dispatches a verified Sahaayaa volunteer or partner NGO shuttle to transport you safely to <span className="font-bold text-white">{resourceName}</span>.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRequestAssistanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Your Pickup Location / Nearby Landmark *</label>
                  <input
                    type="text"
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="e.g. Gandhipuram Bus Stand, Opp. Clock Tower"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Destination Center</label>
                  <input
                    type="text"
                    disabled
                    value={`${resourceName}, ${resourceAddress}`}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Number of Passengers</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Mobility Barrier Reason</label>
                    <input
                      type="text"
                      disabled
                      value={selectedReason.toUpperCase().replace(/_/g, ' ')}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-amber-300 font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Specific Instructions / Needs (Optional)</label>
                  <textarea
                    rows={2}
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="e.g. Carrying 2 young children, standing near bus stop shelter..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAssistance}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-base rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {submittingAssistance ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Requesting Transport Assistance...
                    </>
                  ) : (
                    <>
                      <Handshake className="w-5 h-5" /> Generate Trip Request & Track
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: REAL-TIME TRIP TRACKER STEPPER */}
          {activeTab === 'TRIP_TRACKER' && currentTrip && (
            <div className="space-y-6">
              {/* Generated Trip Code Badge */}
              <div className="bg-slate-850 border border-amber-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ASSISTANCE / TRIP ID</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-black text-amber-400 font-mono">{currentTrip.trip_code}</span>
                    <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full font-bold">
                      {currentTrip.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={refreshTripStatus}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
                </button>
              </div>

              {/* Pipeline Stepper Progression */}
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Trip Progression Pipeline</h4>
                
                <div className="relative pl-6 border-l-2 border-slate-700 space-y-5">
                  {tripPipelineSteps.map((step, idx) => {
                    const currentIdx = getStepIndex(currentTrip.status);
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={step.state} className="relative flex items-center justify-between">
                        {/* Stepper Dot */}
                        <div 
                          className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            isCompleted 
                              ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/30' 
                              : 'bg-slate-900 border-slate-600'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-3 h-3 text-slate-950" />}
                        </div>

                        <div>
                          <p className={`text-sm font-semibold ${isCurrent ? 'text-amber-400 font-bold' : isCompleted ? 'text-emerald-300' : 'text-slate-500'}`}>
                            {idx + 1}. {step.label}
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            ACTIVE STAGE
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Responder Info Card (Privacy Enforced) */}
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Authorized / Verified Responder Info
                </h4>

                {currentTrip.assigned_responder ? (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-750 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                        🛡️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{currentTrip.assigned_responder.display_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            VERIFIED RESPONDER
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {currentTrip.assigned_responder.role} • {currentTrip.assigned_responder.organization}
                        </p>
                      </div>
                    </div>
                    {currentTrip.assigned_responder.phone && (
                      <a
                        href={`tel:${currentTrip.assigned_responder.phone}`}
                        className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 transition-colors"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900/60 p-4 rounded-xl text-center text-xs text-slate-400 border border-slate-800">
                    <Clock className="w-5 h-5 mx-auto text-amber-400 mb-1 animate-pulse" />
                    Searching for nearest authorized volunteer responder...
                    <p className="text-[11px] text-slate-500 mt-1">Only verified responders are shown. Personal data is protected.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('ROUTES_LIST')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs rounded-xl"
                >
                  View Alternative Transit Routes
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Close & Keep Tracking
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
