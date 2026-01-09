
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
      <div className="absolute inset-0 z-0 scale-105">
        <img 
          src="https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
          alt="Romanian Folk Dance" 
          className="w-full h-full object-cover"
        />
        {/* Romanian Flag Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-roBlue/85 via-roYellow/80 to-roRed/85 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div className="absolute top-[15%] left-[10%] text-6xl opacity-30 animate-float" style={{ animationDelay: '0s' }}>🇷🇴</div>
        <div className="absolute top-[60%] left-[5%] text-7xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>💃</div>
        <div className="absolute top-[25%] right-[12%] text-5xl opacity-30 animate-float" style={{ animationDelay: '0.5s' }}>🎻</div>
        <div className="absolute top-[75%] right-[8%] text-8xl opacity-20 animate-float" style={{ animationDelay: '1.5s' }}>☀️</div>
      </div>

      <div className="container mx-auto px-6 relative z-20 text-center text-white pt-20 pb-10">
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-black mb-8 drop-shadow-2xl animate-fade-in-up leading-[1.1] tracking-tight">
          {t('hero_title_prefix')} <br className="sm:hidden" />
          <span className="text-roYellow inline-block mt-2 md:mt-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] relative">
            {t('hero_title_highlight')}
            <span className="absolute -bottom-2 left-0 w-full h-1 bg-roYellow shadow-lg rounded-full animate-fade-in" style={{ animationDelay: '1s' }}></span>
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl font-medium mb-12 max-w-3xl mx-auto drop-shadow-xl animate-fade-in-up leading-relaxed px-6 py-6 glass rounded-[2.5rem] border border-white/10 text-white/95" style={{ animationDelay: '0.2s' }}>
          {dynamicSubtitle || t('hero_subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full max-w-md mx-auto sm:max-w-none animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button 
            onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto bg-roYellow text-roBlue px-10 py-5 rounded-2xl font-black text-xl hover:bg-white transition-all shadow-[0_10px_40px_-10px_rgba(252,209,22,0.6)] hover:shadow-white/50 transform hover:-translate-y-2 active:scale-95"
          >
            {t('hero_btn_events')}
          </button>
          <button 
             onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto bg-white/10 backdrop-blur-md border-2 border-white/40 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-white hover:text-roBlue transition-all shadow-xl hover:-translate-y-2 active:scale-95"
          >
            {t('hero_btn_about')}
          </button>
        </div>
      </div>

      {/* Elegant Bottom Curve */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-20">
        <svg className="relative block w-full h-[60px] md:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M1200 120L0 120 0 20C200 80 400 80 600 20 800 -40 1000 -40 1200 20L1200 120Z" className="fill-slate-50"></path>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
