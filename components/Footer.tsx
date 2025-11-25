
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../services/translations';
import { getPageContent } from '../services/mockService';

const Footer: React.FC = () => {
  const { t, language } = useTranslation();
  const [dynamicFooterText, setDynamicFooterText] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      const content = await getPageContent();
      const footerContent = content.find(c => c.id === 'footer_text');
      if (footerContent) {
        setDynamicFooterText(footerContent.text[language]);
      }
    };
    fetchContent();
  }, [language]);

  return (
    <footer className="bg-slate-900 text-white py-12 border-t border-white/10">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <div className="flex justify-center gap-6 mb-8">
          {['📘', '📷', '▶️', '📧'].map((icon, i) => (
            <a key={i} href="#" className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl hover:bg-roYellow hover:text-roBlue transition-all hover:-translate-y-1">
              {icon}
            </a>
          ))}
        </div>
        <p className="text-gray-400 text-sm px-4">
          &copy; {new Date().getFullYear()} {dynamicFooterText || t('footer_copyright')}
        </p>
        <div className="mt-4 h-1 w-full max-w-xs mx-auto bg-gradient-to-r from-roBlue via-roYellow to-roRed rounded-full"></div>
      </div>
    </footer>
  );
};

export default Footer;
