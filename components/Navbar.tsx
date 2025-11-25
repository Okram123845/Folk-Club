
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useTranslation } from '../services/translations';
import LanguageSwitcher from './LanguageSwitcher';

interface NavbarProps {
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onDashboardClick: () => void;
  onNavigate: (sectionId: string) => void; // New Prop for routing
}

const Navbar: React.FC<NavbarProps> = ({ user, onLoginClick, onLogoutClick, onDashboardClick, onNavigate }) => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen]);

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  const navLinks = [
    { name: t('nav_home'), id: 'home' },
    { name: t('nav_about'), id: 'about' },
    { name: t('nav_events'), id: 'events' },
    { name: t('nav_gallery'), id: 'gallery' },
    { name: t('nav_contact'), id: 'contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled || mobileMenuOpen ? 'bg-roBlue shadow-lg py-3' : 'bg-roBlue/90 md:bg-transparent py-4 md:py-6'}`}>
      <div className="container mx-auto px-4 md:px-6 flex justify-between items-center relative z-50">
        <a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('home'); }} className="text-white font-serif font-bold text-xl md:text-2xl flex items-center gap-2 select-none relative z-50">
          <span className="text-2xl md:text-3xl">🇷🇴</span>
          <span className="hidden sm:inline">Romanian Kitchener Folk Club</span>
          <span className="sm:hidden">RK Folk Club</span>
        </a>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center space-x-6">
          {navLinks.map(link => (
            <button 
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className="text-white hover:text-roYellow font-medium transition-colors relative group text-sm xl:text-base py-2"
            >
              {link.name}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-roYellow transition-all group-hover:w-full"></span>
            </button>
          ))}
          
          <div className="h-6 w-px bg-white/20 mx-2"></div>
          
          <LanguageSwitcher />

          <div className="pl-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={onDashboardClick}
                  className="text-white hover:text-roYellow font-medium flex items-center gap-2 group"
                >
                  <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full border-2 border-roYellow object-cover group-hover:scale-105 transition-transform" />
                  <span className="max-w-[100px] truncate">{user.name}</span>
                </button>
                <button 
                  onClick={onLogoutClick}
                  className="text-sm text-white/80 hover:text-white underline"
                >
                  {t('nav_logout')}
                </button>
              </div>
            ) : (
              <button 
                onClick={onLoginClick}
                className="bg-roYellow text-roBlue px-5 py-2 rounded-full font-bold text-sm hover:bg-white hover:shadow-lg transition-all transform hover:-translate-y-0.5 whitespace-nowrap shadow-md"
              >
                {t('nav_login')}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="lg:hidden flex items-center z-50">
           <button 
            className="text-white p-2 relative w-10 h-10 flex flex-col justify-center items-center gap-1.5 focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
             <span className={`block w-6 h-0.5 bg-white transition-all duration-300 rounded-full ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
             <span className={`block w-6 h-0.5 bg-white transition-all duration-300 rounded-full ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
             <span className={`block w-6 h-0.5 bg-white transition-all duration-300 rounded-full ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 bg-roBlue z-40 transition-transform duration-300 ease-in-out pt-24 px-6 pb-6 flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col space-y-4 overflow-y-auto flex-1">
          {navLinks.map(link => (
            <button 
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className="text-white text-2xl font-serif font-bold text-left border-b border-white/10 pb-3 hover:text-roYellow transition-colors"
            >
              {link.name}
            </button>
          ))}
        </div>
          
        <div className="mt-auto space-y-6 pb-6">
            <div className="flex items-center justify-between border-t border-white/20 pt-6">
               <span className="text-white/60 font-bold text-sm">Language / Limbă</span>
               <LanguageSwitcher />
            </div>

            {user ? (
               <div className="bg-white/10 p-5 rounded-2xl space-y-4 shadow-inner">
                 <div className="flex items-center gap-3">
                    <img src={user.avatar} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white object-cover" />
                    <div className="overflow-hidden">
                      <p className="text-white font-bold text-lg truncate">{user.name}</p>
                      <p className="text-white/60 text-sm truncate">{user.email}</p>
                    </div>
                 </div>
                 <button onClick={() => { setMobileMenuOpen(false); onDashboardClick(); }} className="w-full bg-roYellow text-roBlue py-3 rounded-xl font-bold text-center hover:bg-white transition-colors shadow-lg">
                   {t('nav_dashboard')}
                 </button>
                 <button onClick={() => { setMobileMenuOpen(false); onLogoutClick(); }} className="w-full text-white/80 py-2 text-center hover:text-white text-sm font-medium">
                   {t('nav_logout')}
                 </button>
               </div>
            ) : (
              <button 
                onClick={() => { setMobileMenuOpen(false); onLoginClick(); }}
                className="w-full bg-white text-roBlue py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-100 transition-colors"
              >
                {t('nav_login')}
              </button>
            )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
    