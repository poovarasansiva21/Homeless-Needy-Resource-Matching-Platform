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
  Settings,
  Heart,
  Sparkles
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
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOneTapModal, setShowOneTapModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Passive scroll listener for header transformation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
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

  // GSAP staggered entrance for mobile menu items
  useEffect(() => {
    if (mobileMenuOpen && mobileMenuRef.current) {
      const menuItems = mobileMenuRef.current.querySelectorAll('.mobile-menu-item');
      gsap.fromTo(
        menuItems,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power3.out' }
      );
    }
  }, [mobileMenuOpen]);

  // Determine active navigation route
  const getActiveNav = () => {
    const path = location.pathname;
    const hash = location.hash;
    if (path === '/request-help') return 'request-help';
    if (path === '/help-someone') return 'help-someone';
    if (path === '/find-help' || (path === '/' && hash === '#resources')) return 'resources';
    if (path === '/resources') return 'resources';
    if (path === '/map') return 'map';
    if (path === '/donor/dashboard') return 'donate';
    if (path === '/' && hash === '#problem') return 'about';
    if (path === '/') return 'home';
    return '';
  };

  const activeNav = getActiveNav();

  const handleNavClick = (navKey: string, targetPath: string, hash?: string) => {
    setMobileMenuOpen(false);
    
    const isHome = location.pathname === '/' || location.pathname === '/resources' || location.pathname === '/find-help';

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

  const navLinks = [
    { key: 'home', label: t('nav.home') || 'Home', path: '/' },
    { key: 'request-help', label: t('nav.requestHelp') || 'Request Help', path: '/request-help' },
    { key: 'help-someone', label: 'Help Someone', path: '/help-someone' },
    { key: 'resources', label: t('nav.resources') || 'Resources', path: '/', hash: '#resources' },
    { key: 'map', label: t('nav.map') || 'Map', path: '/map' },
    { key: 'donate', label: 'Donate', path: '/donor/dashboard' },
    { key: 'about', label: 'About', path: '/', hash: '#problem' },
  ];

  return (
    <nav
      ref={navRef}
      aria-label="Main Navigation"
      className={`fixed top-0 left-0 right-0 z-[1000] w-full pointer-events-auto transition-all duration-300 ${
        isScrolled
          ? 'py-2.5 bg-[#FCFAF6]/90 dark:bg-[#171310]/90 backdrop-blur-md border-b border-[#E9DDCC]/80 dark:border-white/10 shadow-md'
          : 'py-4 bg-[#FCFAF6]/75 dark:bg-[#171310]/75 backdrop-blur-sm border-b border-[#E9DDCC]/40 dark:border-white/5'
      }`}
    >
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* ========================================================================= */}
        {/* 1. LEFT BRAND LOGO                                                       */}
        {/* ========================================================================= */}
        <Link 
          to="/" 
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center space-x-3 group shrink-0"
        >
          <div className="w-10 h-10 lg:w-[44px] lg:h-[44px] rounded-full bg-[#3B2418] dark:bg-[#D97732] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0">
            <Heart className="w-5 h-5 fill-current text-[#D97732] dark:text-[#3B2418]" />
          </div>

          <div className="flex flex-col justify-center text-left">
            <span className="font-extrabold text-lg lg:text-xl tracking-tight text-[#3B2418] dark:text-[#FCFAF6] font-sans leading-none block">
              SAHAAYAA <span className="text-[#D97732]">AI</span>
            </span>
            <span className="text-[9px] lg:text-[10px] text-[#3B2418]/60 dark:text-[#E9DDCC]/70 font-semibold tracking-widest mt-0.5 uppercase leading-none block">
              COMMUNITY CARE
            </span>
          </div>
        </Link>

        {/* ========================================================================= */}
        {/* 2. CENTER DESKTOP NAVIGATION                                             */}
        {/* ========================================================================= */}
        <div className="hidden xl:flex items-center justify-center space-x-1 lg:space-x-2 text-xs lg:text-sm font-bold text-[#3B2418] dark:text-[#FCFAF6]/90 bg-[#F7F1E8]/60 dark:bg-[#171310]/60 p-1.5 rounded-full border border-[#E9DDCC]/60 dark:border-white/10">
          {navLinks.map((link) => {
            const isActive = activeNav === link.key;
            return (
              <button
                key={link.key}
                onClick={() => handleNavClick(link.key, link.path, link.hash)}
                className={`relative px-4 py-2 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#3B2418] dark:bg-[#D97732] text-white shadow-sm font-extrabold'
                    : 'hover:text-[#D97732] dark:hover:text-[#D97732]'
                }`}
                data-cursor="pointer"
              >
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. RIGHT ACTION CONTROLS                                                */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
          
          {/* Action 1: [🆘 I NEED HELP] Coral/Orange Pill Button */}
          <button
            type="button"
            onClick={() => setShowOneTapModal(true)}
            aria-label="I need help"
            className="h-10 px-4 rounded-full bg-[#D97732] hover:bg-[#c06524] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-[#D97732]/25 flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            data-cursor="pointer"
            title="Emergency Request Help"
          >
            <Bell className="w-3.5 h-3.5 fill-current shrink-0 animate-pulse" />
            <span>{t('nav.iNeedHelp') || 'I NEED HELP'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5 shrink-0" />
          </button>

          {/* Action 2: Language Selector */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="h-10 px-3 rounded-full bg-[#F7F1E8] dark:bg-[#231d18] text-[#3B2418] dark:text-[#FCFAF6] border border-[#E9DDCC] dark:border-white/10 text-xs font-bold flex items-center space-x-1.5 hover:border-[#D97732] transition-colors cursor-pointer"
              data-cursor="pointer"
              title="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#D97732]" />
              <span className="uppercase">{language}</span>
              <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLangMenu && (
              <div 
                ref={langDropdownRef}
                className="absolute right-0 mt-2 w-44 bg-[#FCFAF6] dark:bg-[#231d18] rounded-2xl shadow-xl border border-[#E9DDCC] dark:border-white/10 p-1.5 z-[1010] text-xs"
              >
                {supportedLanguages.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLanguage(l.id); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      language === l.id 
                        ? 'bg-[#D97732]/10 text-[#D97732]' 
                        : 'text-[#3B2418] dark:text-[#FCFAF6] hover:bg-[#F7F1E8] dark:hover:bg-[#2d2520]'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{l.flag}</span>
                      <span>{l.nativeLabel}</span>
                    </span>
                    {language === l.id && <span className="font-extrabold text-[#D97732]">✓</span>}
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
            className="h-10 w-10 rounded-full bg-[#F7F1E8] dark:bg-[#231d18] text-[#3B2418] dark:text-[#D97732] border border-[#E9DDCC] dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            data-cursor="pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#3B2418]" />}
          </button>

          {/* Action 4: User Sign In / Profile */}
          {user ? (
            <div className="flex items-center space-x-1 shrink-0">
              <Link
                to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'ngo' ? '/ngo/dashboard' : user.role === 'donor' ? '/donor/dashboard' : '/map'}
                className="h-10 px-3.5 rounded-full bg-[#F7F1E8] dark:bg-[#231d18] border border-[#E9DDCC] dark:border-white/10 text-[#3B2418] dark:text-[#FCFAF6] text-xs font-bold flex items-center space-x-1.5 hover:border-[#D97732] transition-colors"
                data-cursor="pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#D97732]" />
                <span className="max-w-[90px] truncate">{user.full_name.split(' ')[0]}</span>
              </Link>
              <button
                onClick={logout}
                className="h-10 w-10 rounded-full border border-[#E9DDCC] dark:border-white/10 text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                data-cursor="pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="h-10 px-4 rounded-full bg-[#F7F1E8] dark:bg-[#231d18] border border-[#E9DDCC] dark:border-white/10 text-[#3B2418] dark:text-[#FCFAF6] text-xs font-bold flex items-center space-x-1.5 hover:border-[#D97732] transition-colors shrink-0"
              data-cursor="pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#D97732]" />
              <span>{t('nav.signIn') || 'Sign In'}</span>
            </Link>
          )}

          {/* Action 5: Donate Button */}
          <Link
            to="/donor/dashboard"
            className="h-10 px-4 rounded-full bg-[#3B2418] dark:bg-[#231d18] hover:bg-[#2d1c13] text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-1.5 transition-all hover:scale-105 cursor-pointer shrink-0 border border-[#3B2418] dark:border-[#D97732]/40"
            data-cursor="pointer"
          >
            <Gift className="w-3.5 h-3.5 text-[#D97732]" />
            <span>{t('nav.donate') || 'Donate'}</span>
          </Link>

        </div>

        {/* ========================================================================= */}
        {/* MOBILE HEADER CONTROLS                                                   */}
        {/* ========================================================================= */}
        <div className="flex lg:hidden items-center space-x-2 shrink-0">
          
          <button
            type="button"
            onClick={() => setShowOneTapModal(true)}
            aria-label="I need help"
            className="h-10 px-3.5 rounded-full bg-[#D97732] text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Bell className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>{t('nav.iNeedHelp') || 'HELP'}</span>
          </button>

          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-10 w-10 rounded-full bg-[#F7F1E8] dark:bg-[#231d18] border border-[#E9DDCC] dark:border-white/10 text-[#3B2418] dark:text-[#FCFAF6] flex items-center justify-center focus:outline-none cursor-pointer shrink-0"
            aria-label={mobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#D97732]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MOBILE FULLSCREEN / EDITORIAL OVERLAY MENU                               */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="lg:hidden fixed inset-x-0 top-[68px] bottom-0 bg-[#FCFAF6] dark:bg-[#171310] border-b border-[#E9DDCC] dark:border-white/10 px-6 pt-6 pb-12 flex flex-col justify-between shadow-2xl z-[1020] pointer-events-auto overflow-y-auto"
        >
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D97732] block mb-2">
              NAVIGATION
            </span>
            
            {navLinks.map((link, idx) => {
              const isActive = activeNav === link.key;
              const indexNum = `0${idx + 1}`;
              return (
                <div key={link.key} className="mobile-menu-item border-b border-[#E9DDCC]/50 dark:border-white/5 pb-2">
                  <button
                    onClick={() => handleNavClick(link.key, link.path, link.hash)}
                    className={`w-full text-left py-2 text-2xl font-serif font-medium flex items-center justify-between transition-colors ${
                      isActive ? 'text-[#D97732] font-semibold' : 'text-[#3B2418] dark:text-[#FCFAF6] hover:text-[#D97732]'
                    }`}
                  >
                    <span className="flex items-center space-x-3">
                      <span className="text-xs font-sans font-bold text-stone-400">{indexNum}</span>
                      <span>{link.label}</span>
                    </span>
                    <ArrowRight className={`w-5 h-5 opacity-40 ${isActive ? 'text-[#D97732] opacity-100' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-[#E9DDCC] dark:border-white/10 space-y-3 mt-6">
            <button
              onClick={() => { setMobileMenuOpen(false); setShowOneTapModal(true); }}
              className="w-full py-4 px-4 bg-[#D97732] text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center space-x-2 shadow-md"
            >
              <Bell className="w-4 h-4 fill-current" />
              <span>{t('nav.iNeedHelp') || 'I NEED HELP NOW'}</span>
            </button>

            <Link
              to="/donor/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-4 px-4 bg-[#3B2418] dark:bg-[#231d18] text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center space-x-2 shadow-sm"
            >
              <Gift className="w-4 h-4 text-[#D97732]" />
              <span>{t('nav.donate') || 'DONATE NOW'}</span>
            </Link>

            <div className="flex items-center justify-between pt-2 text-xs">
              <div className="flex items-center space-x-2">
                {supportedLanguages.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${language === l.id ? 'bg-[#3B2418] text-white' : 'bg-[#F7F1E8] text-[#3B2418]'}`}
                  >
                    {l.flag} {l.id.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={toggleTheme}
                className="px-3.5 py-1.5 rounded-xl bg-[#F7F1E8] dark:bg-[#231d18] text-xs font-bold text-[#3B2418] dark:text-[#D97732] flex items-center space-x-1.5"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                <span>{isDark ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* One-Tap Emergency Help Modal */}
      <OneTapHelpModal
        isOpen={showOneTapModal}
        onClose={() => setShowOneTapModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </nav>
  );
};

export default Navbar;