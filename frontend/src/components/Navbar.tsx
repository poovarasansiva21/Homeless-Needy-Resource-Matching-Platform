import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { 
  HeartHandshake, 
  Globe, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Sparkles, 
  Sun, 
  Moon,
  ChevronDown,
  Layers,
  MapPin,
  Cpu,
  HandHelping,
  Shield,
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import { dashboardApi } from '../services/api';
import socketService from '../services/socket';
import { AppNotification, UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout, loginAsDemoRole } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, setLanguage, t, supportedLanguages, currentLanguageConfig } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const navRef = useRef<HTMLElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);

  // GSAP animation for language dropdown menu
  useEffect(() => {
    if (showLangMenu && langDropdownRef.current) {
      gsap.fromTo(
        langDropdownRef.current,
        { opacity: 0, scale: 0.95, y: -6 },
        { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out' }
      );
    }
  }, [showLangMenu]);

  // GSAP Entrance Animation on Navbar
  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(
        navRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, ease: 'power2.out' }
      );
    }
  }, []);

  // GSAP Scroll effect: transparent glass -> slightly more opaque glass -> stronger backdrop blur
  useEffect(() => {
    let isScrolled = false;
    const onScroll = () => {
      const scrolled = window.scrollY > 20;
      if (scrolled !== isScrolled) {
        isScrolled = scrolled;
        if (navRef.current) {
          gsap.to(navRef.current, {
            backgroundColor: scrolled
              ? (isDark ? 'rgba(12, 20, 16, 0.98)' : 'rgba(255, 249, 237, 0.98)')
              : (isDark ? 'rgba(12, 20, 16, 0.88)' : 'rgba(255, 249, 237, 0.90)'),
            backdropFilter: scrolled ? 'blur(24px)' : 'blur(12px)',
            boxShadow: scrolled ? '0 10px 25px -5px rgba(23, 35, 30, 0.08)' : '0 2px 10px rgba(23, 35, 30, 0.02)',
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isDark]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const notifList = await dashboardApi.getNotifications();
        setNotifications(notifList);
      } catch (e) {
        // silent fallback
      }
    };
    fetchNotifs();

    const handleNewNotif = (notif: AppNotification) => {
      setNotifications((prev) => [notif, ...prev]);
    };

    socketService.on('notification', handleNewNotif);
    socketService.on('connect', () => setSocketConnected(true));
    socketService.on('disconnect', () => setSocketConnected(false));

    return () => {
      socketService.off('notification', handleNewNotif);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: number) => {
    try {
      await dashboardApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'ngo') return '/ngo/dashboard';
    if (user.role === 'donor') return '/donor/dashboard';
    return '/map';
  };

  const handleNavClick = (hash: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/${hash}`);
    } else {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Trigger Current Location flow across the app
  const handleNearMeClick = () => {
    setMobileMenuOpen(false);
    window.dispatchEvent(new CustomEvent('request-user-location'));
    if (location.pathname === '/map') {
      // already on map, event will trigger locate
    } else if (location.pathname !== '/') {
      navigate('/#resources');
    } else {
      const element = document.querySelector('#resources');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <nav 
      ref={navRef}
      className="sticky top-0 z-50 bg-[#FFF9ED]/95 dark:bg-[#0C1410]/95 backdrop-blur-md border-b border-[#EAE3D2] dark:border-[#24332D] shadow-[0_2px_15px_rgba(23,35,30,0.03)] transition-colors duration-300 pt-[env(safe-area-inset-top)]"
    >
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 lg:h-20 gap-2 sm:gap-4">
          
          {/* Zone 1: Brand Logo & Identity - Strictly Left Aligned */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group shrink-0 mr-auto lg:mr-0 text-left">
            {/* Organic leaf & hand brandmark */}
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[#159B5B] flex items-center justify-center text-white shadow-md shadow-[#159B5B]/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-4 h-4 lg:w-5 lg:h-5"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <div className="flex flex-col justify-center text-left">
              <span className="font-extrabold text-base sm:text-xl tracking-tight text-[#17231E] dark:text-[#FFF9ED] font-sans leading-none block text-left">
                SAHAAYAA AI
              </span>
              <span className="text-[8px] sm:text-[10px] text-[#159B5B] font-bold tracking-wider mt-0.5 sm:mt-1 uppercase leading-none block text-left">
                AI FOR COMMUNITY CARE
              </span>
            </div>
          </Link>

          {/* Zone 2: Center Navigation Links (visible on xl screens) */}
          <div className="hidden 2xl:flex items-center space-x-5 text-[12px] font-bold text-[#17231E]/80 dark:text-[#FFF9ED]/80 whitespace-nowrap shrink-0">
            <button 
              onClick={() => handleNavClick('#hero')} 
              className="hover:text-[#159B5B] dark:hover:text-emerald-400 transition-colors py-1 cursor-pointer uppercase tracking-wider"
            >
              {t('nav.home')}
            </button>
            <button 
              onClick={() => handleNavClick('#how-it-works')} 
              className="hover:text-[#159B5B] dark:hover:text-emerald-400 transition-colors py-1 cursor-pointer uppercase tracking-wider"
            >
              {t('nav.howItWorks')}
            </button>
            <button 
              onClick={() => handleNavClick('#resources')} 
              className="hover:text-[#159B5B] dark:hover:text-emerald-400 transition-colors py-1 cursor-pointer uppercase tracking-wider"
            >
              {t('nav.resources')}
            </button>
            <button 
              onClick={() => handleNavClick('#impact')} 
              className="hover:text-[#159B5B] dark:hover:text-emerald-400 transition-colors py-1 cursor-pointer uppercase tracking-wider"
            >
              {t('nav.ourImpact')}
            </button>
            <button 
              onClick={() => handleNavClick('#get-involved')} 
              className="hover:text-[#159B5B] dark:hover:text-emerald-400 transition-colors py-1 cursor-pointer uppercase tracking-wider"
            >
              {t('nav.getInvolved')}
            </button>
          </div>

          {/* Zone 3: Right Action Controls - Strictly Vertically Centered with uniform h-9 */}
          <div className="hidden lg:flex items-center space-x-2 shrink-0">
            
            {/* Prominent Location Access Button "Near Me" */}
            <button
              onClick={handleNearMeClick}
              className="h-9 px-3 rounded-full bg-emerald-50 dark:bg-[#132A22] hover:bg-emerald-100 dark:hover:bg-[#1A382E] text-[#159B5B] dark:text-emerald-300 border border-[#159B5B]/30 font-extrabold text-xs flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0"
              title={t('location.useCurrentLocation')}
            >
              <Navigation className="w-3.5 h-3.5 text-[#159B5B] dark:text-emerald-400 animate-pulse" />
              <span className="whitespace-nowrap">{t('nav.nearMe')}</span>
            </button>

            {/* Live socket telemetry badge */}
            <div 
              className="h-9 px-2.5 bg-[#E8F3E9] dark:bg-[#1A2621] rounded-full text-[11px] font-bold text-[#159B5B] dark:text-emerald-400 border border-[#159B5B]/20 flex items-center space-x-1.5 shrink-0" 
              title="Flask-SocketIO Real-time Synchronization"
            >
              <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-[#159B5B] animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] tracking-wide whitespace-nowrap">{socketConnected ? t('nav.liveGrid') : t('nav.offline')}</span>
            </div>

            {/* Language / Accessibility Selector */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="h-9 px-2.5 rounded-full hover:bg-[#F7EBD2]/60 dark:hover:bg-[#24332D] text-[#17231E] dark:text-[#FFF9ED] transition-colors flex items-center space-x-1 border border-[#EAE3D2] dark:border-[#24332D] cursor-pointer"
                title={t('common.selectLanguage')}
                aria-label={t('common.selectLanguage')}
                aria-expanded={showLangMenu}
              >
                <Globe className="w-3.5 h-3.5 text-[#159B5B]" />
                <span className="text-xs font-bold leading-none">{currentLanguageConfig.id}</span>
                <ChevronDown className={`w-3 h-3 text-[#17231E]/50 dark:text-[#FFF9ED]/50 transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>

              {showLangMenu && (
                <div 
                  ref={langDropdownRef}
                  className="absolute right-0 mt-2 w-44 bg-white/95 dark:bg-[#17231E]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#EAE3D2] dark:border-[#24332D] p-1.5 z-50 text-xs"
                >
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    {t('common.language')}
                  </div>
                  {supportedLanguages.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setLanguage(l.id); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer ${
                        language === l.id 
                          ? 'bg-[#E8F3E9] dark:bg-[#159B5B]/20 text-[#159B5B] dark:text-emerald-300 font-extrabold shadow-sm' 
                          : 'text-[#17231E] dark:text-[#FFF9ED] hover:bg-[#FFF9ED] dark:hover:bg-[#24332D]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base leading-none">{l.flag}</span>
                        <span>{l.nativeLabel}</span>
                        <span className="text-[10px] opacity-60">({l.id})</span>
                      </div>
                      {language === l.id && <span className="text-[#159B5B] dark:text-emerald-400 font-extrabold">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark and Light Mode"
              title={isDark ? "Switch to Warm Light Mode" : "Switch to Dark Mode"}
              className="w-9 h-9 rounded-full bg-[#F7EBD2]/50 hover:bg-[#F7EBD2] dark:bg-[#24332D] dark:hover:bg-[#2d4039] text-[#17231E] dark:text-[#F2A33A] border border-[#EAE3D2] dark:border-[#24332D] flex items-center justify-center transition-all duration-200 shrink-0"
            >
              {isDark ? (
                <Sun className="w-4 h-4 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-[#17231E]" />
              )}
            </button>

            {/* 1-Click Demo Role Selector Pill */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="h-9 px-2.5 rounded-full bg-[#FFFFFF] dark:bg-[#24332D] border border-[#EAE3D2] dark:border-[#24332D] text-xs font-bold text-[#17231E] dark:text-[#FFF9ED] flex items-center space-x-1 hover:border-[#159B5B] transition-all shadow-sm shrink-0"
                title="Switch Demonstration Role"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F2A33A]" />
                <span className="capitalize leading-none">{user ? user.role : 'Demo Roles'}</span>
                <ChevronDown className="w-3 h-3 text-[#17231E]/60 dark:text-[#FFF9ED]/60" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#17231E] rounded-2xl shadow-xl border border-[#EAE3D2] dark:border-[#24332D] p-2 z-50 text-xs">
                  <div className="px-2 py-1 text-[10px] font-black uppercase text-[#17231E]/50 dark:text-[#FFF9ED]/50 tracking-wider">
                    {t('nav.instantDemoLogin')}
                  </div>
                  {[
                    { r: 'admin', label: t('nav.adminRole') },
                    { r: 'ngo', label: t('nav.ngoRole') },
                    { r: 'donor', label: t('nav.donorRole') },
                    { r: 'requester', label: t('nav.requesterRole') },
                  ].map(({ r, label }) => (
                    <button
                      key={r}
                      onClick={() => {
                        loginAsDemoRole(r as UserRole);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
                        user?.role === r 
                          ? 'bg-[#E8F3E9] text-[#159B5B]' 
                          : 'text-[#17231E] dark:text-[#FFF9ED] hover:bg-[#FFF9ED] dark:hover:bg-[#24332D]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative shrink-0">
              <button 
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative w-9 h-9 text-[#17231E] dark:text-[#FFF9ED] hover:bg-[#F7EBD2]/60 dark:hover:bg-[#24332D] border border-[#EAE3D2] dark:border-[#24332D] rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                aria-label={t('nav.notifications')}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F2A33A] text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#17231E] rounded-3xl shadow-2xl border border-[#EAE3D2] dark:border-[#24332D] p-4 z-50">
                  <div className="flex justify-between items-center pb-2 border-b border-[#EAE3D2] dark:border-[#24332D]">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-[#17231E] dark:text-[#FFF9ED]">
                      {t('nav.notifications')} ({notifications.length})
                    </span>
                    <button 
                      onClick={() => setShowNotifs(false)}
                      className="text-xs text-[#17231E]/40 hover:text-[#17231E] dark:text-[#FFF9ED]/40 dark:hover:text-[#FFF9ED] cursor-pointer"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-stone-400 text-center py-4">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id}
                          onClick={() => handleMarkRead(n.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer text-xs ${
                            n.is_read 
                              ? 'bg-transparent border-transparent opacity-60' 
                              : 'bg-[#E8F3E9] dark:bg-[#24332D] border-[#159B5B]/30'
                          }`}
                        >
                          <p className="font-bold text-[#17231E] dark:text-[#FFF9ED]">{n.title}</p>
                          <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dashboard / User Profile Link */}
            {user ? (
              <div className="flex items-center space-x-1.5 shrink-0">
                <Link
                  to={getDashboardPath()}
                  className="h-9 px-3 bg-[#FFF9ED] dark:bg-[#24332D] hover:bg-[#F7EBD2] dark:hover:bg-[#2f433b] text-[#17231E] dark:text-[#FFF9ED] border border-[#EAE3D2] dark:border-[#24332D] rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-[#159B5B]" />
                  <span>{t('nav.dashboard')}</span>
                </Link>
                <button
                  onClick={logout}
                  className="h-9 w-9 text-stone-400 hover:text-rose-500 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  title={t('nav.signOut')}
                  aria-label={t('nav.signOut')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="h-9 px-3.5 bg-stone-100 dark:bg-[#24332D] hover:bg-stone-200 dark:hover:bg-[#2d4039] text-[#17231E] dark:text-[#FFF9ED] rounded-full text-xs font-bold transition-all flex items-center shrink-0"
              >
                {t('nav.signIn')}
              </Link>
            )}

            {/* Highlight Donate / Offer Help Pill */}
            <Link
              to="/donor/dashboard"
              className="h-9 px-3.5 bg-[#159B5B] hover:bg-[#12834D] text-white text-xs font-black tracking-wider uppercase rounded-full shadow-sm hover:shadow-md transition-all flex items-center space-x-1 hover:scale-105 active:scale-95 shrink-0"
            >
              <span>{t('nav.donate')}</span>
            </Link>

          </div>

          {/* Mobile / Laptop Hamburger Trigger */}
          <div className="flex lg:hidden items-center space-x-2 shrink-0">
            
            {/* Mobile Near Me Shortcut */}
            <button
              onClick={handleNearMeClick}
              className="h-8 px-2.5 rounded-full bg-emerald-50 dark:bg-[#132A22] text-[#159B5B] dark:text-emerald-300 border border-[#159B5B]/30 font-extrabold text-[11px] flex items-center space-x-1"
            >
              <Navigation className="w-3 h-3 text-[#159B5B] dark:text-emerald-400 animate-pulse" />
              <span>{t('nav.nearMe')}</span>
            </button>

            {/* Theme toggle mobile */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 text-[#17231E] dark:text-[#FFF9ED]"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#17231E] dark:text-[#FFF9ED] focus:outline-none cursor-pointer"
              aria-label={mobileMenuOpen ? t('common.closeMenu') : t('nav.dashboard')}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#FFF9ED] dark:bg-[#17231E] border-b border-[#EAE3D2] dark:border-[#24332D] px-4 pt-2 pb-6 space-y-3">
          
          {/* Featured Near Me Button */}
          <button
            onClick={handleNearMeClick}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>{t('location.useCurrentLocation')}</span>
          </button>

          {/* Mobile Language Selection Section */}
          <div className="py-2 border-y border-[#EAE3D2] dark:border-[#24332D]">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block mb-1.5">
              {t('common.language')}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {supportedLanguages.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setLanguage(l.id); setMobileMenuOpen(false); }}
                  className={`py-2 px-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1 border transition-all cursor-pointer ${
                    language === l.id
                      ? 'bg-[#159B5B] text-white border-[#159B5B] shadow-sm'
                      : 'bg-white dark:bg-[#24332D] text-[#17231E] dark:text-[#FFF9ED] border-[#EAE3D2] dark:border-[#24332D]'
                  }`}
                >
                  <span className="text-sm">{l.flag}</span>
                  <span>{l.nativeLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-sm font-bold text-[#17231E] dark:text-[#FFF9ED]">
            <button 
              onClick={() => handleNavClick('#hero')} 
              className="block w-full text-left py-2 px-3 hover:bg-[#F7EBD2] dark:hover:bg-[#24332D] rounded-xl uppercase tracking-wider text-xs cursor-pointer"
            >
              {t('nav.home')}
            </button>
            <button 
              onClick={() => handleNavClick('#how-it-works')} 
              className="block w-full text-left py-2 px-3 hover:bg-[#F7EBD2] dark:hover:bg-[#24332D] rounded-xl uppercase tracking-wider text-xs cursor-pointer"
            >
              {t('nav.howItWorks')}
            </button>
            <button 
              onClick={() => handleNavClick('#resources')} 
              className="block w-full text-left py-2 px-3 hover:bg-[#F7EBD2] dark:hover:bg-[#24332D] rounded-xl uppercase tracking-wider text-xs cursor-pointer"
            >
              {t('nav.resources')}
            </button>
            <button 
              onClick={() => handleNavClick('#impact')} 
              className="block w-full text-left py-2 px-3 hover:bg-[#F7EBD2] dark:hover:bg-[#24332D] rounded-xl uppercase tracking-wider text-xs cursor-pointer"
            >
              {t('nav.ourImpact')}
            </button>
            <button 
              onClick={() => handleNavClick('#get-involved')} 
              className="block w-full text-left py-2 px-3 hover:bg-[#F7EBD2] dark:hover:bg-[#24332D] rounded-xl uppercase tracking-wider text-xs cursor-pointer"
            >
              {t('nav.getInvolved')}
            </button>
            <Link 
              to="/map" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 px-3 hover:bg-[#F7EBD2] dark:hover:bg-[#24332D] rounded-xl uppercase tracking-wider text-xs text-[#159B5B]"
            >
              {t('nav.liveResourceMap')}
            </Link>
          </div>

          <div className="pt-3 border-t border-[#EAE3D2] dark:border-[#24332D] flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 px-4 bg-[#E8F3E9] text-[#159B5B] rounded-xl text-center text-xs font-bold"
                >
                  {t('nav.dashboard')} ({user.role})
                </Link>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full py-2 px-4 bg-rose-50 text-rose-600 rounded-xl text-center text-xs font-bold cursor-pointer"
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 px-4 bg-[#159B5B] text-white rounded-xl text-center text-xs font-bold uppercase tracking-wider"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;