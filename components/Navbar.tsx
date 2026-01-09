
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useTranslation } from '../services/translations';
import LanguageSwitcher from './LanguageSwitcher';
import Avatar from './Avatar';

interface NavbarProps {
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onDashboardClick: () => void;
  onNavigate: (sectionId: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLoginClick, onLogoutClick, onDashboardClick, onNavigate }) => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
      
      // Update active section on scroll
      const sections = ['home', 'about', 'events', 'gallery', 'contact'];
      for (const section of sections.reverse()) {
        const el = document.getElementById(section);
        if (el && el.getBoundingClientRect().top < 200) {
          setActiveSection(section);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen]);

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    setActiveSection(id);
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
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'py-3' : 'py-6 md:py-8'}`}>
      <div className={`container mx-auto px-6 flex justify-between items-center transition-all duration-500 rounded-3xl ${isScrolled ? 'glass shadow-2xl py-3 px-8 mx-auto max-w-7xl border border-white/20' : ''}`}>
        <a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('home'); }} className={`font-serif font-black text-2xl flex items-center gap-2 transition-colors duration-500 ${isScrolled ? 'text-roBlue' : 'text-white'}`}>
          <span className="text-3xl filter drop-shadow-md">🇷🇴</span>
          <span className="hidden sm:inline tracking-tight">KW Romanian Folk Club</span>
          <span className="sm:hidden">KW Folk Club</span>
        </a>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center space-x-8">
          {navLinks.map(link => (
            <button 
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`font-bold transition-all relative group text-sm uppercase tracking-widest py-2 ${
                isScrolled ? (activeSection === link.id ? 'text-roBlue' : 'text-slate-500 hover:text-roBlue') : (activeSection === link.id ? 'text-roYellow' : 'text-white hover:text-roYellow')
              }`}
            >
              {link.name}
              <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                activeSection === link.id 
                  ? 'bg-roRed opacity-100 scale-100 shadow-[0_0_8px_rgba(200,16,46,0.5)]' 
                  : 'bg-transparent opacity-0 scale-0'
              }`}></span>
            </button>
          ))}
          
          <div className={`h-6 w-px mx-2 transition-colors ${isScrolled ? 'bg-slate-200' : 'bg-white/20'}`}></div>
          
          <LanguageSwitcher />

          <div className="pl-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={onDashboardClick}
                  className="flex items-center gap-3 group px-4 py-2 rounded-2xl hover:bg-roBlue/10 transition-all"
                >
                  <Avatar 
                    src={user.avatar} 
                    name={user.name}
                    color={user.avatarColor}
                    initials={user.customInitials}
                    className="w-10 h-10 rounded-full border-2 border-roYellow group-hover:scale-110 transition-transform shadow-lg" 
                  />
                  <div className="text-left hidden xl:block">
                     <p className={`text-xs font-black leading-none ${isScrolled ? 'text-slate-800' : 'text-white'}`}>{user.name}</p>
                     <p className="text-[10px] text-roYellow font-bold uppercase mt-0.5">Profile</p>
                  </div>
                </button>
              </div>
            ) : (
              <button 
                onClick={onLoginClick}
                className={`px-8 py-3 rounded-2xl font-black text-sm transition-all transform hover:-translate-y-1 shadow-xl hover:shadow-roYellow/30 ${
                  isScrolled ? 'bg-roBlue text-white hover:bg-slate-900' : 'bg-roYellow text-roBlue hover:bg-white'
                }`}
              >
                {t('nav_login')}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="lg:hidden flex items-center z-50">
           <button 
            className={`p-3 rounded-2xl transition-all active:scale-90 ${isScrolled ? 'bg-roBlue text-white' : 'bg-white/10 text-white'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
             <div className="w-6 h-5 relative flex flex-col justify-between">
                <span className={`block w-full h-1 bg-current transition-all duration-300 rounded-full ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block w-full h-1 bg-current transition-all duration-300 rounded-full ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-full h-1 bg-current transition-all duration-300 rounded-full ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
             </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 bg-roBlue z-40 transition-transform duration-500 ease-in-out pt-32 px-10 flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col space-y-6 overflow-y-auto flex-1">
          {navLinks.map((link, idx) => (
            <button 
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className="text-white text-4xl font-serif font-black text-left border-b border-white/5 pb-6 hover:text-roYellow transition-all transform hover:translate-x-4 flex items-center justify-between group"
              style={{ transitionDelay: `${idx * 50}ms` }}
            >
              <span>{link.name}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-2xl">→</span>
            </button>
          ))}
        </div>
          
        <div className="mt-auto space-y-8 pb-10">
            <div className="flex items-center justify-between border-t border-white/10 pt-8">
               <span className="text-white/40 font-black text-xs uppercase tracking-widest">Select Language</span>
               <LanguageSwitcher />
            </div>

            {user ? (
               <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 flex flex-col gap-6 shadow-2xl">
                 <div className="flex items-center gap-5">
                    <Avatar 
                      src={user.avatar} 
                      name={user.name} 
                      color={user.avatarColor}
                      initials={user.customInitials}
                      className="w-20 h-20 rounded-full border-4 border-roYellow shadow-2xl" 
                    />
                    <div>
                      <p className="text-white font-black text-2xl tracking-tight truncate max-w-[180px]">{user.name}</p>
                      <p className="text-roYellow font-bold text-sm uppercase">{user.role}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setMobileMenuOpen(false); onDashboardClick(); }} className="bg-roYellow text-roBlue py-5 rounded-2xl font-black text-center shadow-xl">
                      Dashboard
                    </button>
                    <button onClick={() => { setMobileMenuOpen(false); onLogoutClick(); }} className="bg-white/10 text-white py-5 rounded-2xl font-black text-center border border-white/10">
                      Logout
                    </button>
                 </div>
               </div>
            ) : (
              <button 
                onClick={() => { setMobileMenuOpen(false); onLoginClick(); }}
                className="w-full bg-roYellow text-roBlue py-6 rounded-[2rem] font-black text-2xl shadow-[0_15px_40px_-10px_rgba(252,209,22,0.4)] transition-transform active:scale-95"
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
