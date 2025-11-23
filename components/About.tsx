
import React, { useEffect, useState } from 'react';
import { useTranslation } from '../services/translations';
import { getPageContent } from '../services/mockService';

const About: React.FC = () => {
  const { t, language } = useTranslation();
  const [dynamicText, setDynamicText] = useState<string>('');

  useEffect(() => {
    const fetchContent = async () => {
      const content = await getPageContent();
      const aboutEntry = content.find(c => c.id === 'about_text');
      if (aboutEntry) {
        setDynamicText(aboutEntry.text[language]);
      }
    };
    fetchContent();
  }, [language]);

  return (
    <section id="about" className="py-16 md:py-20 container mx-auto px-4 md:px-6">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="space-y-6 animate-fade-in-up">
           <h2 className="text-3xl md:text-4xl font-serif font-bold text-roBlue">{t('about_title')}</h2>
           <p className="text-base md:text-lg leading-relaxed text-gray-600">
             {dynamicText || t('about_text')}
           </p>
           <ul className="space-y-3">
             <li className="flex items-center gap-3"><span className="text-roRed font-bold text-xl">✓</span> {t('about_feature_1')}</li>
             <li className="flex items-center gap-3"><span className="text-roYellowDark font-bold text-xl">✓</span> {t('about_feature_2')}</li>
             <li className="flex items-center gap-3"><span className="text-roBlue font-bold text-xl">✓</span> {t('about_feature_3')}</li>
           </ul>
        </div>
        <div className="relative group">
          <div className="absolute -inset-4 bg-roYellow/20 rounded-2xl transform rotate-3 group-hover:rotate-6 transition-transform"></div>
          <img src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80" alt="Dancers" className="relative rounded-2xl shadow-lg w-full h-auto object-cover" />
        </div>
      </div>
    </section>
  );
};

export default About;
