import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, HandHelping, Heart, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'ngo') return '/ngo/dashboard';
    if (user.role === 'donor') return '/donor/dashboard';
    return '/map';
  };

  const navItems = [
    {
      path: '/',
      label: t('nav.home'),
      icon: Home,
      exact: true,
    },
    {
      path: '/map',
      label: t('nav.resources'),
      icon: MapPin,
      exact: false,
    },
    {
      path: '/request-help',
      label: t('hero.requestHelp').split(' ')[0] || 'Help',
      icon: HandHelping,
      exact: false,
    },
    {
      path: '/donor/dashboard',
      label: t('nav.donate'),
      icon: Heart,
      exact: false,
    },
    {
      path: getDashboardPath(),
      label: user ? t('nav.dashboard') : t('nav.signIn'),
      icon: user ? LayoutDashboard : User,
      exact: false,
    },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#0C1410]/95 backdrop-blur-xl border-t border-[#EAE3D2] dark:border-[#24332D] shadow-[0_-4px_20px_rgba(23,35,30,0.06)] pb-[env(safe-area-inset-bottom)] transition-colors duration-300 select-none"
    >
      <div className="grid grid-cols-5 h-14 items-center max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center h-full py-1 px-1 rounded-xl transition-all duration-200 relative cursor-pointer active:scale-95 ${
                active 
                  ? 'text-[#159B5B] dark:text-emerald-400 font-extrabold' 
                  : 'text-stone-500 dark:text-stone-400 font-semibold hover:text-[#17231E] dark:hover:text-[#FFF9ED]'
              }`}
            >
              {active && (
                <span className="absolute top-1 w-6 h-0.5 rounded-full bg-[#159B5B] dark:bg-emerald-400 animate-pulse" />
              )}
              <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 text-[#159B5B] dark:text-emerald-400' : 'opacity-80'}`} />
              <span className="text-[10px] tracking-tight truncate max-w-[64px] mt-0.5 leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
