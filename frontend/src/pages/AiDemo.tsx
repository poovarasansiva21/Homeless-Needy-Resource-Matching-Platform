import React, { useState } from 'react';
import { 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Sparkles, 
  ShieldAlert,
  Activity,
  Layers,
  Search,
  ExternalLink,
  Flame,
  ArrowRight
} from 'lucide-react';
import { aiApi } from '../services/api';
import { AiClassificationResponse } from '../types';

export const AiDemo: React.FC = () => {
  const [inputText, setInputText] = useState('I have two children and we have not had food since yesterday.');
  const [peopleCount, setPeopleCount] = useState(3);
  const [situation, setSituation] = useState('Living near Gandhipuram railway pavement.');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [result, setResult] = useState<AiClassificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    { label: "🍲 Food Crisis (High)", text: "I have two children and we have not had food since yesterday." },
    { label: "🏠 Eviction / Shelter (Critical)", text: "Evicted from rented room, family sleeping in cold rain on the pavement tonight." },
    { label: "🩺 Medical Urgency", text: "Grandmother has high fever and severe chest congestion, urgent medicine and inhaler needed." },
    { label: "🚨 Life Threat Emergency", text: "Slum hut caught fire, multiple people trapped inside call rescue team now!" },
    { label: "👕 Winter Warmth Clothing", text: "Need warm blankets and sweaters for shivering children this winter." },
    { label: "📚 School Education Aid", text: "Underprivileged student needs school textbooks, notebooks, and school bag." },
    { label: "💼 Daily Wage Job", text: "Unemployed carpenter seeking daily wage jobs or carpentry tools to feed family." }
  ];

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    setAnalysisStep(1); // Text Processing
    setTimeout(() => setAnalysisStep(2), 350); // DNN Prediction
    setTimeout(() => setAnalysisStep(3), 700); // Urgency Estimation
    setTimeout(() => setAnalysisStep(4), 1050); // Geo Matching

    try {
      const response = await aiApi.classify(inputText, peopleCount, situation);
      setTimeout(() => {
        setResult(response);
        setIsLoading(false);
        setAnalysisStep(5);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'AI analysis is temporarily unavailable. Please verify backend connection and try again.');
      setIsLoading(false);
      setAnalysisStep(0);
    }
  };

  const getUrgencyBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';
      case 'HIGH':
        return 'bg-[#FEF6EA] dark:bg-amber-950/60 text-[#F2A33A] dark:text-amber-300 border-[#F2A33A]/30 dark:border-amber-900/60';
      case 'MEDIUM':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
      default:
        return 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 border-[#159B5B]/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 sm:p-10 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 text-xs font-black px-3.5 py-1.5 rounded-full border border-[#159B5B]/20 dark:border-[#159B5B]/30 mb-2.5">
                <Cpu className="w-4 h-4 text-[#159B5B]" />
                <span>REAL TENSORFLOW / KERAS INFERENCE ENGINE</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#17231E] dark:text-white tracking-tight">
                Live AI Classifier & Smart Matching
              </h1>
              <p className="text-xs sm:text-sm text-[#17231E]/70 dark:text-[#FFF9ED]/70 mt-1 max-w-xl font-medium">
                Enter any unstructured text description. The trained neural network computes probabilistic categories and executes Haversine geo-matching.
              </p>
            </div>
            
            <div className="bg-[#17231E] text-white rounded-2xl p-4 text-xs border border-[#24332D] shadow-md space-y-1">
              <div className="font-black text-[#159B5B] dark:text-emerald-400 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>resource_classifier.keras</span>
              </div>
              <div className="text-stone-300 text-[11px]">Input: TextVectorization (vocab=3000)</div>
              <div className="text-stone-400 text-[10px]">Output: 7-Class Softmax Vector</div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-8 pt-5 border-t border-[#EAE3D2] dark:border-[#24332D]">
            <span className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-2.5">
              Select Pre-Configured Test Scenarios:
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(p.text)}
                  className="px-3.5 py-2 bg-[#FFF9ED] dark:bg-[#1A2621] hover:bg-white dark:hover:bg-[#22332C] border border-[#EAE3D2] dark:border-[#24332D] hover:border-[#159B5B] dark:hover:border-[#159B5B] rounded-full text-xs font-bold text-[#17231E] dark:text-[#FFF9ED] shadow-sm transition-all"
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                Request Description (Natural Language)
              </label>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe your immediate need in plain words..."
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] p-4 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 text-sm font-medium focus:border-[#159B5B] dark:focus:border-[#159B5B] outline-none shadow-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  People Affected / Dependents
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] p-3 text-[#17231E] dark:text-[#FFF9ED] text-sm font-semibold outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B]"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  Current Situation / Location Context
                </label>
                <input
                  type="text"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="e.g. Living near Gandhipuram railway pavement."
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] p-3 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 text-sm font-medium outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !inputText.trim()}
                className="w-full sm:w-auto px-10 py-3.5 bg-[#159B5B] hover:bg-[#12834D] disabled:opacity-50 text-white font-black rounded-full shadow-md shadow-[#159B5B]/20 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
              >
                {isLoading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Inference In Progress...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>ANALYZE REQUEST WITH DNN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Step Progress Pipeline */}
        {isLoading && (
          <div className="bg-white dark:bg-[#121C18] rounded-3xl p-6 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm animate-in fade-in">
            <h3 className="text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#159B5B] animate-pulse" />
              <span>Real-Time Inference Pipeline</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${analysisStep >= 1 ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B]/40 text-[#159B5B] dark:text-emerald-300 shadow-sm' : 'bg-[#FFF9ED]/50 dark:bg-[#0C1410]/50 border-[#EAE3D2] dark:border-[#24332D] text-stone-400 dark:text-stone-500'}`}>
                <div className="text-xs font-black">1. Vectorization</div>
                <div className="text-[11px] mt-1">Tokenizing input sequence</div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${analysisStep >= 2 ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B]/40 text-[#159B5B] dark:text-emerald-300 shadow-sm' : 'bg-[#FFF9ED]/50 dark:bg-[#0C1410]/50 border-[#EAE3D2] dark:border-[#24332D] text-stone-400 dark:text-stone-500'}`}>
                <div className="text-xs font-black">2. DNN Forward Pass</div>
                <div className="text-[11px] mt-1">Embedding & Dense Layers</div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${analysisStep >= 3 ? 'bg-[#FEF6EA] dark:bg-amber-950/40 border-[#F2A33A]/40 dark:border-amber-900/40 text-[#F2A33A] dark:text-amber-300 shadow-sm' : 'bg-[#FFF9ED]/50 dark:bg-[#0C1410]/50 border-[#EAE3D2] dark:border-[#24332D] text-stone-400 dark:text-stone-500'}`}>
                <div className="text-xs font-black">3. Urgency Scoring</div>
                <div className="text-[11px] mt-1">Detecting trauma flags</div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${analysisStep >= 4 ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B]/40 text-[#159B5B] dark:text-emerald-300 shadow-sm' : 'bg-[#FFF9ED]/50 dark:bg-[#0C1410]/50 border-[#EAE3D2] dark:border-[#24332D] text-stone-400 dark:text-stone-500'}`}>
                <div className="text-xs font-black">4. Geo-Matcher</div>
                <div className="text-[11px] mt-1">Haversine distance ranking</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 p-4 rounded-2xl text-xs flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Showcase */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Primary Analysis Card */}
            <div className="bg-white dark:bg-[#121C18] rounded-3xl p-7 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#EAE3D2] dark:border-[#24332D]">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 flex items-center justify-center font-bold">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">Classified Need</span>
                    <h2 className="text-3xl font-black text-[#17231E] dark:text-[#FFF9ED] tracking-tight">{result.category}</h2>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <span className="text-[11px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">DNN Confidence</span>
                    <div className="text-3xl font-black text-[#159B5B] dark:text-emerald-400">{result.confidence_percentage}%</div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">Assessed Priority</span>
                    <div className="mt-1">
                      <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${getUrgencyBadge(result.urgency)}`}>
                        {result.urgency} ({result.urgency_score}/100)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Urgency Factors & Safety Disclaimer */}
              <div className="space-y-3">
                {result.indicators && result.indicators.length > 0 && (
                  <div>
                    <span className="text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider block mb-2">
                      Detected Urgency Factors:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.indicators.map((ind, i) => (
                        <span key={i} className="px-3 py-1 bg-[#FFF9ED] dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] rounded-full text-xs font-bold border border-[#EAE3D2] dark:border-[#24332D]">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.disclaimer && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{result.disclaimer}</span>
                  </div>
                )}
              </div>

              {/* Full Probability Distribution */}
              <div className="pt-5 border-t border-[#EAE3D2] dark:border-[#24332D]">
                <span className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider block mb-3">
                  Softmax Probability Distribution Across All 7 Classes
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {Object.entries(result.probabilities).map(([cat, prob]) => {
                    const pct = (prob * 100).toFixed(1);
                    const isTop = cat === result.category;
                    return (
                      <div 
                        key={cat} 
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          isTop 
                            ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B]/50 dark:border-[#159B5B]/40 shadow-sm scale-105' 
                            : 'bg-[#FFF9ED]/50 dark:bg-[#0C1410]/50 border-[#EAE3D2] dark:border-[#24332D]'
                        }`}
                      >
                        <div className="text-[11px] font-black text-[#17231E] dark:text-[#FFF9ED] truncate">{cat}</div>
                        <div className={`text-sm font-black mt-1 ${isTop ? 'text-[#159B5B] dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}`}>
                          {pct}%
                        </div>
                        <div className="w-full bg-white dark:bg-[#1A2621] rounded-full h-1.5 mt-2 overflow-hidden border border-[#EAE3D2] dark:border-[#24332D]">
                          <div 
                            style={{ width: `${Math.max(5, prob * 100)}%` }}
                            className={`h-full rounded-full ${isTop ? 'bg-[#159B5B]' : 'bg-stone-300 dark:bg-stone-600'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Matched Resources Cards */}
            <div className="bg-white dark:bg-[#121C18] rounded-3xl p-7 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-[#17231E] dark:text-[#FFF9ED] text-xl tracking-tight">Matched Nearby Community Resources</h3>
                  <p className="text-xs text-[#17231E]/60 dark:text-[#FFF9ED]/60">Ranked using spherical distance (Haversine), category compatibility, and live capacity.</p>
                </div>
                <span className="text-xs font-bold bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 px-3.5 py-1 rounded-full border border-[#159B5B]/20 dark:border-[#159B5B]/30">
                  {result.matched_resources.length} Candidates Found
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.matched_resources.map((res) => (
                  <div 
                    key={res.resource_id}
                    className="p-5 rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-[#FFF9ED]/30 dark:bg-[#0C1410]/40 hover:border-[#159B5B] dark:hover:border-[#159B5B] transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 border border-[#159B5B]/20 dark:border-[#159B5B]/30">
                          {res.organization_type}
                        </span>
                        <h4 className="font-black text-[#17231E] dark:text-[#FFF9ED] text-base mt-2">{res.resource_name}</h4>
                        <div className="flex items-center text-xs text-[#17231E]/60 dark:text-[#FFF9ED]/60 mt-1">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-stone-400" />
                          <span>{res.address}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase">Match Score</div>
                        <div className="text-2xl font-black text-[#159B5B] dark:text-emerald-400">
                          {res.match_score}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EAE3D2] dark:border-[#24332D] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold block">Distance</span>
                        <span className="font-bold text-[#17231E] dark:text-[#FFF9ED]">{res.distance_km} km away</span>
                      </div>
                      <div>
                        <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold block">Availability</span>
                        <span className="font-bold text-[#159B5B] dark:text-emerald-400">{res.breakdown.availability}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs">
                      <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold block">Capacity</span>
                      <span className="font-semibold text-[#17231E]/80 dark:text-[#FFF9ED]/80">{res.breakdown.capacity}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#EAE3D2] dark:border-[#24332D] text-xs">
                      <span className="flex items-center text-[#17231E] dark:text-[#FFF9ED] font-semibold">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-[#159B5B]" />
                        {res.phone}
                      </span>
                      <span className="text-[#159B5B] dark:text-emerald-400 font-black hover:underline cursor-pointer flex items-center space-x-1">
                        <span>Dispatch Case</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default AiDemo;
