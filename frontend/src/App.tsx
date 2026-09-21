import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './i18n';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import PwaInstallBanner from './components/PwaInstallBanner';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import RequestHelp from './pages/RequestHelp';
import AiDemo from './pages/AiDemo';
import LiveMap from './pages/LiveMap';
import DonorDashboard from './pages/DonorDashboard';
import NgoDashboard from './pages/NgoDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { AlertTriangle, Home } from 'lucide-react';

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

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[#FFF9ED] dark:bg-[#17231E] font-sans text-[#17231E] dark:text-[#FFF9ED] selection:bg-[#159B5B] selection:text-white transition-colors duration-300">
            <Navbar />
            <PwaInstallBanner />
            <main className="flex-1 pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/request-help" element={<RequestHelp />} />
                <Route path="/ai-demo" element={<AiDemo />} />
                <Route path="/map" element={<LiveMap />} />
                <Route path="/donor/dashboard" element={<DonorDashboard />} />
                <Route path="/ngo/dashboard" element={<NgoDashboard />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
            <BottomNav />
          </div>
        </BrowserRouter>
      </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
