import React from 'react';
import { Testimonial } from '../types';
import { useTranslation } from '../services/translations';

interface TestimonialsProps {
  items: Testimonial[];
}

const Testimonials: React.FC<TestimonialsProps> = ({ items }) => {
  const { t } = useTranslation();
  const approvedItems = items.filter(t => t.approved);

  if (approvedItems.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-roBlue text-white relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-roRed/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">{t('testimonials_title')}</h2>
          <div className="w-24 h-1 bg-roYellow mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {approvedItems.map(item => (
            <div key={item.id} className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-white/10 hover:bg-white/20 transition-all duration-300 flex flex-col">
              <div className="text-roYellow text-4xl font-serif mb-4">"</div>
              <p className="text-base md:text-lg text-gray-100 mb-6 italic leading-relaxed flex-1">
                {item.text}
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-roBlue to-roRed flex items-center justify-center font-bold text-sm shrink-0">
                  {item.author.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-white leading-tight">{item.author}</h4>
                  <p className="text-roYellow text-sm">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;