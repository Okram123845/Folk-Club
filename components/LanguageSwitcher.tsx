import React from 'react';
import { useTranslation } from '../services/translations';
import { Language } from '../types';

const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useTranslation();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'ro', label: 'RO', flag: '🇷🇴' },
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all text-sm font-bold ${
            language === lang.code
              ? 'bg-roBlue text-white shadow-md scale-110'
              : 'bg-white/20 text-slate-800 hover:bg-white/40'
          }`}
          aria-label={`Switch to ${lang.label}`}
          title={lang.label}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;