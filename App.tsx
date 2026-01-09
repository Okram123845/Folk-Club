
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.tsx';
import Hero from './components/Hero.tsx';
import About from './components/About.tsx';
import Events from './components/Events.tsx';
import Archive from './components/Archive.tsx';
import Gallery from './components/Gallery.tsx';
import Contact from './components/Contact.tsx';
import Footer from './components/Footer.tsx';
import AuthModal from './components/AuthModal.tsx';
import Dashboard from './components/Dashboard.tsx';
import Testimonials from './components/Testimonials.tsx';
import EventDetails from './components/EventDetails.tsx';
import { User, Event, GalleryItem, Testimonial } from './types.ts';
import { getEvents, getGallery, rsvpEvent, getTestimonials, subscribeToAuthChanges, getUserProfile } from './services/mockService.ts';
import { LanguageProvider } from './services/translations.ts';

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
    try {
      const e = await getEvents();
      const g = await getGallery();
      const t = await getTestimonials();
      setEvents(e);
      setGallery(g);
      setTestimonials(t);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    }
  };

  useEffect(() => { 
    fetchData();
    
    // Subscribe to auth state changes for persistence
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateData = async () => {
    await fetchData();
    // Also refresh the user profile to get latest avatar changes
    if (user) {
        const updatedUser = await getUserProfile(user.id);
        if (updatedUser) setUser(updatedUser);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsDashboardOpen(true);
  };

  const handleLogout = () => {
    import('./services/firebase.ts').then(({ auth }) => {
      if (auth) auth.signOut();
    });
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
            onUpdateData={handleUpdateData}
            onClose={() => setIsDashboardOpen(false)}
          />
        )}
      </div>
    </LanguageProvider>
  );
}

export default App;
