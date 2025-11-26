
import React from 'react';
import { Event } from '../types';
import { useTranslation, getLocalizedText } from '../services/translations';

interface ArchiveProps {
  events: Event[];
  onBack: () => void;
  onViewDetails: (eventId: string) => void; // New Prop
}

const Archive: React.FC<ArchiveProps> = ({ events, onBack, onViewDetails }) => {
  const { t, language } = useTranslation();
  
  const today = new Date().toISOString().split('T')[0];
  const pastEvents = events
    .filter(e => e.date < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-6">
      <div className="container mx-auto">
        <div className="flex flex-col items-center mb-12 text-center">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-roBlue font-bold transition-colors"><span>←</span> {t('dash_back')}</button>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-roBlue mb-4">{t('events_archive_title')}</h1>
          <div className="w-24 h-1 bg-roYellow mx-auto rounded-full mb-4"></div>
          <p className="text-gray-600 max-w-2xl">{pastEvents.length} {t('events_ended_msg')}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {pastEvents.map(event => {
            const description = getLocalizedText(event.description, language);
            const eventTypeKey = `event_type_${event.type}`;
            const displayType = t(eventTypeKey as any) || event.type;

            return (
              <div key={event.id} onClick={() => onViewDetails(event.id)} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col opacity-90 hover:opacity-100 transition-opacity cursor-pointer group">
                <div className="h-48 relative grayscale-[30%] hover:grayscale-0 transition-all duration-500">
                  <img src={event.image || 'https://picsum.photos/800/600'} alt={event.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform"/>
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="bg-white/90 text-slate-900 px-4 py-1 rounded-full font-bold text-sm uppercase tracking-widest shadow-lg transform -rotate-6 border border-gray-200">{t('events_completed_badge')}</span>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold text-white uppercase tracking-wider">{displayType}</div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-roBlue transition-colors">{event.title}</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-2"><span>📅 {new Date(event.date).toLocaleDateString()}</span><span>📍 {event.location}</span></p>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-6 flex-1">{description}</p>
                  <div className="pt-4 border-t border-gray-100 text-center text-xs font-bold text-gray-400 uppercase tracking-wide group-hover:text-roBlue">{t('events_view_details')} →</div>
                </div>
              </div>
            );
          })}
        </div>

        {pastEvents.length === 0 && <div className="text-center py-20 text-gray-400"><p className="text-xl">{t('events_archive_empty')}</p></div>}
      </div>
    </section>
  );
};

export default Archive;
