
import { User, Event, GalleryItem, Testimonial, ContactMessage, InstagramPost, UserRole, PageContent } from '../types';
import { sendRealEmail, fetchRealInstagramPosts } from './integrations';

// Mock Data Initialization
const INITIAL_USERS: User[] = [
  { id: 'admin1', name: 'Admin User', email: 'admin@folk.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=C8102E&color=fff' },
  { id: 'mem1', name: 'Maria Dan', email: 'member@folk.com', role: 'member', avatar: 'https://ui-avatars.com/api/?name=Maria+Dan&background=002B7F&color=fff' },
  { id: 'mem2', name: 'Ion Popa', email: 'ion@folk.com', role: 'member', avatar: 'https://ui-avatars.com/api/?name=Ion+Popa&background=FCD116&color=000' }
];

const INITIAL_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Spring Folk Festival',
    date: '2024-03-15',
    time: '14:00',
    location: 'Community Center Main Hall',
    description: 'Join us for our annual Spring Folk Festival featuring traditional dances from Transylvania.',
    type: 'performance',
    attendees: [],
    image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '2',
    title: 'Beginner Dance Workshop',
    date: '2024-04-10',
    time: '18:30',
    location: 'Studio B',
    description: 'Learn the basics of the Hora. No partner needed!',
    type: 'workshop',
    attendees: [],
    image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80'
  }
];

const INITIAL_GALLERY: GalleryItem[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&w=600&q=80', caption: 'Festival 2023', source: 'upload', dateAdded: '2023-09-15' },
  { id: '2', url: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=600&q=80', caption: 'Costume details', source: 'instagram', dateAdded: '2023-10-01' },
  { id: '3', url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?auto=format&fit=crop&w=600&q=80', caption: 'Group photo', source: 'upload', dateAdded: '2023-11-20' },
];

const INITIAL_TESTIMONIALS: Testimonial[] = [
  { id: '1', author: 'Elena Popescu', role: 'Member since 2020', text: 'This club has reconnected me with my roots. The dance instructors are amazing!', approved: true },
  { id: '2', author: 'John Smith', role: 'Visitor', text: 'Saw them perform at the city parade. Incredible energy!', approved: true },
  { id: '3', author: 'Ana Radu', role: 'Student', text: 'Waiting for approval on this review.', approved: false },
];

const INITIAL_CONTENT: PageContent[] = [
  {
    id: 'about_text',
    description: 'About Us - Main Paragraph',
    text: {
      en: 'Since 1995, we have been the heartbeat of Romanian culture in the region. Our mission is simple: to keep the flame of our heritage alive through the energetic beats of the Hora, the intricate embroidery of our costumes, and the warmth of our community gatherings.',
      ro: 'Din 1995, suntem inima culturii românești din regiune. Misiunea noastră este simplă: să menținem vie flacăra moștenirii noastre prin ritmurile energice ale Horei, broderiile complexe ale costumelor noastre și căldura adunărilor comunității.',
      fr: 'Depuis 1995, nous sommes le cœur de la culture roumaine dans la région. Notre mission est simple : garder vivante la flamme de notre patrimoine à travers les rythmes énergiques de la Hora, les broderies complexes de nos costumes et la chaleur de nos rassemblements communautaires.'
    }
  },
  {
    id: 'contact_subtitle',
    description: 'Contact Section - Subtitle',
    text: {
      en: 'Interested in joining our folk club, booking a performance, or just want to say hello?',
      ro: 'Interesat să te alături clubului, să rezervi un spectacol sau doar să ne saluți?',
      fr: 'Intéressé à rejoindre notre club, réserver un spectacle ou simplement dire bonjour ?'
    }
  }
];

// Helpers to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- Auth & User Service ---
export const getUsers = async (): Promise<User[]> => {
  await delay(400);
  const stored = localStorage.getItem('users');
  return stored ? JSON.parse(stored) : INITIAL_USERS;
};

const saveUsers = (users: User[]) => localStorage.setItem('users', JSON.stringify(users));

export const loginUser = async (email: string, password: string): Promise<User> => {
  await delay(800);
  const users = await getUsers();
  const user = users.find(u => u.email === email);

  // Simple mock password check (in real app, use backend hashing)
  if (user) {
    if ((email.includes('admin') && password === 'admin') || (email.includes('member') && password === 'member') || password === 'password') {
       return user;
    }
  }
  
  throw new Error('Invalid credentials. Try admin@folk.com / admin');
};

export const registerUser = async (name: string, email: string): Promise<User> => {
  await delay(800);
  const users = await getUsers();
  if (users.find(u => u.email === email)) throw new Error('Email already exists');

  const newUser: User = { 
    id: `u_${Date.now()}`, 
    name, 
    email, 
    role: 'member', 
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random` 
  };
  
  saveUsers([...users, newUser]);
  return newUser;
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  await delay(500);
  const users = await getUsers();
  const updatedUsers = users.map(u => u.id === userId ? { ...u, role } : u);
  saveUsers(updatedUsers);
};

// --- Event Service ---
export const getEvents = async (): Promise<Event[]> => {
  await delay(500);
  const stored = localStorage.getItem('events');
  return stored ? JSON.parse(stored) : INITIAL_EVENTS;
};

export const saveEvent = async (event: Event): Promise<Event> => {
  await delay(600);
  const events = await getEvents();
  const index = events.findIndex(e => e.id === event.id);
  let newEvents;
  if (index >= 0) {
    newEvents = [...events];
    newEvents[index] = event;
  } else {
    newEvents = [...events, { ...event, id: String(Date.now()) }];
  }
  localStorage.setItem('events', JSON.stringify(newEvents));
  return event;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await delay(400);
  const events = await getEvents();
  localStorage.setItem('events', JSON.stringify(events.filter(e => e.id !== id)));
};

export const rsvpEvent = async (eventId: string, userId: string): Promise<void> => {
  await delay(400);
  const events = await getEvents();
  const updatedEvents = events.map(e => {
    if (e.id === eventId) {
      const attendees = e.attendees.includes(userId) 
        ? e.attendees.filter(id => id !== userId)
        : [...e.attendees, userId];
      return { ...e, attendees };
    }
    return e;
  });
  localStorage.setItem('events', JSON.stringify(updatedEvents));
};

// --- Gallery Service ---
export const getGallery = async (): Promise<GalleryItem[]> => {
  const stored = localStorage.getItem('gallery');
  return stored ? JSON.parse(stored) : INITIAL_GALLERY;
};

export const addGalleryItem = async (item: Omit<GalleryItem, 'id' | 'dateAdded'>): Promise<GalleryItem> => {
  await delay(500);
  const items = await getGallery();
  const newItem = { ...item, id: String(Date.now()), dateAdded: new Date().toISOString() };
  localStorage.setItem('gallery', JSON.stringify([newItem, ...items]));
  return newItem;
};

export const syncInstagram = async (): Promise<GalleryItem[]> => {
  try {
    // 1. Try Real API
    const realPosts = await fetchRealInstagramPosts();
    const formattedPosts: GalleryItem[] = realPosts.map((p: any) => ({
      id: p.id,
      url: p.media_url,
      caption: p.caption || 'Instagram Post',
      source: 'instagram',
      dateAdded: new Date().toISOString()
    }));
    
    // Merge
    const current = await getGallery();
    // Filter duplicates
    const newItems = formattedPosts.filter(fp => !current.find(c => c.id === fp.id));
    const updated = [...newItems, ...current];
    localStorage.setItem('gallery', JSON.stringify(updated));
    return updated;

  } catch (e) {
    // 2. Fallback to Mock if API Key missing or fails
    console.log('Using Mock Instagram Data (Real API Key missing or invalid)');
    await delay(1000);
    const newPosts: GalleryItem[] = Array.from({ length: 3 }).map((_, i) => ({
      id: `ig_${Date.now()}_${i}`,
      url: `https://images.unsplash.com/photo-${1500000000000 + i * 1000}?auto=format&fit=crop&w=600&q=80`,
      caption: 'Synced from Instagram #folk #tradition #romania',
      source: 'instagram',
      dateAdded: new Date().toISOString()
    }));
    
    const current = await getGallery();
    const updated = [...newPosts, ...current];
    localStorage.setItem('gallery', JSON.stringify(updated));
    return updated;
  }
};

