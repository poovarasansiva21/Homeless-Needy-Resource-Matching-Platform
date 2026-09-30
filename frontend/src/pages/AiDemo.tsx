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
  ArrowRight,
  Camera,
  FileText
} from 'lucide-react';
import { aiApi } from '../services/api';
import { AiClassificationResponse, HumanitarianPipelineResponse } from '../types';
import { AiDonationScanner } from '../components/AiDonationScanner';


export const AiDemo: React.FC = () => {
  const [aiMode, setAiMode] = useState<'text' | 'vision'>('text');
  const [inputText, setInputText] = useState('I have two children and we have not had food since yesterday.');
  const [peopleCount, setPeopleCount] = useState(3);
  const [situation, setSituation] = useState('Living near Gandhipuram railway pavement.');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [result, setResult] = useState<HumanitarianPipelineResponse | any | null>(null);

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
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0D0D0D] text-[#17231E] dark:text-[#F5F5F0] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* AI Capability Mode Switcher */}
        <div className="flex rounded-2xl bg-stone-200 dark:bg-[#262626] p-1.5 border border-[#EAE3D2] dark:border-white/10">
          <button
            onClick={() => setAiMode('text')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
              aiMode === 'text'
                ? 'bg-white dark:bg-[#161616] text-[#159B5B] shadow-sm border border-[#159B5B]/30'
                : 'text-[#17231E]/70 dark:text-[#F5F5F0]/70 hover:text-[#17231E] dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Text / Voice DNN Classifier</span>
          </button>

          <button
            onClick={() => setAiMode('vision')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
              aiMode === 'vision'
                ? 'bg-white dark:bg-[#161616] text-[#159B5B] shadow-sm border border-[#159B5B]/30'
                : 'text-[#17231E]/70 dark:text-[#F5F5F0]/70 hover:text-[#17231E] dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>MobileNetV2 Vision AI Scanner</span>
          </button>
        </div>

        {/* Vision AI Tab Content */}
        {aiMode === 'vision' && (
          <div className="space-y-6">
            <AiDonationScanner />
          </div>
        )}

        {/* Text DNN Tab Content */}
        {aiMode === 'text' && (
          <div className="space-y-8">
            {/* Header Banner */}
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-10 border border-[#EAE3D2] dark:border-white/10 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 text-xs font-black px-3.5 py-1.5 rounded-full border border-[#159B5B]/20 dark:border-[#159B5B]/30 mb-2.5">
                    <Cpu className="w-4 h-4 text-[#159B5B]" />
                    <span>REAL TENSORFLOW / KERAS INFERENCE ENGINE</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-[#17231E] dark:text-white tracking-tight">
                    Live AI Classifier & Smart Matching
                  </h1>
                  <p className="text-xs sm:text-sm text-[#17231E]/70 dark:text-[#F5F5F0]/70 mt-1 max-w-xl font-medium">
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
          <div className="mt-8 pt-5 border-t border-[#EAE3D2] dark:border-white/10">
            <span className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-2.5">
              Select Pre-Configured Test Scenarios:
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(p.text)}
                  className="px-3.5 py-2 bg-[#FFF9ED] dark:bg-[#262626] hover:bg-white dark:hover:bg-[#292929] border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#159B5B] rounded-full text-xs font-bold text-[#17231E] dark:text-[#F5F5F0] shadow-sm transition-all"
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-black text-[#17231E] dark:text-[#F5F5F0] uppercase tracking-wider mb-1.5">
                Request Description (Natural Language)
              </label>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe your immediate need in plain words..."
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-white dark:bg-[#0D0D0D] p-4 text-[#17231E] dark:text-[#F5F5F0] placeholder-stone-400 dark:placeholder-stone-500 text-sm font-medium focus:border-[#159B5B] dark:focus:border-[#159B5B] outline-none shadow-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#F5F5F0] uppercase tracking-wider mb-1.5">
                  People Affected / Dependents
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-white dark:bg-[#0D0D0D] p-3 text-[#17231E] dark:text-[#F5F5F0] text-sm font-semibold outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B]"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#F5F5F0] uppercase tracking-wider mb-1.5">
                  Current Situation / Location Context
                </label>
                <input
                  type="text"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="e.g. Living near Gandhipuram railway pavement."
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-white dark:bg-[#0D0D0D] p-3 text-[#17231E] dark:text-[#F5F5F0] placeholder-stone-400 dark:placeholder-stone-500 text-sm font-medium outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B]"
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
          <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm animate-in fade-in">
            <h3 className="text-xs font-black text-[#17231E] dark:text-[#F5F5F0] uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#159B5B] animate-pulse" />
              <span>Real-Time Inference Pipeline</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${analysisStep >= 1 ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B]/40 text-[#159B5B] dark:text-emerald-300 shadow-sm' : 'bg-[#FFF9ED]/50 dark:bg-[#0D0D0D]/50 border-[#EAE3D2] dark:border-white/10 text-stone-400 dark:text-stone-500'}`}>
                <div className="text-xs font-black">1. Vectorization</div>
                <div className="text-[11px] mt-1">Tokenizing input sequence</div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${analysisStep >= 2 ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B]/40 text-[#159B5B] dark:text-emerald-300 shadow-sm' : 'bg-[#FFF9ED]/50 dark:bg-[#0D0D0D]/50 border-[#EAE3D2] dark:border-white/10 text-stone-400 dark:text-stone-500'}`}>
                <div className="text-xs font-black">2. DNN Forward Pass</div>
                <div className="text-[11px] mt-1">Embedding & Dense Layers</div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${analysisStep >= 3 ? 'bg-[#FEF6EA] dark:bg-amber-950/40 border-[#F2A33A]/40 dark:border-amber-900/40 text-[#F2A33A] dark:text-amber-300 shadow-sm' : 'bg-[#FFF9ED]/50 dark:bg-[#0D0D0D]/50 border-[#EAE3D2] dark:border-white/10 text-stone-400 dark:text-stone-500'}`}>
                <div className="text-xs font-black">3. Urgency Scoring</div>
                <div className="text-[11px] mt-1">Detecting trauma flags</div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${analysisStep >= 4 ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B]/40 text-[#159B5B] dark:text-emerald-300 shadow-sm' : 'bg-[#FFF9ED]/50 dark:bg-[#0D0D0D]/50 border-[#EAE3D2] dark:border-white/10 text-stone-400 dark:text-stone-500'}`}>
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
            
            {/* Phase 2 Advanced Humanitarian Pipeline Result Card */}
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-7 border-2 border-[#159B5B]/30 shadow-md space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#EAE3D2] dark:border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#159B5B] to-[#12834D] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                    ⚡
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#159B5B] dark:text-emerald-400 block">
                      HUMANITARIAN PIPELINE • {result.model_version || 'v2.1.0'}
                    </span>
                    <h2 className="text-3xl font-black text-[#17231E] dark:text-white tracking-tight">{result.category}</h2>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block">CONFIDENCE</span>
                    <div className="text-3xl font-black text-[#159B5B] dark:text-emerald-400">{result.confidence_percentage}%</div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block">URGENCY</span>
                    <div className="mt-1">
                      <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${getUrgencyBadge(result.urgency)}`}>
                        {result.urgency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8-POINT HUMANITARIAN STRUCTURED TELEMETRY GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* 1. Category */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500 block">1. CATEGORY</span>
                  <span className="text-sm font-black text-[#159B5B] dark:text-emerald-400 mt-0.5 block">{result.category}</span>
                </div>

                {/* 2. Urgency */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500 block">2. URGENCY</span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 block">{result.urgency}</span>
                </div>

                {/* 3. People Affected */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500 block">3. PEOPLE AFFECTED</span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">{result.people || result.people_count || 1} PEOPLE</span>
                </div>

                {/* 4. Intent */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500 block">4. INTENT</span>
                  <span className="text-xs font-bold text-[#17231E] dark:text-stone-200 mt-0.5 block truncate">{result.intent || 'SEEK_IMMEDIATE_AID'}</span>
                </div>

                {/* 5. Transport Barrier */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500 block">5. TRANSPORT BARRIER</span>
                  <span className="text-sm font-black text-[#17231E] dark:text-stone-200 mt-0.5 block">
                    {result.transport_barrier ? `TRUE (${result.transport_reason || 'COST'})` : 'FALSE'}
                  </span>
                </div>

                {/* 6. Duration of Need */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500 block">6. DURATION</span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{result.duration || '1 DAY'}</span>
                </div>

                {/* 7. Action Decision */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500 block">7. ACTION</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{result.confidence_action || 'CONTINUE'}</span>
                </div>

                {/* 8. Confidence */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10">
                  <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500 block">8. CONFIDENCE</span>
                  <span className="text-sm font-black text-[#159B5B] dark:text-emerald-400 mt-0.5 block">{result.confidence_percentage}%</span>
                </div>

              </div>

              {/* TARGETED AI FOLLOW-UP QUESTIONS (IF GENERATED) */}
              {result.follow_up_questions && result.follow_up_questions.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <div className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Targeted AI Follow-up Questions (To resolve ambiguities):</span>
                  </div>
                  <ul className="space-y-1 text-xs font-bold text-amber-800 dark:text-amber-200 list-disc list-inside">
                    {result.follow_up_questions.map((q: string, idx: number) => (
                      <li key={idx}>"{q}"</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full Probability Distribution */}
              <div className="pt-4 border-t border-[#EAE3D2] dark:border-white/10">
                <span className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider block mb-3">
                  Softmax Probability Vector Across All 7 Classes
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {result.probabilities && Object.entries(result.probabilities).map(([cat, prob]: [string, any]) => {
                    const pct = (Number(prob) * 100).toFixed(1);
                    const isTop = cat === result.category;
                    return (
                      <div 
                        key={cat} 
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isTop 
                            ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 border-[#159B5B]/50 shadow-sm font-bold' 
                            : 'bg-[#FFF9ED]/50 dark:bg-[#0D0D0D]/50 border-[#EAE3D2] dark:border-white/10'
                        }`}
                      >
                        <div className="text-[10px] font-black text-[#17231E] dark:text-[#F5F5F0] truncate">{cat}</div>
                        <div className={`text-xs font-black mt-0.5 ${isTop ? 'text-[#159B5B] dark:text-emerald-400' : 'text-stone-400'}`}>
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Matched Resources Cards */}
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-7 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-[#17231E] dark:text-[#F5F5F0] text-xl tracking-tight">Matched Nearby Community Resources</h3>
                  <p className="text-xs text-[#17231E]/60 dark:text-[#F5F5F0]/60">Ranked using spherical distance (Haversine), category compatibility, and live capacity.</p>
                </div>
                <span className="text-xs font-bold bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 px-3.5 py-1 rounded-full border border-[#159B5B]/20 dark:border-[#159B5B]/30">
                  {result.matched_resources.length} Candidates Found
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.matched_resources.map((res: any) => (

                  <div 
                    key={res.resource_id}
                    className="p-5 rounded-2xl border border-[#EAE3D2] dark:border-white/10 bg-[#FFF9ED]/30 dark:bg-[#0D0D0D]/40 hover:border-[#159B5B] dark:hover:border-[#159B5B] transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 border border-[#159B5B]/20 dark:border-[#159B5B]/30">
                            {res.organization_type}
                          </span>
                          {res.match_level && (
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              res.match_level === 'HIGH' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              res.match_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              MATCH: {res.match_level}
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-[#17231E] dark:text-[#F5F5F0] text-base mt-2">{res.resource_name}</h4>
                        <div className="flex items-center text-xs text-[#17231E]/60 dark:text-[#F5F5F0]/60 mt-1">
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

                    {/* Phase 9 Transparent Recommendation Reason Callout */}
                    {res.recommendation_reason && (
                      <div className={`mt-3 p-3.5 rounded-xl border text-xs whitespace-pre-line font-medium ${
                        res.match_score >= 60 && res.breakdown?.availability !== '✗ Currently Unavailable'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                      }`}>
                        <span className="font-black block uppercase tracking-wider text-[10px] opacity-75 mb-1">
                          RECOMMENDATION EXPLANATION
                        </span>
                        {res.recommendation_reason}
                      </div>
                    )}

                    {/* 9 Barrier-Aware Criteria Breakdown Matrix */}
                    {res.barrier_aware_breakdown && (
                      <div className="mt-3 pt-3 border-t border-[#EAE3D2] dark:border-white/10 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block">
                          9 Barrier-Aware Humanitarian Criteria
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                          {Object.entries(res.barrier_aware_breakdown).map(([key, item]: [string, any]) => (
                            <div key={key} className="flex items-center space-x-1 font-semibold truncate text-stone-700 dark:text-stone-300">
                              <span>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-[#EAE3D2] dark:border-white/10 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold block">Distance</span>
                        <span className="font-bold text-[#17231E] dark:text-[#F5F5F0]">{res.distance_km} km away</span>
                      </div>
                      <div>
                        <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold block">Availability</span>
                        <span className="font-bold text-[#159B5B] dark:text-emerald-400">{res.breakdown.availability}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs">
                      <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold block">Capacity</span>
                      <span className="font-semibold text-[#17231E]/80 dark:text-[#F5F5F0]/80">{res.breakdown.capacity}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#EAE3D2] dark:border-white/10 text-xs">
                      <span className="flex items-center text-[#17231E] dark:text-[#F5F5F0] font-semibold">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-[#159B5B]" />
                        {res.phone}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#159B5B] dark:text-emerald-400 font-black hover:underline cursor-pointer flex items-center space-x-1">
                          <span>Dispatch</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        </div>
        )}
      </div>

    </div>
  );
};

export default AiDemo;
