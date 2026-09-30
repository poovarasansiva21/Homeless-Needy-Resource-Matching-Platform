import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, Bell, User, LayoutDashboard, Search, HandHelping } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import OneTapHelpModal from './OneTapHelpModal';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [showOneTapModal, setShowOneTapModal] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/login';
    return '/profile';
  };

  const navItems = [
    {
      path: '/',
      label: t('nav.home'),
      icon: Home,
      exact: true,
    },
    {
      path: '/find-help',
      label: 'Find Help',
      icon: Search,
      exact: false,
    },
    {
      path: '/request-help',
      label: 'Request',
      icon: HandHelping,
      exact: false,
    },
    {
      path: '/map',
      label: t('nav.map'),
      icon: MapPin,
      exact: false,
    },
    {
      path: getDashboardPath(),
      label: user ? 'Profile' : t('nav.signIn'),
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
    <>
      {/* Floating Emergency Help Action Button above mobile bottom navigation */}
      <button
        type="button"
        onClick={() => setShowOneTapModal(true)}
        aria-label="I Need Help Emergency Action"
        className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-4 z-40 lg:hidden px-4 py-2.5 bg-[#F25C38] hover:bg-[#E04925] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-lg shadow-[#F25C38]/30 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Bell className="w-4 h-4 fill-current animate-pulse shrink-0" />
        <span>🆘 I NEED HELP</span>
      </button>

      <nav 
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#FFFDF7]/95 dark:bg-[#161616]/95 backdrop-blur-xl border-t border-[#E2DAD0] dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)] transition-colors duration-300 select-none"
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
                    ? 'text-[#F25C38] dark:text-[#F25C38] font-extrabold' 
                    : 'text-stone-500 dark:text-stone-400 font-semibold hover:text-[#171514] dark:hover:text-[#F5F0E5]'
                }`}
              >
                {active && (
                  <span className="absolute top-1 w-6 h-0.5 rounded-full bg-[#F25C38] dark:bg-[#F25C38] animate-pulse" />
                )}
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 text-[#F25C38] dark:text-[#F25C38]' : 'opacity-80'}`} />
                <span className="text-[10px] tracking-tight truncate max-w-[64px] mt-0.5 leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* One Tap Help Modal */}
      <OneTapHelpModal
        isOpen={showOneTapModal}
        onClose={() => setShowOneTapModal(false)}
      />
    </>
  );
};

export default BottomNav;
