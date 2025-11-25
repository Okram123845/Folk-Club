
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Events from './components/Events';
import Archive from './components/Archive';
import Gallery from './components/Gallery';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import Testimonials from './components/Testimonials';
import EventDetails from './components/EventDetails';
import { User, Event, GalleryItem, Testimonial } from './types';
import { getEvents, getGallery, rsvpEvent, getTestimonials } from './services/mockService';
import { LanguageProvider } from './services/translations';

type ViewState = 'landing' | 'archive' | 'event-details';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const fetchData = async () => {
    const e = await getEvents();
    const g = await getGallery();
    const t = await getTestimonials();
    setEvents(e);
    setGallery(g);
    setTestimonials(t);
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsDashboardOpen(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsDashboardOpen(false);
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    await rsvpEvent(eventId, user.id);
    fetchData();
  };

  const handleNavigate = (sectionId: string) => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewEventDetails = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView('event-details');
    window.scrollTo(0, 0);
  };

  const renderContent = () => {
    if (currentView === 'event-details' && selectedEventId) {
      const event = events.find(e => e.id === selectedEventId);
      if (event) {
        return (
          <EventDetails 
            event={event} 
            galleryItems={gallery} 
            user={user}
            onBack={() => setCurrentView('landing')}
          />
        );
      }
    }

    if (currentView === 'archive') {
      return (
        <Archive 
          events={events} 
          onBack={() => setCurrentView('landing')} 
          onViewDetails={handleViewEventDetails}
        />
      );
    }

    // Default Landing View
    return (
      <>
        <Hero />
        <About />
        <Events 
          events={events} 
          user={user} 
          onRsvp={handleRSVP} 
          onViewArchive={() => {
            window.scrollTo(0, 0);
            setCurrentView('archive');
          }} 
          onViewDetails={handleViewEventDetails}
        />
        <Testimonials items={testimonials} />
        <Gallery items={gallery} />
        <Contact />
      </>
    );
  };

  return (
    <LanguageProvider>
      <div className="font-sans text-slate-800 bg-slate-50 min-h-screen flex flex-col">
        <Navbar 
          user={user} 
          onLoginClick={() => setIsAuthOpen(true)} 
          onLogoutClick={handleLogout}
          onDashboardClick={() => setIsDashboardOpen(true)}
          onNavigate={handleNavigate}
        />

        <main className="flex-1">
          {renderContent()}
        </main>

        <Footer />

        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)} 
          onLoginSuccess={handleLogin}
        />

        {isDashboardOpen && user && (
          <Dashboard 
            user={user} 
            events={events}
            gallery={gallery}
            onUpdateData={fetchData}
            onClose={() => setIsDashboardOpen(false)}
          />
        )}
      </div>
    </LanguageProvider>
  );
}

export default App;