// --- Testimonial Service ---
export const getTestimonials = async (): Promise<Testimonial[]> => {
  const stored = localStorage.getItem('testimonials');
  return stored ? JSON.parse(stored) : INITIAL_TESTIMONIALS;
};

export const addTestimonial = async (text: string, author: string, role: string): Promise<Testimonial> => {
    await delay(500);
    const list = await getTestimonials();
    const newT: Testimonial = {
        id: `t_${Date.now()}`,
        author,
        role,
        text,
        approved: false // Default to false
    };
    localStorage.setItem('testimonials', JSON.stringify([newT, ...list]));
    return newT;
};

export const toggleTestimonialApproval = async (id: string): Promise<void> => {
  await delay(300);
  const list = await getTestimonials();
  const updated = list.map(t => t.id === id ? { ...t, approved: !t.approved } : t);
  localStorage.setItem('testimonials', JSON.stringify(updated));
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  await delay(300);
  const list = await getTestimonials();
  localStorage.setItem('testimonials', JSON.stringify(list.filter(t => t.id !== id)));
};

// --- Contact Service ---
export const sendContactMessage = async (msg: Omit<ContactMessage, 'id' | 'date' | 'read'>): Promise<void> => {
  await delay(500);
  
  // 1. Save to local Admin Database
  const stored = localStorage.getItem('messages');
  const messages = stored ? JSON.parse(stored) : [];
  const newMessage = { ...msg, id: String(Date.now()), date: new Date().toISOString(), read: false };
  localStorage.setItem('messages', JSON.stringify([newMessage, ...messages]));
  
  // 2. Send Real Email (Integration)
  try {
    await sendRealEmail(msg);
  } catch (e) {
    console.error('Email failed to send (check configuration in services/integrations.ts)');
  }
};

export const getMessages = async (): Promise<ContactMessage[]> => {
  const stored = localStorage.getItem('messages');
  return stored ? JSON.parse(stored) : [];
};

// --- Page Content Service (CMS) ---
export const getPageContent = async (): Promise<PageContent[]> => {
  await delay(200);
  const stored = localStorage.getItem('page_content');
  return stored ? JSON.parse(stored) : INITIAL_CONTENT;
};

export const updatePageContent = async (id: string, newText: { en: string; ro: string; fr: string }): Promise<void> => {
  await delay(500);
  const content = await getPageContent();
  const updatedContent = content.map(c => c.id === id ? { ...c, text: newText } : c);
  localStorage.setItem('page_content', JSON.stringify(updatedContent));
};
