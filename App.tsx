import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Events from './components/Events';
import Gallery from './components/Gallery';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import Testimonials from './components/Testimonials';
import { User, Event, GalleryItem, Testimonial } from './types';
import { getEvents, getGallery, rsvpEvent, getTestimonials } from './services/mockService';
import { LanguageProvider } from './services/translations';

function App() {
  // Global State
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  
  // UI State
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsDashboardOpen(true); // Open dashboard immediately upon login
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
    fetchData(); // Refresh data
  };

  return (
    <LanguageProvider>
      <div className="font-sans text-slate-800 bg-slate-50 min-h-screen">
        <Navbar 
          user={user} 
          onLoginClick={() => setIsAuthOpen(true)} 
          onLogoutClick={handleLogout}
          onDashboardClick={() => setIsDashboardOpen(true)}
        />

        {/* Main Public Content - Single Page Layout */}
        <main>
          <Hero />
          <About />
          <Events events={events} user={user} onRsvp={handleRSVP} />
          <Testimonials items={testimonials} />
          <Gallery items={gallery} />
          <Contact />
        </main>

        <Footer />

        {/* Modals / Overlays */}
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