import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, MessageCircle, ExternalLink } from 'lucide-react';
import { useLanguage } from '../i18n';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#121C18] dark:bg-[#07120F] text-[#FFF9ED] pt-16 pb-12 border-t border-[#24332D] transition-colors duration-300 relative overflow-hidden">
      
      {/* Subtle ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#24332D]/80">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-3 group w-fit">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#159B5B] to-emerald-400 flex items-center justify-center text-white shadow-md shadow-[#159B5B]/30 group-hover:scale-105 transition-transform">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-5 h-5"
                >
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <div>
                <span className="font-black text-2xl tracking-tight text-white font-sans block leading-tight">
                  SAHAAYAA AI
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
                  {t('nav.brandTagline')}
                </span>
              </div>
            </Link>
            
            <p className="text-[#FFF9ED]/85 text-sm max-w-sm leading-relaxed pt-1">
              AI-powered community resource matching.
            </p>
            <p className="text-xs text-[#FFF9ED]/60 max-w-sm leading-relaxed">
              Connecting verified homeless & needy individuals with food, shelter, clothing, and healthcare support.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#159B5B] dark:text-emerald-400">
              {t('footer.quickLinks')}
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-[#FFF9ED]/80">
              <li>
                <button onClick={() => scrollTo('#hero')} className="hover:text-white dark:hover:text-emerald-300 transition-colors cursor-pointer">
                  {t('nav.home')}
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('#how-it-works')} className="hover:text-white dark:hover:text-emerald-300 transition-colors cursor-pointer">
                  {t('nav.howItWorks')}
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('#resources')} className="hover:text-white dark:hover:text-emerald-300 transition-colors cursor-pointer">
                  {t('nav.resources')}
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('#impact')} className="hover:text-white dark:hover:text-emerald-300 transition-colors cursor-pointer">
                  {t('nav.ourImpact')}
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('#get-involved')} className="hover:text-white dark:hover:text-emerald-300 transition-colors cursor-pointer">
                  {t('nav.getInvolved')}
                </button>
              </li>
            </ul>
          </div>

          {/* Connect / Socials */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#159B5B] dark:text-emerald-400">
              {t('footer.connect')}
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-[#FFF9ED]/80">
              <li>
                <a 
                  href="https://www.linkedin.com/in/poovarasans21" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center space-x-1.5 group"
                >
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.instagram.com/poovaraszn?stkn=MXF4c2N2cnhqOGhzbg==" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center space-x-1.5 group"
                >
                  <span>Instagram</span>
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="https://wa.me/918778931271" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center space-x-1.5 group"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>

            {/* Glass Circular Social Buttons with Scale and Glow animations */}
            <div className="pt-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FFF9ED]/40 block mb-2">
                Social Profiles
              </span>
              <div className="flex items-center space-x-2.5">
                
                {/* LinkedIn Button */}
                <a 
                  href="https://www.linkedin.com/in/poovarasans21" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="LinkedIn - Poovarasan S"
                  aria-label="LinkedIn"
                  className="w-10 h-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/15 dark:border-white/10 hover:border-emerald-400 hover:bg-emerald-500/20 text-[#FFF9ED] hover:text-emerald-300 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] group"
                >
                  <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>

                {/* Instagram Button */}
                <a 
                  href="https://www.instagram.com/poovaraszn?stkn=MXF4c2N2cnhqOGhzbg==" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Instagram - @poovaraszn"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/15 dark:border-white/10 hover:border-emerald-400 hover:bg-emerald-500/20 text-[#FFF9ED] hover:text-emerald-300 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] group"
                >
                  <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>

                {/* WhatsApp Button */}
                <a 
                  href="https://wa.me/918778931271" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="WhatsApp Chat - +91 8778931271"
                  aria-label="WhatsApp"
                  className="w-10 h-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/15 dark:border-white/10 hover:border-emerald-400 hover:bg-emerald-500/20 text-[#FFF9ED] hover:text-emerald-300 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] group"
                >
                  <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>

              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#159B5B] dark:text-emerald-400">
              {t('footer.contact')}
            </h4>
            <ul className="space-y-3 text-xs text-[#FFF9ED]/80">
              <li className="flex items-center space-x-2.5">
                <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a href="tel:+918778931271" className="hover:text-emerald-300 font-bold transition-colors">
                  +91 8778931271
                </a>
              </li>
              <li className="flex items-center space-x-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a href="https://wa.me/918778931271" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-300 transition-colors">
                  WhatsApp Direct Support
                </a>
              </li>
              <li className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a href="mailto:kit28.24cs117@gmail.com" className="hover:text-emerald-300 font-bold transition-colors">
                  kit28.24cs117@gmail.com
                </a>
              </li>
              <li className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Coimbatore, Tamil Nadu, India</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright and legal */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-[#FFF9ED]/60 space-y-3 sm:space-y-0">
          <p>© 2025 SAHAAYAA AI. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <a href="#privacy" className="hover:text-white transition-colors">{t('footer.privacyPolicy')}</a>
            <span className="text-[#FFF9ED]/30">|</span>
            <a href="#terms" className="hover:text-white transition-colors">{t('footer.termsOfService')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;