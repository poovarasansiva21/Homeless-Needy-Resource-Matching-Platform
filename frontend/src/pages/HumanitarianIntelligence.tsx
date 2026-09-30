import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import {
  BrainCircuit,
  Flame,
  Building2,
  AlertTriangle,
  TrendingUp,
  Clock,
  MapPin,
  ShieldAlert,
  Compass,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Info,
  Truck,
  Sparkles,
  Layers,
  Zap,
  Activity
} from 'lucide-react';
import { intelligenceApi } from '../services/api';
import { HumanitarianIntelligenceOverview, UrgencyLevel } from '../types';
import { useLanguage } from '../i18n';

// Custom Leaflet Markers for Intelligence Layer
const createHeatmapPin = (weight: number, category: string) => {
  const size = Math.max(26, Math.min(42, Math.round(weight * 36) + 18));
  const color = weight > 0.75 ? '#ef4444' : weight > 0.5 ? '#f97316' : '#eab308';

  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px;">
        <span style="position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}40; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: ${size - 10}px; height: ${size - 10}px; border-radius: 50%; background: ${color}; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 10px;">
          🔥
        </div>
      </div>
    `,
    className: 'heatmap-need-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const createResourcePin = (category: string) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: #159B5B;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(23,35,30,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
      ">
        🏛️
      </div>
    `,
    className: 'resource-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createGapPin = (gapLevel: string) => {
  const isHigh = gapLevel === 'HIGH_GAP';
  const color = isHigh ? '#a855f7' : '#d97706';

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 2.5px solid white;
        box-shadow: 0 4px 12px ${color}80;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
        font-size: 13px;
      ">
        ⚠️
      </div>
    `,
    className: 'gap-pin',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#f97316',
  SHELTER: '#06b6d4',
  CLOTHING: '#a855f7',
  MEDICAL: '#ef4444',
  EMERGENCY: '#dc2626',
  EDUCATION: '#3b82f6',
  EMPLOYMENT: '#10b981',
};

export const HumanitarianIntelligence: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<HumanitarianIntelligenceOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab View
  const [activeTab, setActiveTab] = useState<
    'maps' | 'trends' | 'time' | 'areas' | 'alerts' | 'forecast' | 'ngo_planning'
  >('maps');

  // Map Layer Selection
  const [mapLayer, setMapLayer] = useState<'NEED' | 'RESOURCE' | 'GAP' | 'ALL'>('ALL');

  const defaultCenter: [number, number] = [11.0168, 76.9558]; // Coimbatore center

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await intelligenceApi.getOverview();
      setData(res);
    } catch (err: any) {
      console.error('Error fetching humanitarian intelligence:', err);
      setError('Failed to load real database humanitarian intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#159B5B]/10 dark:bg-[#159B5B]/20 text-[#159B5B] flex items-center justify-center animate-spin">
          <BrainCircuit className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[#17231E] dark:text-[#F5F5F0]">Loading Real Database Data</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Computing spatial heatmaps, demand trends, time analysis, and NGO decision-support...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#17231E] dark:text-[#F5F5F0]">{error || 'Data Unavailable'}</h2>
        <button
          onClick={fetchOverview}
          className="px-6 py-2.5 bg-[#159B5B] hover:bg-[#12834D] text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-all shadow"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Loading Data</span>
        </button>
      </div>
    );
  }

  const {
    need_heatmap,
    resource_heatmap,
    resource_gap_map,
    demand_trend,
    time_analysis,
    area_analysis,
    shortage_alerts,
    demand_forecast,
    ngo_planning
  } = data;

  return (
    <div className="min-h-screen bg-[#FFFDF3] dark:bg-[#0D0D0D] text-[#18352D] dark:text-white pb-16 transition-colors duration-300">
      
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#0B4F3A] via-[#159B5B] to-[#0D6247] text-white pt-8 pb-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-md">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-black uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>PHASE 6 — HUMANITARIAN INTELLIGENCE LAYER</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight font-sans">
                Real Database Analytics & Decision-Support
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
                Zero fabricated statistics. Spatial need & resource heatmaps, resource gap detection, 7-category demand trends, time analysis, underserved areas, shortage alerts, and demand forecasting.
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={fetchOverview}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl text-white font-bold text-xs flex items-center space-x-2 border border-white/25 transition-all shadow-sm active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Live Data</span>
              </button>
            </div>

          </div>

          {/* Quick Real-Time Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/20">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
              <span className="text-[10px] text-emerald-200 uppercase font-black tracking-wider block">Total Active Needs</span>
              <span className="text-xl sm:text-2xl font-black text-white">{need_heatmap.total_active_needs}</span>
              <span className="text-[10px] text-emerald-200/80 block font-medium">({need_heatmap.total_people_in_need} people affected)</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
              <span className="text-[10px] text-emerald-200 uppercase font-black tracking-wider block">Available Capacity</span>
              <span className="text-xl sm:text-2xl font-black text-white">{resource_heatmap.total_available_capacity}</span>
              <span className="text-[10px] text-emerald-200/80 block font-medium">({resource_heatmap.total_verified_resources} verified hubs)</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
              <span className="text-[10px] text-purple-200 uppercase font-black tracking-wider block">Resource Gap Zones</span>
              <span className="text-xl sm:text-2xl font-black text-purple-200">{resource_gap_map.high_gap_areas_count} High Gap</span>
              <span className="text-[10px] text-purple-200/80 block font-medium">({resource_gap_map.moderate_gap_areas_count} moderate gap)</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
              <span className="text-[10px] text-amber-200 uppercase font-black tracking-wider block">Shortage Alerts</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">{shortage_alerts.active_shortage_alerts_count} Active</span>
              <span className="text-[10px] text-amber-200/80 block font-medium">(Demand &gt; Capacity)</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-6 border-b border-[#E2E8E4] dark:border-white/10 scrollbar-none">
          {[
            { id: 'maps', label: '1-3. Spatial Heatmaps & Gaps', icon: Flame },
            { id: 'trends', label: '4. 7-Category Demand Trends', icon: TrendingUp },
            { id: 'time', label: '5. Time Analysis', icon: Clock },
            { id: 'areas', label: '6. Underserved Areas', icon: MapPin },
            { id: 'alerts', label: '7. Shortage Alerts', icon: ShieldAlert },
            { id: 'forecast', label: '8. Demand Forecasting', icon: Compass },
            { id: 'ngo_planning', label: '9. NGO Planning', icon: Truck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#0B4F3A] dark:bg-[#12B76A] text-white shadow-md'
                    : 'bg-white dark:bg-[#161616] text-stone-600 dark:text-stone-300 hover:bg-[#E8F3E9] dark:hover:bg-[#262626] border border-[#E2E8E4] dark:border-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SPATIAL HEATMAPS & RESOURCE GAP MAP (Items 1, 2, 3) */}
        {activeTab === 'maps' && (
          <div className="space-y-6">
            
            {/* Map Layer Selector Bar */}
            <div className="p-4 bg-white dark:bg-[#161616] rounded-3xl border border-[#E2E8E4] dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
                <h3 className="font-extrabold text-sm text-[#18352D] dark:text-white">Interactive Layer Selection</h3>
              </div>
              <div className="flex items-center space-x-1.5 bg-[#FFFDF3] dark:bg-[#0D0D0D] p-1 rounded-2xl border border-[#E2E8E4] dark:border-white/10">
                {[
                  { id: 'ALL', label: 'All Layers Overlay' },
                  { id: 'NEED', label: '🔥 Need Heatmap' },
                  { id: 'RESOURCE', label: '🏛️ Resource Heatmap' },
                  { id: 'GAP', label: '⚠️ Resource Gap Map' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setMapLayer(l.id as any)}
                    className={`py-1.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      mapLayer === l.id
                        ? 'bg-[#0B4F3A] dark:bg-[#12B76A] text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Container */}
            <div className="w-full h-[520px] rounded-3xl overflow-hidden border border-[#E2E8E4] dark:border-white/10 shadow-lg relative bg-white">
              <MapContainer
                center={defaultCenter}
                zoom={12}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Layer 1: Need Heatmap Points */}
                {(mapLayer === 'ALL' || mapLayer === 'NEED') &&
                  need_heatmap.heatmap_points.map((pt) => (
                    <Marker
                      key={`need-${pt.id}`}
                      position={[pt.latitude, pt.longitude]}
                      icon={createHeatmapPin(pt.weight, pt.category)}
                    >
                      <Popup>
                        <div className="text-xs space-y-1 p-1 font-sans">
                          <div className="font-black text-[#18352D]">{pt.category} Assistance Demand</div>
                          <div className="text-stone-600 text-[11px]">{pt.address}</div>
                          <div className="font-bold text-rose-600">Urgency: {pt.urgency_level} ({pt.urgency_score}/100)</div>
                          <div className="text-[10px] text-stone-500 font-bold">People count: {pt.people_count}</div>
                          <div className="text-[10px] font-mono text-stone-400">Demand Weight: {pt.weight}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* Layer 2: Resource Heatmap Points */}
                {(mapLayer === 'ALL' || mapLayer === 'RESOURCE') &&
                  resource_heatmap.resource_points.map((res) => (
                    <Marker
                      key={`res-${res.id}`}
                      position={[res.latitude, res.longitude]}
                      icon={createResourcePin(res.category)}
                    >
                      <Popup>
                        <div className="text-xs space-y-1 p-1 font-sans">
                          <div className="font-bold text-[#18352D]">{res.name}</div>
                          <div className="text-stone-600 text-[11px]">{res.organization_type} • {res.category}</div>
                          <div className="text-[#159B5B] font-bold text-[11px]">Available Capacity: {res.capacity_available} units</div>
                          <div className="text-[10px] text-stone-500">{res.address}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* Layer 3: Resource Gap Overlay Markers */}
                {(mapLayer === 'ALL' || mapLayer === 'GAP') &&
                  resource_gap_map.gap_analysis
                    .filter((g) => g.gap_level !== 'BALANCED')
                    .map((gap, idx) => (
                      <Marker
                        key={`gap-${idx}`}
                        position={[gap.latitude, gap.longitude]}
                        icon={createGapPin(gap.gap_level)}
                      >
                        <Popup>
                          <div className="text-xs space-y-1 p-1 font-sans">
                            <div className="font-black text-purple-900">⚠️ RESOURCE GAP: {gap.area_name}</div>
                            <div className="text-rose-600 font-bold">People in Need: {gap.people_in_need}</div>
                            <div className="text-emerald-700 font-bold">Available Capacity: {gap.available_capacity}</div>
                            <div className="text-purple-700 font-black">Net Resource Gap: {gap.overall_gap_score} units</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
              </MapContainer>
            </div>

            {/* Gap Analysis Area Cards Grid */}
            <div className="space-y-3">
              <h3 className="font-black text-base text-[#18352D] dark:text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
                <span>3. Resource Gap Analysis by Area Zone</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resource_gap_map.gap_analysis.map((gap, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-3xl border transition-all ${
                      gap.gap_level === 'HIGH_GAP'
                        ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800/50'
                        : gap.gap_level === 'MODERATE_GAP'
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/50'
                        : 'bg-white dark:bg-[#161616] border-[#E2E8E4] dark:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#18352D] dark:text-white">{gap.area_name}</h4>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold">{gap.unfulfilled_requests} unfulfilled cases</span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                          gap.gap_level === 'HIGH_GAP'
                            ? 'bg-purple-600 text-white'
                            : gap.gap_level === 'MODERATE_GAP'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {gap.gap_level.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-800/60 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-bold">NEED</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">{gap.people_in_need} P</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-bold">CAPACITY</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{gap.available_capacity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-bold">GAP</span>
                        <span className="font-black text-purple-700 dark:text-purple-300">{gap.overall_gap_score}</span>
                      </div>
                    </div>

                    {gap.category_gaps.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-800/60 space-y-1">
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Shortage Breakdown:</span>
                        {gap.category_gaps.map((cg, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] font-bold">
                            <span className="text-stone-700 dark:text-stone-300">{cg.category}:</span>
                            <span className={cg.has_shortage ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}>
                              {cg.need_count} needed vs {cg.available_capacity} avail ({cg.gap_amount > 0 ? `+${cg.gap_amount} gap` : 'covered'})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: DEMAND TREND (Item 4) */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-[#161616] rounded-3xl border border-[#E2E8E4] dark:border-white/10 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-black text-[#18352D] dark:text-white flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
                  <span>4. 7-Category Demand Trend Tracking</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Real database request breakdown across all 7 essential humanitarian categories: FOOD, SHELTER, CLOTHING, MEDICAL, EMERGENCY, EDUCATION, EMPLOYMENT.
                </p>
              </div>

              {/* Recharts Bar Chart */}
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demand_trend.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="category" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#121C18', borderColor: '#24332D', borderRadius: '16px', color: '#FFF' }}
                    />
                    <Bar dataKey="request_count" radius={[8, 8, 0, 0]}>
                      {demand_trend.trends.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#159B5B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 7 Category Detail Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                {demand_trend.trends.map((trend) => (
                  <div
                    key={trend.category}
                    className="p-4 rounded-3xl bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-xs uppercase tracking-wider" style={{ color: CATEGORY_COLORS[trend.category] || '#159B5B' }}>
                        {trend.category}
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {trend.percentage_of_total_demand}% Share
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-2xl font-black text-[#18352D] dark:text-white">{trend.request_count}</span>
                      <span className="text-xs font-extrabold text-stone-500">{trend.people_impacted} people</span>
                    </div>

                    <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold text-stone-600 dark:text-stone-400">
                        <span>Avg Urgency Score:</span>
                        <span className="text-rose-600 dark:text-rose-400">{trend.avg_urgency_score}/100</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>Critical: {trend.urgency_breakdown.CRITICAL}</span>
                        <span>High: {trend.urgency_breakdown.HIGH}</span>
                        <span>Medium: {trend.urgency_breakdown.MEDIUM}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TIME ANALYSIS (Item 5) */}
        {activeTab === 'time' && (
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-[#161616] rounded-3xl border border-[#E2E8E4] dark:border-white/10 shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-[#18352D] dark:text-white flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
                    <span>5. Time Analysis & Peak Demand Patterns</span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Temporal pattern detection derived directly from creation timestamps of database request records.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 text-xs font-black">
                  {time_analysis.peak_hour_notice}
                </div>
              </div>

              {/* Hour of Day Distribution Area Chart */}
              <div>
                <h4 className="font-extrabold text-xs text-stone-500 uppercase tracking-wider mb-2">Demand by Hour of Day (00:00 - 23:00)</h4>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={time_analysis.by_hour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="hour" stroke="#888888" fontSize={10} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#121C18', borderColor: '#24332D', borderRadius: '16px', color: '#FFF' }} />
                      <Area type="monotone" dataKey="requests" stroke="#159B5B" fill="#159B5B" fillOpacity={0.25} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Day of Week Bar Chart */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E2E8E4] dark:border-white/10">
                <div>
                  <h4 className="font-extrabold text-xs text-stone-500 uppercase tracking-wider mb-2">Demand by Day of Week</h4>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={time_analysis.by_day} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" stroke="#888888" fontSize={10} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#121C18', borderColor: '#24332D', borderRadius: '16px', color: '#FFF' }} />
                        <Bar dataKey="requests" fill="#0B4F3A" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-xs text-stone-500 uppercase tracking-wider mb-2">Weekly Trend Progression</h4>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {time_analysis.by_week.map((w, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 flex justify-between items-center text-xs">
                        <span className="font-bold text-[#18352D] dark:text-white">{w.week}</span>
                        <span className="font-black text-[#159B5B] px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20">
                          {w.requests} requests
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: AREA ANALYSIS (Item 6) */}
        {activeTab === 'areas' && (
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-[#161616] rounded-3xl border border-[#E2E8E4] dark:border-white/10 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-black text-[#18352D] dark:text-white flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-rose-600" />
                  <span>6. Underserved Area Analysis</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Identifies underserved localities by evaluating demand density, available facility capacity, and transport barriers.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFFDF3] dark:bg-[#0D0D0D] text-stone-500 uppercase font-black tracking-wider border-b border-[#E2E8E4] dark:border-white/10">
                    <tr>
                      <th className="py-3 px-4">Area Locality</th>
                      <th className="py-3 px-4">Demand (Req / People)</th>
                      <th className="py-3 px-4">Available Capacity</th>
                      <th className="py-3 px-4">Transport Barriers</th>
                      <th className="py-3 px-4">Underserved Score</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E4] dark:divide-[#1F3F34]">
                    {area_analysis.underserved_areas.map((area, i) => (
                      <tr key={i} className="hover:bg-[#FFFDF3]/60 dark:hover:bg-[#262626]/60 transition-colors">
                        <td className="py-3.5 px-4 font-black text-[#18352D] dark:text-white">
                          {area.area_name}
                          <span className="block text-[10px] font-normal text-stone-500">Dominant: {area.dominant_category}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-rose-600">
                          {area.request_count} req ({area.people_in_need} people)
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {area.total_available_capacity} units ({area.available_resources_count} hubs)
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-600">
                          {area.transport_barrier_count} flagged
                        </td>
                        <td className="py-3.5 px-4 font-black text-purple-700 dark:text-purple-300">
                          {area.underserved_score}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              area.status === 'CRITICALLY_UNDERSERVED'
                                ? 'bg-rose-600 text-white'
                                : area.status === 'MODERATELY_UNDERSERVED'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {area.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RESOURCE SHORTAGE ALERTS (Item 7) */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-[#161616] rounded-3xl border border-[#E2E8E4] dark:border-white/10 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-black text-[#18352D] dark:text-white flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>7. Dynamic Resource Shortage Alerts</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Generated automatically from real database comparisons whenever category demand exceeds available verified resources in an area.
                </p>
              </div>

              {shortage_alerts.alerts.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-200 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  ✓ No critical resource shortages detected. Available resources currently cover all area demand.
                </div>
              ) : (
                <div className="space-y-3">
                  {shortage_alerts.alerts.map((alt) => (
                    <div
                      key={alt.id}
                      className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        alt.severity === 'CRITICAL'
                          ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60'
                          : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase text-white ${
                              alt.severity === 'CRITICAL' ? 'bg-rose-600' : 'bg-amber-500'
                            }`}
                          >
                            {alt.severity} ALERT
                          </span>
                          <span className="font-extrabold text-xs text-stone-700 dark:text-stone-300">{alt.area_name} • {alt.category}</span>
                        </div>
                        {/* Requirement format match */}
                        <p className="font-black text-sm text-[#18352D] dark:text-white">
                          "{alt.message}"
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 text-xs font-bold">
                        <div>
                          <span className="text-[10px] text-stone-500 block">DEMAND</span>
                          <span className="text-rose-600 font-black">{alt.demand_request_count} req</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-500 block">AVAILABLE</span>
                          <span className="text-emerald-600 font-black">{alt.available_resource_capacity} units</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: DEMAND FORECASTING (Item 8) */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-[#161616] rounded-3xl border border-[#E2E8E4] dark:border-white/10 shadow-sm space-y-6">
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-black text-[#18352D] dark:text-white">
                    8. Predictive Demand Forecasting Engine
                  </h3>
                </div>
                {/* Required disclaimer compliance */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl text-amber-900 dark:text-amber-300 text-xs font-bold flex items-start space-x-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{demand_forecast.disclaimer}</span>
                </div>
              </div>

              {/* Required Wording Metrics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                    Estimated Demand (7 Days)
                  </span>
                  <span className="text-3xl font-black text-indigo-900 dark:text-indigo-200">
                    {demand_forecast.forecast_summary.estimated_demand_next_7_days} requests
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 block mt-1">
                    Forecast Range: {demand_forecast.forecast_summary.forecast_range_7d}
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 block">
                    Estimated Demand (30 Days)
                  </span>
                  <span className="text-3xl font-black text-cyan-900 dark:text-cyan-200">
                    {demand_forecast.forecast_summary.estimated_demand_next_30_days} requests
                  </span>
                  <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 block mt-1">
                    Daily Rate: ~{demand_forecast.forecast_summary.forecast_daily_rate} req/day
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Confidence Level
                  </span>
                  <span className="text-3xl font-black text-emerald-900 dark:text-emerald-200">
                    {demand_forecast.forecast_summary.confidence}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mt-1">
                    Based on {demand_forecast.forecast_summary.historical_sample_size} real DB records
                  </span>
                </div>
              </div>

              {/* Category-wise Forecast Breakdown Cards */}
              <div className="space-y-3 pt-2">
                <h4 className="font-extrabold text-xs text-stone-500 uppercase tracking-wider">7-Category Estimated Demand Forecasts</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {demand_forecast.category_forecasts.map((cf) => (
                    <div key={cf.category} className="p-3.5 rounded-2xl bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-black" style={{ color: CATEGORY_COLORS[cf.category] || '#159B5B' }}>{cf.category}</span>
                        <span className="text-[10px] font-bold text-stone-500">Hist: {cf.historical_count}</span>
                      </div>
                      <div className="text-lg font-black text-[#18352D] dark:text-white">
                        Est. Demand: {cf.estimated_demand_7d}
                      </div>
                      <div className="text-[10px] font-semibold text-stone-500">
                        Forecast Range: {cf.forecast_range}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600">
                        Confidence: {cf.confidence_percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 7: NGO PLANNING (Item 9) */}
        {activeTab === 'ngo_planning' && (
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-[#161616] rounded-3xl border border-[#E2E8E4] dark:border-white/10 shadow-sm space-y-6">
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-[#0B4F3A] dark:text-[#12B76A]" />
                  <h3 className="text-lg font-black text-[#18352D] dark:text-white">
                    9. NGO Strategic Planning & Decision-Support Panel
                  </h3>
                </div>
                {/* Required compliance notice */}
                <div className="p-3 bg-[#E8F3E9] dark:bg-[#159B5B]/20 border border-[#159B5B]/40 rounded-2xl text-[#0B4F3A] dark:text-emerald-300 text-xs font-black flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#159B5B] shrink-0" />
                  <span>Notice: {ngo_planning.usage_notice}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* High Need Areas */}
                <div className="p-4 rounded-3xl bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 space-y-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-rose-600 flex items-center space-x-1.5">
                    <Flame className="w-4 h-4" />
                    <span>High Need Areas</span>
                  </h4>
                  <div className="space-y-2">
                    {ngo_planning.high_need_areas.map((h, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-[#E2E8E4] dark:border-white/10 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-black text-[#18352D] dark:text-white">{h.area_name}</span>
                          <span className="block text-[10px] text-stone-500">Dominant Need: {h.dominant_category}</span>
                        </div>
                        <span className="font-extrabold text-rose-600 px-2 py-1 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                          {h.people_in_need} people ({h.unfulfilled_requests} unfulfilled)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Low Resource Areas */}
                <div className="p-4 rounded-3xl bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 space-y-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>Low Resource Areas</span>
                  </h4>
                  <div className="space-y-2">
                    {ngo_planning.low_resource_areas.map((l, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-[#E2E8E4] dark:border-white/10 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-black text-[#18352D] dark:text-white">{l.area_name}</span>
                          <span className="block text-[10px] text-stone-500">{l.resource_count} active centers</span>
                        </div>
                        <span className="font-extrabold text-amber-600 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                          {l.available_capacity} capacity available
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transport Barriers */}
                <div className="p-4 rounded-3xl bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 space-y-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-purple-600 flex items-center space-x-1.5">
                    <Truck className="w-4 h-4" />
                    <span>Transport Barriers</span>
                  </h4>
                  <div className="space-y-2">
                    {ngo_planning.transport_barriers.map((tb, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-[#E2E8E4] dark:border-white/10 text-xs space-y-1">
                        <div className="flex justify-between font-extrabold text-[#18352D] dark:text-white">
                          <span>{tb.area}</span>
                          <span className="text-purple-600">{tb.barrier_reason}</span>
                        </div>
                        <div className="text-[10px] text-stone-500">{tb.pickup_address} • {tb.people_count} people</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Critical Cases */}
                <div className="p-4 rounded-3xl bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 space-y-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-rose-600 flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Pending Critical Cases</span>
                  </h4>
                  <div className="space-y-2">
                    {ngo_planning.pending_critical_cases.map((pc) => (
                      <div key={pc.id} className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-[#E2E8E4] dark:border-white/10 text-xs space-y-1">
                        <div className="flex justify-between font-extrabold text-[#18352D] dark:text-white">
                          <span>{pc.category} Need #{pc.id} ({pc.area})</span>
                          <span className="text-rose-600 font-black">{pc.urgency_level}</span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1">{pc.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HumanitarianIntelligence;
