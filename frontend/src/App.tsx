import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './i18n';
import { SimpleModeProvider, useSimpleMode } from './context/SimpleModeContext';
import SimpleModeView from './components/SimpleModeView';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import PwaInstallBanner from './components/PwaInstallBanner';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import RequestHelp from './pages/RequestHelp';
import HelpSomeonePage from './pages/HelpSomeonePage';
import AiDemo from './pages/AiDemo';
import LiveMap from './pages/LiveMap';
import DonorDashboard from './pages/DonorDashboard';
import NgoDashboard from './pages/NgoDashboard';
import AdminDashboard from './pages/AdminDashboard';
import HumanitarianIntelligence from './pages/HumanitarianIntelligence';
import HelpReportsDashboard from './pages/HelpReportsDashboard';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { AlertTriangle, Home } from 'lucide-react';
import CustomCursor from './components/CustomCursor';

const NotFound: React.FC = () => {
  const { t } = useLanguage();
  return (
  <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
      <AlertTriangle className="w-8 h-8" />
    </div>
    <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t('notFound.title')}</h1>
    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
      {t('notFound.description')}
    </p>
    <Link 
      to="/"
      className="px-6 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-slate-800 dark:hover:bg-indigo-500 flex items-center space-x-2 transition-all shadow-md"
    >
      <Home className="w-4 h-4" />
      <span>{t('notFound.home')}</span>
    </Link>
  </div>
  );
};

const MainLayout: React.FC = () => {
  const { isSimpleMode } = useSimpleMode();
  const location = useLocation();

  const isHelpReportsDashboard = location.pathname.startsWith('/help-reports') || location.pathname.startsWith('/reports');

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F6F0] dark:bg-[#0D0D0D] font-sans text-[#1C1917] dark:text-[#F5F5F0] selection:bg-[#F25C38] selection:text-white transition-colors duration-300">
      <CustomCursor />
      {!isHelpReportsDashboard && <Navbar />}
      <PwaInstallBanner />
      {isSimpleMode && <SimpleModeView />}
      <main className={`flex-1 ${!isHelpReportsDashboard ? 'pt-[76px] lg:pt-[82px] pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/resources" element={<LandingPage />} />
          <Route path="/find-help" element={<LandingPage />} />
          <Route path="/help-someone" element={<HelpSomeonePage />} />
          <Route path="/request-help" element={<RequestHelp />} />
          <Route path="/help-reports" element={<HelpReportsDashboard />} />
          <Route path="/reports" element={<HelpReportsDashboard />} />
          <Route path="/ai-demo" element={<AiDemo />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/intelligence" element={<HumanitarianIntelligence />} />
          <Route path="/donor/dashboard" element={<DonorDashboard />} />
          <Route path="/ngo/dashboard" element={<NgoDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isHelpReportsDashboard && <Footer />}
      {!isHelpReportsDashboard && <BottomNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SimpleModeProvider>
            <BrowserRouter>
              <MainLayout />
            </BrowserRouter>
          </SimpleModeProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
