import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  HeartHandshake, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Utensils, 
  Home, 
  Cross, 
  Shirt, 
  Cpu,
  Radio,
  Layers,
  Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { UserRole } from '../types';
import { useLanguage } from '../i18n';

/**
 * Augmented-Reality AI Resource Matching Overlay & Cinematic Topic Background
 * Displays realistic community support scene with subtle AR connection nodes,
 * glowing network lines, and dynamic light/dark atmospheric lighting.
 */
const AuthSceneLayout: React.FC<{
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badgeText?: string;
}> = ({ children, title, subtitle, badgeText = "AI RESOURCE MATCHING PLATFORM" }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-[#FFF9ED] dark:bg-[#07120F] text-[#17231E] dark:text-[#FFF9ED] transition-colors duration-500 selection:bg-emerald-600 selection:text-white">
      
      {/* ========================================================================= */}
      {/* 1. CINEMATIC TOPIC-SPECIFIC BACKGROUND IMAGE & ATMOSPHERIC LIGHTING      */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        
        {/* Authentic Community Care Documentary Photography */}
        <img 
          src="/images/auth-community-bg.jpg" 
          alt="People receiving community support and resources"
          className="w-full h-full object-cover object-center filter saturate-[1.08] contrast-[1.02] transform scale-[1.02] transition-transform duration-1000 dark:brightness-[0.45] dark:contrast-[1.12]"
        />

        {/* LIGHT MODE ATMOSPHERE: Warm natural morning glow with soft emerald vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF9ED]/92 via-[#FFF9ED]/55 to-[#FFF9ED]/80 dark:hidden" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFF9ED]/85 via-transparent to-[#FFF9ED]/85 dark:hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12)_0%,_transparent_60%)] dark:hidden" />

        {/* DARK MODE ATMOSPHERE: Deep teal shadows, dark charcoal overlay & emerald/cyan glows */}
        <div className="hidden dark:block absolute inset-0 bg-[#071310]/75" />
        <div className="hidden dark:block absolute inset-0 bg-gradient-to-b from-[#05110E]/90 via-[#071813]/70 to-[#040D0B]/95" />
        <div className="hidden dark:block absolute inset-0 bg-gradient-to-r from-[#05110E]/85 via-transparent to-[#05110E]/85" />

        {/* Atmospheric Glow Spheres (Emerald, Cyan & Soft Warm Amber) */}
        <div className="absolute top-1/4 -left-20 w-[420px] h-[420px] bg-emerald-500/15 dark:bg-emerald-500/20 rounded-full blur-[90px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-20 w-[450px] h-[450px] bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-[100px]" />
        <div className="absolute -top-16 right-1/3 w-80 h-80 bg-amber-400/15 dark:bg-amber-400/10 rounded-full blur-[80px]" />

        {/* ========================================================================= */}
        {/* 2. SUBTLE AI RESOURCE-MATCHING AUGMENTED REALITY NETWORK LAYER            */}
        {/* ========================================================================= */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-40 dark:opacity-45"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="authNetGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="authNetGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* AR Connection and matching route paths */}
          <path 
            d="M 80,220 Q 320,300 540,240 T 960,180" 
            fill="none" 
            stroke="url(#authNetGrad1)" 
            strokeWidth="1.6" 
            strokeDasharray="6 6"
            className="animate-pulse" 
          />
          <path 
            d="M 980,680 Q 720,520 540,560 T 120,620" 
            fill="none" 
            stroke="url(#authNetGrad1)" 
            strokeWidth="1.6" 
            strokeDasharray="5 5" 
          />
          <path 
            d="M 180,740 C 340,620 440,380 540,280" 
            fill="none" 
            stroke="url(#authNetGrad2)" 
            strokeWidth="1.4" 
            strokeDasharray="4 4" 
          />
          <path 
            d="M 880,240 C 720,360 660,540 540,680" 
            fill="none" 
            stroke="url(#authNetGrad2)" 
            strokeWidth="1.4" 
            strokeDasharray="4 4" 
          />

          {/* Network Nodes with subtle glowing centers */}
          <circle cx="80" cy="220" r="4" fill="#10B981" />
          <circle cx="80" cy="220" r="10" fill="url(#nodeGlow)" />
          <circle cx="960" cy="180" r="4" fill="#06B6D4" />
          <circle cx="960" cy="180" r="10" fill="url(#nodeGlow)" />
          <circle cx="120" cy="620" r="4" fill="#F59E0B" />
          <circle cx="980" cy="680" r="4" fill="#10B981" />
          <circle cx="540" cy="240" r="3" fill="#22D3EE" />
          <circle cx="540" cy="560" r="3" fill="#22D3EE" />
        </svg>

        {/* Subtle AR Resource Telemetry Badges in screen perimeter (desktop) */}
        {/* Top-Left: Food Supply Node */}
        <div className="hidden lg:flex items-center space-x-2.5 absolute top-20 left-10 xl:left-24 px-4 py-2 rounded-2xl bg-white/80 dark:bg-[#091C16]/85 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-500/40 shadow-lg text-[11px] font-bold text-[#17231E] dark:text-[#FFF9ED] animate-float">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Utensils className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">Food Distribution Hub</span>
            </div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">0.6 km • 140 Fresh Meals Ready</span>
          </div>
        </div>

        {/* Bottom-Left: Haven Shelter Node */}
        <div className="hidden lg:flex items-center space-x-2.5 absolute bottom-24 left-8 xl:left-20 px-4 py-2 rounded-2xl bg-white/80 dark:bg-[#091C16]/85 backdrop-blur-md border border-cyan-500/30 dark:border-cyan-500/40 shadow-lg text-[11px] font-bold text-[#17231E] dark:text-[#FFF9ED] animate-float-slow">
          <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Home className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-cyan-700 dark:text-cyan-400 font-extrabold">Haven Shelter Center</span>
            </div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">1.2 km • 18 Open Beds Available</span>
          </div>
        </div>

        {/* Top-Right: Mobile Clinic Node */}
        <div className="hidden lg:flex items-center space-x-2.5 absolute top-24 right-10 xl:right-24 px-4 py-2 rounded-2xl bg-white/80 dark:bg-[#091C16]/85 backdrop-blur-md border border-rose-500/30 dark:border-rose-500/40 shadow-lg text-[11px] font-bold text-[#17231E] dark:text-[#FFF9ED] animate-float-slow">
          <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Cross className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-rose-700 dark:text-rose-400 font-extrabold">Community Clinic Unit</span>
            </div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">Emergency First Aid On Duty</span>
          </div>
        </div>

        {/* Bottom-Right: Relief Essentials Node */}
        <div className="hidden lg:flex items-center space-x-2.5 absolute bottom-20 right-8 xl:right-20 px-4 py-2 rounded-2xl bg-white/80 dark:bg-[#091C16]/85 backdrop-blur-md border border-amber-500/30 dark:border-amber-500/40 shadow-lg text-[11px] font-bold text-[#17231E] dark:text-[#FFF9ED] animate-float">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Shirt className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-700 dark:text-amber-400 font-extrabold">Relief Supplies Depot</span>
            </div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">Winter Blankets & Care Packages</span>
          </div>
        </div>

        {/* Subtle AI Matching HUD overlay telemetry stamp */}
        <div className="hidden md:flex items-center space-x-3 absolute bottom-6 left-8 text-[10px] font-mono font-medium text-emerald-900/60 dark:text-emerald-400/60 tracking-wider">
          <span className="inline-flex items-center space-x-1">
            <Radio className="w-3 h-3 animate-pulse text-emerald-600 dark:text-emerald-400" />
            <span>GEO MATCH GRID: COIMBATORE TAMIL NADU</span>
          </span>
          <span>•</span>
          <span>DNN LATENCY: 38ms</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% SECURE TLS</span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. HEAVILY BLURRED FROSTED GLASS CARD CONTAINER                           */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-lg mx-auto my-6 sm:my-10">
        
        {/* The Frosted Glass Card with Backdrop Blur & Specular Glow */}
        <div 
          className="
            bg-white/90 dark:bg-[#0B1A15]/90 
            backdrop-blur-md sm:backdrop-blur-xl
            rounded-[2rem] sm:rounded-[2.25rem] 
            border border-white/80 dark:border-emerald-500/25 
            shadow-[0_15px_45px_-10px_rgba(5,150,105,0.18),inset_0_1px_1px_rgba(255,255,255,0.85)] 
            dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(16,185,129,0.25)] 
            p-4 sm:p-8 lg:p-10 
            transition-all duration-300
          "
        >
          {/* Header Brand & Mission Statement */}
          <div className="text-center space-y-2 mb-6">
            
            {/* Top Chip */}
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>{badgeText}</span>
            </div>

            {/* Core Product Headline */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#17231E] dark:text-white tracking-tight leading-tight">
              {title}
            </h1>

            {/* Subtitle Message */}
            {subtitle && (
              <p className="text-xs sm:text-[13px] text-[#17231E]/75 dark:text-stone-300 max-w-sm mx-auto font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form and interactive controls */}
          {children}

        </div>

        {/* Bottom subtle assurance */}
        <p className="text-center text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-4 tracking-wide">
          {t('auth.missionSubHeader')}
        </p>

      </div>

    </div>
  );
};

export const LoginPage: React.FC = () => {
  const { login, loginAsDemoRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.login(email, password);
      login(res.token, res.user);

      if (res.user.role === 'admin') navigate('/admin/dashboard');
      else if (res.user.role === 'ngo') navigate('/ngo/dashboard');
      else if (res.user.role === 'donor') navigate('/donor/dashboard');
      else navigate('/map');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid login credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    await loginAsDemoRole(role);
    if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'ngo') navigate('/ngo/dashboard');
    else if (role === 'donor') navigate('/donor/dashboard');
    else navigate('/map');
  };

  return (
    <AuthSceneLayout
      title={t('auth.missionHeader')}
      subtitle={t('hero.subtitle')}
      badgeText={t('aiMatching.badge')}
    >
      <div className="space-y-6">
        
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center space-x-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* 1-Click Academic Demo Logins */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>1-Click Academic Demo Logins:</span>
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
              Instant Access
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="p-3 rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/70 dark:bg-[#071712]/70 hover:bg-emerald-50/80 dark:hover:bg-[#0F261F] hover:border-emerald-500/40 text-[#17231E] dark:text-[#FFF9ED] text-xs font-bold text-left transition-all shadow-sm group"
            >
              <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-extrabold group-hover:text-emerald-600 transition-colors">
                <span>👑</span>
                <span>Admin Portal</span>
              </div>
              <span className="block text-[10px] font-normal text-stone-500 dark:text-stone-400 mt-0.5">
                DNN Verification & Audit
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ngo')}
              className="p-3 rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/70 dark:bg-[#071712]/70 hover:bg-emerald-50/80 dark:hover:bg-[#0F261F] hover:border-emerald-500/40 text-[#17231E] dark:text-[#FFF9ED] text-xs font-bold text-left transition-all shadow-sm group"
            >
              <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-extrabold group-hover:text-emerald-600 transition-colors">
                <span>🏛️</span>
                <span>NGO Coordinator</span>
              </div>
              <span className="block text-[10px] font-normal text-stone-500 dark:text-stone-400 mt-0.5">
                Relief Missions & Dispatch
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('donor')}
              className="p-3 rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/70 dark:bg-[#071712]/70 hover:bg-emerald-50/80 dark:hover:bg-[#0F261F] hover:border-emerald-500/40 text-[#17231E] dark:text-[#FFF9ED] text-xs font-bold text-left transition-all shadow-sm group"
            >
              <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-extrabold group-hover:text-emerald-600 transition-colors">
                <span>❤️</span>
                <span>Donor / Volunteer</span>
              </div>
              <span className="block text-[10px] font-normal text-stone-500 dark:text-stone-400 mt-0.5">
                Pledge Food & Resources
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('requester')}
              className="p-3 rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/70 dark:bg-[#071712]/70 hover:bg-emerald-50/80 dark:hover:bg-[#0F261F] hover:border-emerald-500/40 text-[#17231E] dark:text-[#FFF9ED] text-xs font-bold text-left transition-all shadow-sm group"
            >
              <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-extrabold group-hover:text-emerald-600 transition-colors">
                <span>👤</span>
                <span>Needy Requester</span>
              </div>
              <span className="block text-[10px] font-normal text-stone-500 dark:text-stone-400 mt-0.5">
                Track Live Relief Requests
              </span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#EAE3D2] dark:border-[#1E362D]"></div>
          <span className="flex-shrink mx-3 text-stone-400 dark:text-stone-500 text-[11px] uppercase font-bold tracking-wider">
            Or sign in with email
          </span>
          <div className="flex-grow border-t border-[#EAE3D2] dark:border-[#1E362D]"></div>
        </div>

        {/* Standard Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@sahaayaa.org"
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/80 dark:bg-[#071712]/80 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 py-3 pl-11 pr-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
              <Mail className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/80 dark:bg-[#071712]/80 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 py-3 pl-11 pr-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
              <Lock className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#159B5B] via-emerald-600 to-[#12834D] hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-full shadow-lg shadow-emerald-600/25 hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <span>Authenticating Securely...</span>
            ) : (
              <>
                <span>SIGN IN TO NETWORK</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-stone-500 dark:text-stone-400 pt-1">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-extrabold text-[#159B5B] dark:text-emerald-400 hover:underline">
            Register New Account
          </Link>
        </div>

      </div>
    </AuthSceneLayout>
  );
};

export const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('requester');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.register({
        full_name: fullName,
        email,
        password,
        role,
        phone,
        organization_name: orgName || undefined,
      });

      login(res.token, res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSceneLayout
      title={t('auth.createAccount')}
      subtitle={t('auth.signUpSubtitle')}
      badgeText={t('nav.getInvolved')}
    >
      <div className="space-y-4">
        
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center space-x-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/80 dark:bg-[#071712]/80 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 py-2.5 pl-10 pr-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
              <User className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ramesh@gmail.com"
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/80 dark:bg-[#071712]/80 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 py-2.5 pl-10 pr-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
              <Mail className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/80 dark:bg-[#071712]/80 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 py-2.5 pl-10 pr-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
              <Lock className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/80 dark:bg-[#071712]/80 text-[#17231E] dark:text-[#FFF9ED] py-2.5 px-3 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 font-semibold"
              >
                <option value="requester">Needy Requester</option>
                <option value="donor">Donor / Volunteer</option>
                <option value="ngo">NGO Organization</option>
              </select>
            </div>

            <div>
              <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1">
                Phone
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 94444 11223"
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/80 dark:bg-[#071712]/80 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 py-2.5 pl-9 pr-3 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 font-medium"
                />
                <Phone className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {role === 'ngo' && (
            <div>
              <label className="block font-black text-[#17231E] dark:text-[#FFF9ED] uppercase tracking-wider mb-1">
                Organization Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Coimbatore Seva Trust"
                  className="w-full rounded-2xl border border-[#EAE3D2] dark:border-[#1E362D] bg-white/80 dark:bg-[#071712]/80 text-[#17231E] dark:text-[#FFF9ED] placeholder-stone-400 dark:placeholder-stone-500 py-2.5 pl-10 pr-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 font-medium"
                />
                <Building className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#159B5B] via-emerald-600 to-[#12834D] hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-full shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] text-xs uppercase tracking-wider flex items-center justify-center space-x-2 mt-2"
          >
            {isLoading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>REGISTER FOR COMMUNITY ACCESS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-stone-500 dark:text-stone-400 pt-2">
          Already registered?{' '}
          <Link to="/login" className="font-extrabold text-[#159B5B] dark:text-emerald-400 hover:underline">
            Sign In Here
          </Link>
        </div>

      </div>
    </AuthSceneLayout>
  );
};

export default LoginPage;