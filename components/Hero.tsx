import React, { useEffect, useState } from 'react';
import { useTranslation } from '../services/translations';
import { getPageContent } from '../services/mockService';

const Hero: React.FC = () => {
  const { t, language } = useTranslation();
  const [dynamicSubtitle, setDynamicSubtitle] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      const content = await getPageContent();
      const heroContent = content.find(c => c.id === 'hero_subtitle');
      if (heroContent) {
        setDynamicSubtitle(heroContent.text[language]);
      }
    };
    fetchContent();
  }, [language]);

  return (
    <section id="home" className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden w-full">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
          alt="Romanian Folk Dance" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-roBlue/90 via-roBlue/70 to-roRed/60 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center text-white pt-20 pb-10">
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold mb-4 md:mb-6 drop-shadow-lg animate-fade-in-up leading-tight">
          {t('hero_title_prefix')} <span className="text-roYellow block md:inline mt-1 md:mt-0">{t('hero_title_highlight')}</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light mb-8 md:mb-12 max-w-3xl mx-auto drop-shadow-md opacity-90 px-2 leading-relaxed">
          {dynamicSubtitle || t('hero_subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-sm mx-auto sm:max-w-none">
          <button 
            onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto bg-roYellow text-roBlue px-8 py-4 rounded-full font-bold text-lg hover:bg-white transition-all shadow-lg hover:shadow-roYellow/50 transform hover:-translate-y-1 focus:ring-4 focus:ring-roYellow/50 outline-none"
          >
            {t('hero_btn_events')}
          </button>
          <button 
             onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all focus:ring-4 focus:ring-white/50 outline-none"
          >
            {t('hero_btn_about')}
          </button>
        </div>
      </div>

      {/* Decorative Bottom Curve */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg className="relative block w-[calc(130%+1.3px)] h-[40px] md:h-[70px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-slate-50"></path>
        </svg>
      </div>
    </section>
  );
};

export default Hero;