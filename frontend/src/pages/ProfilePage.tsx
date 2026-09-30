import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  HandHelping, 
  FileText, 
  HeartHandshake, 
  MapPin, 
  Building, 
  Crown, 
  LogOut, 
  Sun, 
  Moon, 
  Settings, 
  ChevronRight, 
  Sparkles,
  Phone,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import SettingsModal from '../components/SettingsModal';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Authorized Admin', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30', icon: Crown };
      case 'ngo':
        return { label: 'NGO Coordinator', bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', icon: Building };
      case 'donor':
        return { label: 'Donor / Volunteer', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-orange-400 border-emerald-500/30 dark:border-orange-500/30', icon: HeartHandshake };
      default:
        return { label: 'Community Requester', bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30', icon: User };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FFF9ED] dark:bg-[#0D0D0D] text-[#17231E] dark:text-[#F5F5F0] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Profile Card Header */}
        <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-[#EAE3D2] dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            
            {/* Avatar Circle */}
            <div className="w-20 h-20 rounded-full bg-[#159B5B] dark:bg-[#F25C38] text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0 border-4 border-white dark:border-[#161616]">
              {user ? user.full_name.charAt(0).toUpperCase() : '👤'}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-[#17231E] dark:text-white tracking-tight">
                  {user ? user.full_name : 'Guest User'}
                </h1>
                <span className={`px-3 py-0.5 rounded-full text-[11px] font-extrabold border flex items-center space-x-1 ${roleInfo.bg}`}>
                  <RoleIcon className="w-3 h-3" />
                  <span>{roleInfo.label}</span>
                </span>
              </div>

              {user?.email && (
                <div className="text-xs text-stone-500 dark:text-stone-400 font-medium flex items-center justify-center sm:justify-start space-x-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user.email}</span>
                </div>
              )}

              {user?.phone && (
                <div className="text-xs text-stone-500 dark:text-stone-400 font-medium flex items-center justify-center sm:justify-start space-x-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{user.phone}</span>
                </div>
              )}

              <div className="pt-1 flex items-center justify-center sm:justify-start space-x-2 text-[10px] font-bold text-emerald-600 dark:text-orange-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B5B] dark:text-orange-400" />
                <span>Verified SAHAAYAA Community Profile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Dashboard Routing Shortcuts */}
        <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">
            Quick Navigation & Dashboards
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/request-help"
              className="p-4 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] hover:bg-[#E8F3E9] dark:hover:bg-[#1C1917] border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#F25C38] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#159B5B]/10 dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 flex items-center justify-center font-bold">
                  <HandHelping className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[#17231E] dark:text-white">Request Assistance</div>
                  <div className="text-[11px] text-stone-500">Submit new help request</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/help-reports"
              className="p-4 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] hover:bg-[#E8F3E9] dark:hover:bg-[#1C1917] border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#F25C38] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#159B5B]/10 dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[#17231E] dark:text-white">Help Reports Feed</div>
                  <div className="text-[11px] text-stone-500">Track & verify community cases</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/donor/dashboard"
              className="p-4 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] hover:bg-[#E8F3E9] dark:hover:bg-[#1C1917] border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#F25C38] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#159B5B]/10 dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 flex items-center justify-center font-bold">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[#17231E] dark:text-white">Donor / Volunteer Hub</div>
                  <div className="text-[11px] text-stone-500">Pledge resources & delivery</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/map"
              className="p-4 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] hover:bg-[#E8F3E9] dark:hover:bg-[#1C1917] border border-[#EAE3D2] dark:border-white/10 hover:border-[#159B5B] dark:hover:border-[#F25C38] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#159B5B]/10 dark:bg-orange-950/40 text-[#159B5B] dark:text-orange-400 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[#17231E] dark:text-white">Interactive Map</div>
                  <div className="text-[11px] text-stone-500">View live nearby facilities</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {user?.role === 'ngo' && (
              <Link
                to="/ngo/dashboard"
                className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 transition-all flex items-center justify-between group col-span-1 sm:col-span-2"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-indigo-900 dark:text-indigo-200">NGO Coordinator Panel</div>
                    <div className="text-[11px] text-indigo-700 dark:text-indigo-400">Manage rescue missions & field dispatch</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 transition-all flex items-center justify-between group col-span-1 sm:col-span-2"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-rose-900 dark:text-rose-200">Admin Control Center</div>
                    <div className="text-[11px] text-rose-700 dark:text-rose-400">Full system verification & audit controls</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </div>

        {/* Preferences & Settings */}
        <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-3">
          <h2 className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">
            Preferences & Settings
          </h2>

          <div className="space-y-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-full p-4 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-stone-700" />}
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm text-[#17231E] dark:text-white">Visual Appearance</div>
                  <div className="text-[11px] text-stone-500">Current: {isDark ? 'Dark Mode' : 'Warm Light Mode'}</div>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#159B5B] dark:text-orange-400">Toggle</span>
            </button>

            {/* Platform Settings Modal Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full p-4 rounded-2xl bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm text-[#17231E] dark:text-white">Platform Settings</div>
                  <div className="text-[11px] text-stone-500">Languages, accessibility & notifications</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </div>

        {/* Security Info & Logout */}
        <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-[#EAE3D2] dark:border-white/10 shadow-sm space-y-4">
          <div className="p-3.5 bg-[#FFF9ED] dark:bg-[#0D0D0D] border border-[#EAE3D2] dark:border-white/10 rounded-2xl text-xs space-y-1">
            <div className="font-black text-[#17231E] dark:text-white flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-[#159B5B] dark:text-orange-400" />
              <span>Security & Privacy Safeguards</span>
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-[11px]">
              Exact geolocation coordinates and victim identity are restricted to authorized emergency responders and verified NGOs according to SAHAAYAA AI trust policies.
            </p>
          </div>

          {user ? (
            <button
              onClick={handleLogout}
              className="w-full py-3.5 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          ) : (
            <div className="flex gap-3">
              <Link
                to="/login"
                className="flex-1 py-3 px-4 bg-[#159B5B] dark:bg-[#F25C38] text-white font-black rounded-2xl text-center text-xs uppercase tracking-wider shadow-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex-1 py-3 px-4 bg-stone-100 dark:bg-[#262626] text-[#17231E] dark:text-white font-black rounded-2xl text-center text-xs uppercase tracking-wider border border-stone-300 dark:border-stone-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Platform Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};

export default ProfilePage;
