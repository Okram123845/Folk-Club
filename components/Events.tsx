
import React from 'react';
import { Event, User } from '../types';
import { useTranslation } from '../services/translations';

interface EventsProps {
  events: Event[];
  user: User | null;
  onRsvp: (eventId: string) => void;
}

const Events: React.FC<EventsProps> = ({ events, user, onRsvp }) => {
  const { t } = useTranslation();
  
  const generateCalendarUrl = (event: Event) => {
    const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const dates = `${event.date.replace(/-/g, '')}T${event.time.replace(':', '')}00Z/${event.date.replace(/-/g, '')}T${parseInt(event.time.split(':')[0]) + 2}${event.time.split(':')[1]}00Z`;
    return `${base}&text=${encodeURIComponent(event.title)}&dates=${dates}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;
  };

  const handleRsvpClick = (eventId: string) => {
    onRsvp(eventId);
    // Note: The parent component (App.tsx) calls the service which triggers emails
  };

  return (
    <section id="events" className="py-16 md:py-20 bg-slate-50 w-full">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-6">
          <div className="text-center lg:text-left w-full">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-roBlue mb-4">{t('events_title')}</h2>
            <div className="w-24 h-1 bg-roRed mx-auto lg:mx-0 rounded-full mb-4"></div>
            <p className="text-gray-600 max-w-2xl mx-auto lg:mx-0 text-base md:text-lg">{t('events_subtitle')}</p>
          </div>
          
          <a 
            href="https://calendar.google.com/calendar/u/0/r" 
            target="_blank" 
            rel="noreferrer"
            className="w-full sm:w-auto lg:w-auto whitespace-nowrap bg-white border-2 border-roBlue text-roBlue hover:bg-roBlue hover:text-white px-8 py-3 rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            <span>📅</span> {t('events_calendar_btn')}
          </a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {events.map(event => {
            const isGoing = user && event.attendees.includes(user.id);
            const isGuest = user?.role === 'guest';
            
            return (
              <div key={event.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col group">
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={event.image || 'https://picsum.photos/800/600'} 
                    alt={event.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold text-roBlue shadow-sm uppercase tracking-wider">
                    {event.type}
                  </div>
                </div>
                
                <div className="p-5 md:p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2 group-hover:text-roRed transition-colors">{event.title}</h3>
                      <p className="text-roRed font-medium flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded">📅 {new Date(event.date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded">⏰ {event.time}</span>
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6 flex-1 text-sm leading-relaxed line-clamp-3">{event.description}</p>
                  
                  <div className="flex gap-3 mt-auto">
                    {user ? (
                      <button 
                        onClick={() => !isGuest && handleRsvpClick(event.id)}
                        disabled={isGuest}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all transform active:scale-95 text-sm md:text-base flex items-center justify-center ${
                          isGuest 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : isGoing
                              ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                              : 'bg-roBlue text-white hover:bg-blue-900 shadow-md hover:shadow-lg'
                        }`}
                      >
                         {isGuest 
                           ? 'Membership Pending' 
                           : isGoing 
                             ? `✓ ${t('events_going_btn')}` 
                             : t('events_rsvp_btn')
                         }
                      </button>
                    ) : (
                      <button disabled className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed font-medium text-sm md:text-base flex items-center justify-center border border-gray-200">
                        {t('events_login_rsvp')}
                      </button>
                    )}
                    
                    <a 
                      href={generateCalendarUrl(event)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-12 h-auto rounded-xl border-2 border-gray-200 text-gray-600 hover:border-roBlue hover:text-roBlue transition-colors flex items-center justify-center bg-gray-50 text-xl"
                      title="Add to Google Calendar"
                    >
                      +
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Events;
