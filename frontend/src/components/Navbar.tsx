import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { 
  Bell, 
  Globe, 
  Sun, 
  Moon, 
  User as UserIcon, 
  Gift, 
  ChevronDown, 
  Menu, 
  X, 
  LogOut,
  ArrowRight,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import OneTapHelpModal from './OneTapHelpModal';
import SettingsModal from './SettingsModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { t, language, setLanguage, supportedLanguages } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const navRef = useRef<HTMLElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOneTapModal, setShowOneTapModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Passive scroll listener for subtle top vs scrolled navbar visual transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP animation for language dropdown menu
  useEffect(() => {
    if (showLangMenu && langDropdownRef.current) {
      gsap.fromTo(
        langDropdownRef.current,
        { opacity: 0, scale: 0.95, y: -6 },
        { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, [showLangMenu]);

  // Determine active navigation route
  const getActiveNav = () => {
    const path = location.pathname;
    const hash = location.hash;
    if (path === '/request-help') return 'request-help';
    if (path === '/find-help' || (path === '/' && hash === '#resources')) return 'find-help';
    if (path === '/resources') return 'resources';
    if (path === '/map') return 'map';
    if (path === '/') return 'home';
    return '';
  };

  const activeNav = getActiveNav();

  const handleNavClick = (navKey: string, targetPath: string, hash?: string) => {
    setMobileMenuOpen(false);
    
    const isHome = location.pathname === '/' || location.pathname === '/resources' || location.pathname === '/find-help';

    // Dynamic smooth scroll to element on page
    if (hash) {
      if (isHome) {
        const el = document.querySelector(hash);
        if (el) {
          const yOffset = -85;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          return;
        }
      } else {
        navigate('/' + hash);
        setTimeout(() => {
          const el = document.querySelector(hash);
          if (el) {
            const yOffset = -85;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 300);
        return;
      }
    }
    
    if (targetPath === '/' && isHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    navigate(targetPath);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Main Navigation"
      className={`fixed top-0 left-0 right-0 z-[1000] w-full pointer-events-auto transition-all duration-300 ${
        isScrolled
          ? 'bg-[#F9F6F0]/95 dark:bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#E7E0D6] dark:border-white/10 shadow-sm'
          : 'bg-[#F9F6F0]/90 dark:bg-[#0D0D0D]/90 backdrop-blur-sm border-b border-[#E7E0D6]/80 dark:border-white/5'
      }`}
      style={{ minHeight: '76px' }}
    >
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-[76px] lg:h-[82px] flex items-center justify-between">
        
        {/* ========================================================================= */}
        {/* 1. LEFT BRAND LOGO                                                       */}
        {/* ========================================================================= */}
        <Link 
          to="/" 
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center space-x-3 group shrink-0 w-[220px] sm:w-[260px]"
        >
          {/* Circular charcoal logo badge with leaf icon */}
          <div className="w-10 h-10 lg:w-[46px] lg:h-[46px] rounded-full bg-[#1C1917] dark:bg-[#262626] border border-[#333]/10 dark:border-white/10 flex items-center justify-center text-[#F25C38] shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-5 h-5 lg:w-5 lg:h-5"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>

          <div className="flex flex-col justify-center text-left">
            <span className="font-extrabold text-base sm:text-lg lg:text-xl tracking-tight text-[#1C1917] dark:text-[#F5F5F0] font-sans leading-none block">
              SAHAAYAA AI
            </span>
            <span className="text-[8px] sm:text-[9px] lg:text-[10px] text-[#78716C] dark:text-[#A8A29E] font-bold tracking-widest mt-1 uppercase leading-none block">
              AI FOR COMMUNITY CARE
            </span>
          </div>
        </Link>

        {/* ========================================================================= */}
        {/* 2. CENTER MAIN NAVIGATION                                                */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex items-center justify-center space-x-3 lg:space-x-5 xl:space-x-7 text-sm lg:text-[14px] xl:text-[15px] font-semibold text-[#1C1917] dark:text-[#F5F5F0]/90 mx-2 shrink-0">
          
          {user?.role === 'admin' ? (
            <>
              {/* ADMIN COMMAND CENTER */}
              <button
                onClick={() => handleNavClick('admin-dashboard', '/admin/dashboard')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  location.pathname.startsWith('/admin') 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>Command Center</span>
                {location.pathname.startsWith('/admin') && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>

              {/* HELP REPORTS */}
              <button
                onClick={() => handleNavClick('help-reports', '/help-reports')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  location.pathname.startsWith('/help-reports') 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>Help Reports</span>
                {location.pathname.startsWith('/help-reports') && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>

              {/* LIVE MAP */}
              <button
                onClick={() => handleNavClick('map', '/map')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeNav === 'map' 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>Live Map</span>
                {activeNav === 'map' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>

              {/* INTELLIGENCE */}
              <button
                onClick={() => handleNavClick('intelligence', '/intelligence')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  location.pathname.startsWith('/intelligence') 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>Intelligence</span>
                {location.pathname.startsWith('/intelligence') && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>
            </>
          ) : (
            <>
              {/* HOME */}
              <button
                onClick={() => handleNavClick('home', '/')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeNav === 'home' 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>{t('nav.home')}</span>
                {activeNav === 'home' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>

              {/* REQUEST HELP */}
              <button
                onClick={() => handleNavClick('request-help', '/request-help')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeNav === 'request-help' 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>{t('nav.requestHelp')}</span>
                {activeNav === 'request-help' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[38px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>

              {/* FIND HELP */}
              <button
                onClick={() => handleNavClick('find-help', '/', '#resources')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeNav === 'find-help' 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>{t('nav.findHelp')}</span>
                {activeNav === 'find-help' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>

              {/* RESOURCES */}
              <button
                onClick={() => handleNavClick('resources', '/', '#resources')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeNav === 'resources' 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>{t('nav.resources')}</span>
                {activeNav === 'resources' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>

              {/* MAP */}
              <button
                onClick={() => handleNavClick('map', '/map')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeNav === 'map' 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>{t('nav.map')}</span>
                {activeNav === 'map' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>

              {/* HELP REPORTS DASHBOARD */}
              <button
                onClick={() => handleNavClick('help-reports', '/help-reports')}
                className={`relative py-2 transition-colors cursor-pointer whitespace-nowrap ${
                  location.pathname.startsWith('/help-reports') 
                    ? 'text-[#F25C38] font-bold' 
                    : 'hover:text-[#F25C38]'
                }`}
              >
                <span>Help Reports</span>
                {location.pathname.startsWith('/help-reports') && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34px] h-[2.5px] bg-[#F25C38] rounded-full" />
                )}
              </button>
            </>
          )}

        </div>

        {/* ========================================================================= */}
        {/* 3. RIGHT ACTION CONTROLS                                                */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex items-center space-x-2 shrink-0">
          
          {/* Action 1: [🆘 I NEED HELP] Coral Pill Button */}
          <button
            type="button"
            onClick={() => setShowOneTapModal(true)}
            aria-label="I need help"
            className="h-10 px-3.5 sm:px-4 rounded-full bg-[#F25C38] hover:bg-[#E04925] text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0 min-h-[40px]"
            title="Emergency Request Help"
          >
            <Bell className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>{t('nav.iNeedHelp')}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5 shrink-0" />
          </button>

          {/* Action 2: Language Selector */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="h-10 px-3 rounded-full bg-[#FAF7F2] dark:bg-[#161616] text-[#1C1917] dark:text-[#F5F5F0] border border-[#E7E0D6] dark:border-white/10 text-xs font-bold flex items-center space-x-1.5 hover:border-[#F25C38] transition-colors cursor-pointer min-h-[40px]"
              title="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#F25C38]" />
              <span className="uppercase">{language}</span>
              <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLangMenu && (
              <div 
                ref={langDropdownRef}
                className="absolute right-0 mt-2 w-40 bg-[#FAF7F2] dark:bg-[#161616] rounded-2xl shadow-xl border border-[#E7E0D6] dark:border-white/10 p-1.5 z-[1010] text-xs"
              >
                {supportedLanguages.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLanguage(l.id); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      language === l.id 
                        ? 'bg-[#F25C38]/10 text-[#F25C38]' 
                        : 'text-[#1C1917] dark:text-[#F5F5F0] hover:bg-[#F3ECE2] dark:hover:bg-[#222222]'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{l.flag}</span>
                      <span>{l.nativeLabel}</span>
                    </span>
                    {language === l.id && <span className="font-extrabold text-[#F25C38]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action 3: Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            title={isDark ? "Switch to Warm Light Mode" : "Switch to Dark Mode"}
            className="h-10 w-10 rounded-full bg-[#FAF7F2] dark:bg-[#161616] text-[#1C1917] dark:text-[#F25C38] border border-[#E7E0D6] dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[40px]"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-700" />}
          </button>

          {/* Action 4: User Sign In / Dashboard */}
          {user ? (
            <div className="flex items-center space-x-1 shrink-0">
              <Link
                to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'ngo' ? '/ngo/dashboard' : user.role === 'donor' ? '/donor/dashboard' : '/map'}
                className="h-10 px-3.5 rounded-full bg-[#FAF7F2] dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 text-[#1C1917] dark:text-[#F5F5F0] text-xs font-semibold flex items-center space-x-1.5 hover:border-[#F25C38] transition-colors min-h-[40px]"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#F25C38]" />
                <span className="max-w-[90px] truncate">{user.full_name.split(' ')[0]}</span>
              </Link>
              <button
                onClick={logout}
                className="h-10 w-10 rounded-full border border-[#E7E0D6] dark:border-white/10 text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer min-h-[40px]"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="h-10 px-3.5 rounded-full bg-[#FAF7F2] dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 text-[#1C1917] dark:text-[#F5F5F0] text-xs font-semibold flex items-center space-x-1.5 hover:border-[#F25C38] transition-colors shrink-0 min-h-[40px]"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#F25C38]" />
              <span>{t('nav.signIn')}</span>
            </Link>
          )}

          {/* Action 5: Donate Button */}
          <Link
            to="/donor/dashboard"
            className="h-10 px-4 rounded-full bg-[#1C1917] dark:bg-[#262626] hover:bg-[#292524] text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0 min-h-[40px]"
          >
            <Gift className="w-3.5 h-3.5 text-[#F25C38]" />
            <span>{t('nav.donate')}</span>
          </Link>

        </div>

        {/* ========================================================================= */}
        {/* MOBILE HEADER CONTROLS                                                   */}
        {/* ========================================================================= */}
        <div className="flex lg:hidden items-center space-x-2 shrink-0">
          
          {/* Mobile Emergency Button */}
          <button
            type="button"
            onClick={() => setShowOneTapModal(true)}
            aria-label="I need help"
            className="h-10 px-3.5 rounded-full bg-[#F25C38] hover:bg-[#E04925] text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0 min-h-[40px]"
            title="Emergency Request Help"
          >
            <Bell className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className="inline">{t('nav.iNeedHelp')}</span>
          </button>

          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-10 w-10 rounded-full bg-[#FAF7F2] dark:bg-[#161616] border border-[#E7E0D6] dark:border-white/10 text-[#1C1917] dark:text-[#F5F5F0] flex items-center justify-center focus:outline-none cursor-pointer shrink-0 min-h-[40px] min-w-[40px]"
            aria-label={mobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MOBILE MENU DROPDOWN                                                     */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF7F2] dark:bg-[#161616] border-b border-[#E7E0D6] dark:border-white/10 px-5 pt-3 pb-8 space-y-4 rounded-b-3xl shadow-2xl animate-in slide-in-from-top-2 duration-200 z-[1020] pointer-events-auto max-h-[calc(100vh-80px)] overflow-y-auto">
          
          <div className="space-y-1 text-base font-bold text-[#1C1917] dark:text-[#F5F5F0]">
            <button
              onClick={() => handleNavClick('home', '/')}
              className={`block w-full text-left py-3 px-4 rounded-2xl transition-colors ${activeNav === 'home' ? 'bg-[#F25C38]/10 text-[#F25C38] font-black' : 'hover:bg-stone-100 dark:hover:bg-[#222222]'}`}
            >
              {t('nav.home')}
            </button>
            <button
              onClick={() => handleNavClick('request-help', '/request-help')}
              className={`block w-full text-left py-3 px-4 rounded-2xl transition-colors ${activeNav === 'request-help' ? 'bg-[#F25C38]/10 text-[#F25C38] font-black' : 'hover:bg-stone-100 dark:hover:bg-[#222222]'}`}
            >
              {t('nav.requestHelp')}
            </button>
            <button
              onClick={() => handleNavClick('find-help', '/', '#resources')}
              className={`block w-full text-left py-3 px-4 rounded-2xl transition-colors ${activeNav === 'find-help' ? 'bg-[#F25C38]/10 text-[#F25C38] font-black' : 'hover:bg-stone-100 dark:hover:bg-[#222222]'}`}
            >
              {t('nav.findHelp')}
            </button>
            <button
              onClick={() => handleNavClick('resources', '/', '#resources')}
              className={`block w-full text-left py-3 px-4 rounded-2xl transition-colors ${activeNav === 'resources' ? 'bg-[#F25C38]/10 text-[#F25C38] font-black' : 'hover:bg-stone-100 dark:hover:bg-[#222222]'}`}
            >
              {t('nav.resources')}
            </button>
            <button
              onClick={() => handleNavClick('map', '/map')}
              className={`block w-full text-left py-3 px-4 rounded-2xl transition-colors ${activeNav === 'map' ? 'bg-[#F25C38]/10 text-[#F25C38] font-black' : 'hover:bg-stone-100 dark:hover:bg-[#222222]'}`}
            >
              {t('nav.map')}
            </button>
          </div>

          <div className="pt-3 border-t border-[#E7E0D6] dark:border-white/10 space-y-3">
            {/* Full Width Coral I NEED HELP Button */}
            <button
              onClick={() => { setMobileMenuOpen(false); setShowOneTapModal(true); }}
              className="w-full py-3.5 px-4 bg-[#F25C38] hover:bg-[#E04925] text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center space-x-2 shadow-sm cursor-pointer min-h-[48px]"
            >
              <Bell className="w-5 h-5 fill-current" />
              <span>{t('nav.iNeedHelp')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Full Width Charcoal Donate Button */}
            <Link
              to="/donor/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3.5 px-4 bg-[#1C1917] dark:bg-[#262626] hover:bg-[#292524] text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center space-x-2 shadow-sm min-h-[48px]"
            >
              <Gift className="w-5 h-5 text-[#F25C38]" />
              <span>{t('nav.donate')}</span>
            </Link>

            {/* Sign In button */}
            {user ? (
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full py-3 px-4 bg-rose-50 text-rose-600 font-bold rounded-2xl text-center text-sm min-h-[48px]"
              >
                {t('nav.signOut')} ({user.full_name})
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 px-4 bg-white dark:bg-[#262626] border-2 border-[#075C4F] text-[#075C4F] dark:text-[#12B76A] font-bold rounded-2xl text-center text-sm block min-h-[48px]"
              >
                {t('nav.signIn')}
              </Link>
            )}

            {/* Language & Theme Controls row */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                {supportedLanguages.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${language === l.id ? 'bg-[#075C4F] text-white' : 'bg-stone-100 text-stone-700'}`}
                  >
                    {l.flag} {l.id.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={toggleTheme}
                className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-[#262626] text-xs font-bold text-[#075C4F] dark:text-[#F2A33A] flex items-center space-x-1.5 cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button
                onClick={() => { setMobileMenuOpen(false); setShowSettingsModal(true); }}
                className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-[#262626] text-xs font-bold text-[#075C4F] dark:text-[#12B76A] flex items-center space-x-1.5 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#075C4F] dark:text-[#12B76A]" />
                <span>Settings</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* One-Tap Help Modal */}
      <OneTapHelpModal
        isOpen={showOneTapModal}
        onClose={() => setShowOneTapModal(false)}
      />

      {/* Platform Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </nav>
  );
};

export default Navbar;