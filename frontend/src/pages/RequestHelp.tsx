import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartHandshake, 
  Cpu, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Send,
  Phone,
  Users,
  ArrowRight
} from 'lucide-react';
import { requestsApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';

export const RequestHelp: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [description, setDescription] = useState('');
  const [statedCategory, setStatedCategory] = useState('FOOD');
  const [peopleCount, setPeopleCount] = useState(1);
  const [situation, setSituation] = useState('');
  const [address, setAddress] = useState('Gandhipuram, Coimbatore, Tamil Nadu');
  const [latitude, setLatitude] = useState(11.0183);
  const [longitude, setLongitude] = useState(76.9634);
  const [contactMethod, setContactMethod] = useState('Phone');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick live preview state
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);

  const categories = [
    "FOOD", "SHELTER", "CLOTHING", "MEDICAL", "EMERGENCY", "EDUCATION", "EMPLOYMENT"
  ];

  const handlePreviewAI = async () => {
    if (!description.trim()) return;
    setIsPreviewing(true);
    try {
      const res = await aiApi.classify(description, peopleCount, situation, latitude, longitude);
      setPreviewData(res);
    } catch (e) {
      console.warn('AI preview note:', e);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !description) {
      setError(t('request.validation'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await requestsApi.create({
        full_name: fullName,
        phone,
        description,
        category: statedCategory,
        people_count: Number(peopleCount),
        current_situation: situation,
        address,
        latitude,
        longitude,
        contact_method: contactMethod,
      });

      setSubmissionResult(response);
    } catch (err: any) {
      console.error('Request submission error:', err);
      setError(err.response?.data?.error || t('request.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] py-12 md:py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Editorial Charity Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-[#159B5B] dark:text-emerald-400">
            <span className="w-1.5 h-3.5 bg-[#159B5B] rounded-full inline-block" />
            <span>AI FOR COMMUNITY CARE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#17231E] dark:text-white tracking-tight">
            {t('request.title')}
          </h1>
          <p className="text-[#17231E]/75 dark:text-[#FFF9ED]/75 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-medium">
            {t('request.subtitle')}
          </p>
        </div>

        {/* Successful Submission State */}
        {submissionResult ? (
          <div className="bg-white dark:bg-[#121C18] rounded-3xl p-8 sm:p-10 border border-[#EAE3D2] dark:border-[#24332D] shadow-lg space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#159B5B] dark:text-emerald-400">
                AI Analysis Completed & Registered
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#17231E] dark:text-white">
                Request #{submissionResult.request.id} Confirmed
              </h2>
              <p className="text-stone-500 dark:text-stone-400 text-xs font-semibold">
                Status: <span className="font-bold text-[#F2A33A]">{submissionResult.request.status.replace('_', ' ')}</span>
              </p>
            </div>

            {/* AI Analysis Summary Box */}
            <div className="bg-[#FFF9ED] dark:bg-[#0C1410] rounded-2xl p-5 border border-[#EAE3D2] dark:border-[#24332D] grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">AI Category</span>
                <div className="text-lg font-black text-[#159B5B] dark:text-emerald-400 mt-0.5">
                  {submissionResult.ai_analysis.dnn_category}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">Urgency Priority</span>
                <div className="text-lg font-black text-[#F2A33A] mt-0.5">
                  {submissionResult.ai_analysis.urgency_level}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">DNN Confidence</span>
                <div className="text-lg font-black text-[#17231E] dark:text-[#FFF9ED] mt-0.5">
                  {(submissionResult.ai_analysis.dnn_confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Safety Disclaimer if any */}
            {submissionResult.ai_analysis.disclaimer && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                {submissionResult.ai_analysis.disclaimer}
              </div>
            )}

            {/* Matched Resources Preview */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#17231E]/70 dark:text-[#FFF9ED]/70 mb-3">
                Matched Nearby Resources ({submissionResult.matched_resources?.length || 0})
              </h4>
              <div className="space-y-2">
                {submissionResult.matched_resources?.map((res: any) => (
                  <div key={res.resource_id} className="p-3.5 bg-[#FFF9ED]/60 dark:bg-[#0C1410]/60 border border-[#EAE3D2] dark:border-[#24332D] rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-extrabold text-[#17231E] dark:text-[#FFF9ED]">{res.resource_name}</div>
                      <div className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">{res.organization_type} • {res.distance_km} km away</div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[#159B5B] dark:text-emerald-400 bg-[#E8F3E9] dark:bg-[#159B5B]/20 px-2.5 py-1 rounded-full text-[11px]">
                        {res.match_score}% Match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE3D2] dark:border-[#24332D] flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/map')}
                className="w-full sm:w-auto px-7 py-3 bg-[#159B5B] hover:bg-[#12834D] text-white font-black rounded-full text-xs uppercase tracking-wider transition-all hover:scale-105"
              >
                Track on Live Map
              </button>
              <button
                onClick={() => {
                  setSubmissionResult(null);
                  setDescription('');
                }}
                className="w-full sm:w-auto px-7 py-3 bg-[#F7EBD2]/60 dark:bg-[#1A2621] hover:bg-[#F7EBD2] dark:hover:bg-[#22332C] text-[#17231E] dark:text-[#FFF9ED] font-bold rounded-full text-xs uppercase tracking-wider transition-all"
              >
                Submit Another Request
              </button>
            </div>

          </div>
        ) : (
          /* Welcoming, Simple Submission Form */
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#121C18] rounded-3xl p-6 sm:p-10 border border-[#EAE3D2] dark:border-[#24332D] shadow-sm space-y-6">
            
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 rounded-2xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  {t('request.fullName')}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Murugan S."
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] p-3.5 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 text-sm outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  {t('request.phone')}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 91234 44004"
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] p-3.5 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 text-sm outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B] transition-all"
                />
                <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 block">{t('request.privateContact')}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider">
                  {t('request.description')}
                </label>
                <button
                  type="button"
                  onClick={handlePreviewAI}
                  disabled={isPreviewing || !description.trim()}
                  className="text-xs text-[#159B5B] dark:text-emerald-400 hover:text-[#12834D] font-bold flex items-center space-x-1"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{isPreviewing ? t('request.analyzing') : t('request.analyze')}</span>
                </button>
              </div>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Be as detailed as possible. e.g.: 'I have two children and we have not had food since yesterday. Stranded near railway track with no money.'"
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] p-4 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 text-sm outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B] transition-all"
              />
            </div>

            {/* Live AI Preview Badge */}
            {previewData && (
              <div className="p-4 bg-[#E8F3E9] dark:bg-[#159B5B]/20 border border-[#159B5B]/30 dark:border-[#159B5B]/40 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
                <div className="font-extrabold text-[#159B5B] dark:text-emerald-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Neural Preview:</span>
                </div>
                <div className="flex flex-wrap gap-4 text-[#17231E]/80 dark:text-[#FFF9ED]/80 pt-0.5 font-medium">
                  <span>Classified Category: <strong className="text-[#17231E] dark:text-[#FFF9ED]">{previewData.category}</strong></span>
                  <span>Confidence: <strong className="text-[#17231E] dark:text-[#FFF9ED]">{previewData.confidence_percentage}%</strong></span>
                  <span>Estimated Urgency: <strong className="text-[#F2A33A] dark:text-amber-400">{previewData.urgency}</strong></span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  {t('request.category')}
                </label>
                <select
                  value={statedCategory}
                  onChange={(e) => setStatedCategory(e.target.value)}
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] p-3 text-sm font-semibold outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B] bg-white dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  {t('request.people')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] p-3 text-sm font-semibold outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  {t('request.contactMethod')}
                </label>
                <select
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] p-3 text-sm font-semibold outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B] bg-white dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED]"
                >
                  <option value="Phone">Phone Call</option>
                  <option value="SMS">SMS / WhatsApp</option>
                  <option value="In-Person">In-Person Visit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  {t('request.address')}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Gandhipuram, Coimbatore"
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 p-3.5 text-sm outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
                  {t('request.situation')}
                </label>
                <input
                  type="text"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="e.g. Homeless on street, rain leaking"
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#24332D] bg-white dark:bg-[#0C1410] text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 p-3.5 text-sm outline-none focus:border-[#159B5B] dark:focus:border-[#159B5B]"
                />
              </div>
            </div>

            {/* Privacy notice banner */}
            <div className="p-4 bg-[#FFF9ED] dark:bg-[#0C1410]/60 border border-[#EAE3D2] dark:border-[#24332D] rounded-2xl text-[11px] text-stone-500 dark:text-stone-400 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-[#159B5B] dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Public and donor views only display approximate generalized coordinates to protect vulnerable individuals. Exact address is restricted to verified NGOs and Admins.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#159B5B] hover:bg-[#12834D] disabled:opacity-50 text-white font-black rounded-full shadow-md shadow-[#159B5B]/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? t('request.submitting') : t('request.submit')}</span>
            </button>

          </form>
        )}

      </div>
    </div>
  );
};

export default RequestHelp;
