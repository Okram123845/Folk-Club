import React, { useState, useEffect } from 'react';
import { sendContactMessage, getPageContent } from '../services/mockService';
import { useTranslation } from '../services/translations';

const Contact: React.FC = () => {
  const { t, language } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [dynamicSubtitle, setDynamicSubtitle] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      const content = await getPageContent();
      const sub = content.find(c => c.id === 'contact_subtitle');
      if (sub) {
        setDynamicSubtitle(sub.text[language]);
      }
    };
    fetchContent();
  }, [language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    await sendContactMessage(formData);
    setStatus('success');
    setFormData({ name: '', email: '', message: '' });
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <section id="contact" className="py-16 md:py-20 bg-slate-900 text-white relative overflow-hidden w-full">
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-roRed/10 rounded-l-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-roBlue/20 rounded-r-full blur-3xl pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 md:gap-12 items-start">
          <div className="space-y-6 md:space-y-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4 md:mb-6">{t('contact_title')}</h2>
              <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                {dynamicSubtitle || t('contact_subtitle')}
              </p>
            </div>
            
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                <div className="bg-roYellow/20 p-3 rounded-full text-roYellow text-xl flex-shrink-0 mt-1">📍</div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-lg mb-1">{t('contact_label_location')}</h4>
                  <p className="text-gray-400 text-sm md:text-base break-words">123 Cultural Street, Kitchener, ON</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                <div className="bg-roYellow/20 p-3 rounded-full text-roYellow text-xl flex-shrink-0 mt-1">📧</div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-lg mb-1">{t('contact_label_email')}</h4>
                  <p className="text-gray-400 text-sm md:text-base break-words">info@romaniankitchenerfolkclub.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white text-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg mx-auto lg:max-w-none">
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-roBlue">{t('contact_form_title')}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-bold text-gray-700 mb-1">{t('contact_form_name')}</label>
                <input 
                  id="contact-name"
                  type="text" 
                  required
                  className="w-full p-3 md:p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-roBlue/20 focus:border-roBlue outline-none transition-all text-base"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-bold text-gray-700 mb-1">{t('contact_label_email')}</label>
                <input 
                  id="contact-email"
                  type="email" 
                  required
                  className="w-full p-3 md:p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-roBlue/20 focus:border-roBlue outline-none transition-all text-base"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-bold text-gray-700 mb-1">{t('contact_form_msg')}</label>
                <textarea 
                  id="contact-message"
                  required
                  rows={4}
                  className="w-full p-3 md:p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-roBlue/20 focus:border-roBlue outline-none transition-all resize-none text-base"
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                disabled={status !== 'idle'}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-[0.98] ${
                  status === 'success' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-roRed text-white hover:bg-red-800 shadow-lg hover:shadow-red-900/30'
                }`}
              >
                {status === 'sending' ? t('contact_btn_sending') : status === 'success' ? t('contact_btn_success') : t('contact_btn_send')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;