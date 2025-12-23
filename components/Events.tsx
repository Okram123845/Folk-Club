
import React, { useState } from 'react';
import { Event, User } from '../types';
import { useTranslation, getLocalizedText } from '../services/translations';
import { getGoogleCalendarUrl } from '../services/integrations';

interface EventsProps {
  events: Event[];
  user: User | null;
  onRsvp: (eventId: string) => void;
  onViewArchive: () => void;
  onViewDetails: (eventId: string) => void; // New Prop
}

const Events: React.FC<EventsProps> = ({ events, user, onRsvp, onViewArchive, onViewDetails }) => {
  const { t, language } = useTranslation();
  const [calendarModalEvent, setCalendarModalEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events
    .filter(e => e.date >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter events based on search query
  const filteredEvents = upcomingEvents.filter(event => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    
    // Check Title
    if (event.title.toLowerCase().includes(q)) return true;
    
    // Check Location
    if (event.location.toLowerCase().includes(q)) return true;
    
    // Check Description (all languages)
    if (typeof event.description === 'string') {
        if (event.description.toLowerCase().includes(q)) return true;
    } else {
        const descValues = Object.values(event.description);
        if (descValues.some((val: string) => val.toLowerCase().includes(q))) return true;
    }
    
    return false;
  });

  const handleAddToGoogleCalendar = (event: Event) => {
    const description = getLocalizedText(event.description, language);
    const url = getGoogleCalendarUrl(event, description);
    window.open(url, '_blank');
    setCalendarModalEvent(null);
  };

  const handleRsvpClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if we are joining (not already in attendees)
    const event = events.find(ev => ev.id === eventId);
    const isJoining = event && user && !event.attendees.includes(user.id);

    onRsvp(eventId);

    if (isJoining && event) {
        setCalendarModalEvent(event);
    }
  };

  return (
    <section id="events" className="py-16 md:py-20 bg-slate-50 w-full relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-6">
          <div className="text-center lg:text-left w-full">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-roBlue mb-4">{t('events_title')}</h2>
            <div className="w-24 h-1 bg-roRed mx-auto lg:mx-0 rounded-full mb-4"></div>
            <p className="text-gray-600 max-w-2xl mx-auto lg:mx-0 text-base md:text-lg">{t('events_subtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noreferrer" className="w-full sm:w-auto whitespace-nowrap bg-white border-2 border-roBlue text-roBlue hover:bg-roBlue hover:text-white px-6 py-3 rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"><span>📅</span> {t('events_calendar_btn')}</a>
            <button onClick={onViewArchive} className="w-full sm:w-auto whitespace-nowrap px-6 py-3 rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md bg-roYellow text-roBlue hover:bg-yellow-400"><span>📜</span> {t('events_view_archive')}</button>
          </div>
        </div>

        {/* Public Search Bar */}
        <div className="max-w-xl mx-auto mb-10 relative">
            <input 
                type="text" 
                placeholder={t('events_search_placeholder')}
                className="w-full p-4 pl-12 rounded-full border border-gray-200 shadow-sm focus:ring-4 focus:ring-roBlue/10 focus:border-roBlue outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
            {searchQuery && (
                <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
             <div className="text-5xl mb-4 text-gray-300">📅</div>
             <p className="text-gray-500 text-lg">
                {searchQuery ? `No events found matching "${searchQuery}"` : t('events_no_upcoming')}
             </p>
             {!searchQuery && <button onClick={onViewArchive} className="mt-4 text-roBlue font-bold hover:underline">{t('events_view_archive')}</button>}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredEvents.map(event => {
              const isGoing = user && event.attendees.includes(user.id);
              const isGuest = user?.role === 'guest';
              const description = getLocalizedText(event.description, language);
              const eventTypeKey = `event_type_${event.type}`;
              const displayType = t(eventTypeKey as any) || event.type;

              return (
                <div key={event.id} onClick={() => onViewDetails(event.id)} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col group cursor-pointer">
                  <div className="h-48 relative overflow-hidden">
                    <img src={event.image || 'https://picsum.photos/800/600'} alt={event.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"/>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold text-roBlue shadow-sm uppercase tracking-wider">{displayType}</div>
                  </div>
                  <div className="p-5 md:p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div><h3 className="text-xl font-bold text-gray-900 leading-tight mb-2 group-hover:text-roRed transition-colors">{event.title}</h3><p className="text-roRed font-medium flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><span className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded">📅 {new Date(event.date).toLocaleDateString()}</span><span className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded">⏰ {event.time} {event.endTime ? `- ${event.endTime}` : ''} EST</span></p></div>
                    </div>
                    <p className="text-gray-600 mb-6 flex-1 text-sm leading-relaxed line-clamp-3">{description}</p>
                    <div className="flex gap-3 mt-auto">
                      {user ? (
                        <button onClick={(e) => !isGuest && handleRsvpClick(event.id, e)} disabled={isGuest} className={`flex-1 py-3 rounded-xl font-bold transition-all transform active:scale-95 text-sm md:text-base flex items-center justify-center ${isGuest ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : isGoing ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' : 'bg-roBlue text-white hover:bg-blue-900 shadow-md hover:shadow-lg'}`}>{isGuest ? 'Membership Pending' : isGoing ? `✓ ${t('events_going_btn')}` : t('events_rsvp_btn')}</button>
                      ) : (
                        <button disabled className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed font-medium text-sm md:text-base flex items-center justify-center border border-gray-200">{t('events_login_rsvp')}</button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleAddToGoogleCalendar(event); }} className="w-12 h-auto rounded-xl border-2 border-gray-200 text-gray-600 hover:border-roBlue hover:text-roBlue transition-colors flex items-center justify-center bg-gray-50 text-xl" title="Add to Google Calendar">+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* RSVP Confirmation Modal */}
        {calendarModalEvent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative transform transition-all scale-100">
                    <button 
                        onClick={() => setCalendarModalEvent(null)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            ✓
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{t('rsvp_modal_title')}</h3>
                        <p className="text-gray-600 text-sm mb-6">
                            {t('rsvp_modal_msg')}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => handleAddToGoogleCalendar(calendarModalEvent)}
                                className="w-full bg-roBlue text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition-colors shadow-lg"
                            >
                                📅 {t('rsvp_btn_add')}
                            </button>
                            <button 
                                onClick={() => setCalendarModalEvent(null)}
                                className="w-full text-gray-500 py-2 font-medium hover:text-gray-700"
                            >
                                {t('rsvp_btn_no')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </section>
  );
};

export default Events;
