
import { User, Event, GalleryItem, Testimonial, ContactMessage, UserRole, PageContent, Resource } from '../types';
import { auth, db, storage } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDoc,
  arrayUnion,
  arrayRemove,
  query,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendRealEmail, fetchRealInstagramPosts, sendRSVPConfirmation, translateText } from './integrations';
import { dictionary } from './translations';

// --- MOCK DATA (Fallback for Demo Mode) ---
const INITIAL_USERS: User[] = [
  { id: 'admin1', name: 'Admin User', email: 'admin@folk.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=C8102E&color=fff', phoneNumber: '+1234567890' },
  { id: 'mem1', name: 'Maria Dan', email: 'member@folk.com', role: 'member', avatar: 'https://ui-avatars.com/api/?name=Maria+Dan&background=002B7F&color=fff' }
];

const INITIAL_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Spring Folk Festival (Demo)',
    date: '2024-03-15',
    time: '14:00',
    endTime: '18:00',
    location: 'Community Center',
    description: {
      en: 'This is a demo event. Connect Firebase to see real events.',
      ro: 'Acesta este un eveniment demo. Conectați Firebase pentru a vedea evenimente reale.',
      fr: 'Ceci est un événement de démonstration. Connectez Firebase pour voir les événements réels.'
    },
    type: 'performance',
    attendees: [],
    image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19'
  }
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
  },
  {
    id: 'hero_subtitle',
    description: 'Hero Section - Subtitle',
    text: {
      en: 'Celebrating the vibrant spirit of Romanian culture through dance, music, and community.',
      ro: 'Celebrăm spiritul vibrant al culturii românești prin dans, muzică și comunitate.',
      fr: 'Célébrer l\'esprit vibrant de la culture roumaine à travers la danse, la musique et la communauté.'
    }
  },
  {
    id: 'footer_text',
    description: 'Footer Copyright Text',
    text: {
      en: 'Romanian Kitchener Folk Club. Preserving heritage with pride.',
      ro: 'Clubul de Folclor Românesc Kitchener. Păstrăm tradiția cu mândrie.',
      fr: 'Club Folklorique Roumain de Kitchener. Préserver le patrimoine avec fierté.'
    }
  }
];

const INITIAL_RESOURCES: Resource[] = [
    {
        id: '1',
        title: 'Hora Unirii Steps',
        description: 'Basic steps for the Hora Unirii dance.',
        url: 'https://www.youtube.com/watch?v=example',
        category: 'choreography',
        dateAdded: '2024-01-01'
    },
    {
        id: '2',
        title: 'Costume Care Guide',
        description: 'How to wash and preserve traditional Ie.',
        url: '#',
        category: 'costume',
        dateAdded: '2024-01-02'
    }
];

// Helper to check if Firebase is Active
export const isFirebaseActive = () => !!auth && !!db;

// --- AUTH SERVICE ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  if (isFirebaseActive()) {
    const userCredential = await signInWithEmailAndPassword(auth!, email, password);
    const firebaseUser = userCredential.user;
    
    // Fetch custom user role from Firestore with a 2-second timeout
    // If DB is slow, default to 'member' instantly so login doesn't hang
    let role: UserRole = 'member';
    let phoneNumber = '';
    
    try {
        const docRef = doc(db!, "users", firebaseUser.uid);
        
        // Race: DB fetch vs 2-second timeout
        const userDoc: any = await Promise.race([
            getDoc(docRef),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);

        if (userDoc && userDoc.exists()) {
            const data = userDoc.data();
            role = data.role || 'member';
            phoneNumber = data.phoneNumber || '';
        }
    } catch (e) {
        console.warn("DB Fetch slow/failed, defaulting to Member role for speed.", e);
        // We default to 'member' so they can at least log in.
    }

    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || email.split('@')[0],
      email: firebaseUser.email || '',
      role: role,
      avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${email}&background=random`,
      phoneNumber: phoneNumber
    };
  } else {
    // Local Fallback
    await new Promise(r => setTimeout(r, 500));
    const users = JSON.parse(localStorage.getItem('users') || JSON.stringify(INITIAL_USERS));
    const user = users.find((u: User) => u.email === email);
    if (user && ((email.includes('admin') && password === 'admin') || password === 'member' || password === 'password')) return user;
    throw new Error('Demo Mode: Use admin@folk.com / admin');
  }
};

export const registerUser = async (name: string, email: string, password: string): Promise<User> => {
  if (isFirebaseActive()) {
    // 1. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
    
    // Non-blocking profile update
    updateProfile(userCredential.user, { displayName: name }).catch(e => console.error("Profile update bg error", e));
    
    // 2. Check if this is the FIRST user ever (Make them Admin)
    let role: UserRole = 'member';
    try {
        const q = query(collection(db!, "users"), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            role = 'admin'; // First user becomes admin
        }
    } catch (e) {
        console.error("Error checking user count, defaulting to member", e);
    }

    const newUser: User = {
      id: userCredential.user.uid,
      name,
      email,
      role: role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      phoneNumber: ''
    };

    // 3. Save User to DB (Creates the 'users' collection automatically)
    // We return immediately for UI speed, but this must happen to create the collection
    setDoc(doc(db!, "users", newUser.id), {
      name, 
      email, 
      role: role, 
      createdAt: new Date().toISOString(), 
      phoneNumber: ''
    }).catch(e => console.error("Background DB Save Error:", e));

    return newUser;
  } else {
    // Local Fallback
    const users = JSON.parse(localStorage.getItem('users') || JSON.stringify(INITIAL_USERS));
    const newUser = { id: `u_${Date.now()}`, name, email, role: 'member', avatar: `https://ui-avatars.com/api/?name=${name}`, phoneNumber: '' };
    localStorage.setItem('users', JSON.stringify([...users, newUser]));
    return newUser as User;
  }
};

export const getUsers = async (): Promise<User[]> => {
  if (isFirebaseActive()) {
    const querySnapshot = await getDocs(collection(db!, "users"));
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
  } else {
    return JSON.parse(localStorage.getItem('users') || JSON.stringify(INITIAL_USERS));
  }
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  if (isFirebaseActive()) {
    await updateDoc(doc(db!, "users", userId), { role });
  } else {
    const users = await getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, role } : u);
    localStorage.setItem('users', JSON.stringify(updated));
  }
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
  if (isFirebaseActive()) {
    await updateDoc(doc(db!, "users", userId), data);
  } else {
    const users = await getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, ...data } : u);
    localStorage.setItem('users', JSON.stringify(updated));
  }
};

// --- EVENTS SERVICE ---

export const getEvents = async (): Promise<Event[]> => {
  if (isFirebaseActive()) {
    const querySnapshot = await getDocs(collection(db!, "events"));
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Event));
  } else {
    return JSON.parse(localStorage.getItem('events') || JSON.stringify(INITIAL_EVENTS));
  }
};

// HELPER: Auto-translate description logic
const processEventDescription = async (description: string | { en: string; ro: string; fr: string }): Promise<{ en: string; ro: string; fr: string }> => {
  let descObj = { en: '', ro: '', fr: '' };

  // 1. Normalize input
  if (typeof description === 'string') {
    descObj.en = description;
  } else if (description && typeof description === 'object') {
    descObj = { ...description };
  }

  // 2. Identify Source Text (prefer English, then Romanian, then French)
  const sourceText = descObj.en || descObj.ro || descObj.fr || '';

  if (!sourceText) return descObj;

  // 3. Fill missing translations
  if (!descObj.en) descObj.en = await translateText(sourceText, 'en');
  if (!descObj.ro) descObj.ro = await translateText(sourceText, 'ro');
  if (!descObj.fr) descObj.fr = await translateText(sourceText, 'fr');

  return descObj;
};

export const saveEvent = async (event: Event): Promise<Event> => {
  // --- AUTO TRANSLATION ENFORCEMENT ---
  // Ensure description is a multi-language object with all fields filled
  const translatedDescription = await processEventDescription(event.description);
  const eventToSave = { ...event, description: translatedDescription };
  // ------------------------------------

  if (isFirebaseActive()) {
    let imageUrl = eventToSave.image;
    
    // If image is base64 (from upload), upload to Firebase Storage
    if (eventToSave.image?.startsWith('data:')) {
       const storageRef = ref(storage!, `events/${Date.now()}_img`);
       const response = await fetch(eventToSave.image);
       const blob = await response.blob();
       await uploadBytes(storageRef, blob);
       imageUrl = await getDownloadURL(storageRef);
    }

    const eventData = { ...eventToSave, image: imageUrl || '' };
    if (eventData.id) {
        await setDoc(doc(db!, "events", eventData.id), eventData);
    } else {
        const docRef = await addDoc(collection(db!, "events"), eventData);
        eventData.id = docRef.id;
        // Update with ID
        await updateDoc(docRef, { id: docRef.id });
    }
    return eventData;
  } else {
    // Local Fallback
    const events = await getEvents();
    const newEvents = eventToSave.id ? events.map(e => e.id === eventToSave.id ? eventToSave : e) : [...events, { ...eventToSave, id: String(Date.now()) }];
    localStorage.setItem('events', JSON.stringify(newEvents));
    return eventToSave;
  }
};

// MIGRATION TOOL
export const migrateLegacyEvents = async (): Promise<number> => {
  const events = await getEvents();
  let count = 0;
  
  for (const ev of events) {
    let needsUpdate = false;
    
    // Check if string
    if (typeof ev.description === 'string') {
      needsUpdate = true;
    } 
    // Check if object but missing keys
    else if (ev.description && typeof ev.description === 'object') {
      const d = ev.description as any;
      if (!d.en || !d.ro || !d.fr) {
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await saveEvent(ev); // saveEvent handles the translation logic
      count++;
    }
  }
  return count;
};

export const deleteEvent = async (id: string): Promise<void> => {
  // Confirmation is handled in UI
  const idString = String(id);
  
  if (isFirebaseActive()) {
    await deleteDoc(doc(db!, "events", idString));
  } else {
    const events = await getEvents();
    const updatedEvents = events.filter(e => String(e.id) !== idString);
    localStorage.setItem('events', JSON.stringify(updatedEvents));
  }
};

export const rsvpEvent = async (eventId: string, userId: string): Promise<void> => {
  let isAdding = false;
  let targetEvent: Event | undefined;
  let targetUser: User | undefined;

  // 1. Update Database
  if (isFirebaseActive()) {
    const eventRef = doc(db!, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    // Get User Data for Notification
    const userData = await getDoc(doc(db!, "users", userId));
    
    if (userData.exists()) targetUser = { id: userData.id, ...userData.data() } as User;

    if (eventSnap.exists()) {
       const event = eventSnap.data() as Event;
       targetEvent = event;
       if (event.attendees.includes(userId)) {
         await updateDoc(eventRef, { attendees: arrayRemove(userId) });
       } else {
         isAdding = true;
         await updateDoc(eventRef, { attendees: arrayUnion(userId) });
       }
    }
  } else {
    // Local Fallback
    const events = await getEvents();
    const users = await getUsers();
    targetUser = users.find(u => u.id === userId);

    const updated = events.map(e => {
        if(e.id === eventId) {
            targetEvent = e;
            const attendees = e.attendees.includes(userId) ? e.attendees.filter(i => i !== userId) : [...e.attendees, userId];
            isAdding = !e.attendees.includes(userId);
            return { ...e, attendees };
        }
        return e;
    });
    localStorage.setItem('events', JSON.stringify(updated));
  }

  // 2. Trigger Notification if RSVPing YES
  if (isAdding && targetEvent && targetUser) {
    try {
      await sendRSVPConfirmation(
        { 
          name: targetUser.name, 
          email: targetUser.email, 
          phone: targetUser.phoneNumber 
        },
        { 
          title: targetEvent.title, 
          date: targetEvent.date, 
          time: targetEvent.time, 
          location: targetEvent.location 
        }
      );
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  }
};

// --- GALLERY SERVICE ---

export const getGallery = async (): Promise<GalleryItem[]> => {
  if (isFirebaseActive()) {
    const q = await getDocs(collection(db!, "gallery"));
    const items = q.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem));
    // Backwards compatibility: if approved is undefined, treat as true (legacy items)
    return items.map(i => ({...i, approved: i.approved === undefined ? true : i.approved}));
  }
  const items = JSON.parse(localStorage.getItem('gallery') || '[]');
  return items.map((i: GalleryItem) => ({...i, approved: i.approved === undefined ? true : i.approved}));
};

export const addGalleryItem = async (item: Omit<GalleryItem, 'id' | 'dateAdded'>): Promise<GalleryItem> => {
  if (isFirebaseActive()) {
    let imageUrl = item.url;
    if (item.url.startsWith('data:')) {
        const storageRef = ref(storage!, `gallery/${Date.now()}_img`);
        const response = await fetch(item.url);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
    }
    
    const newItem = { ...item, url: imageUrl, dateAdded: new Date().toISOString() };
    const docRef = await addDoc(collection(db!, "gallery"), newItem);
    return { ...newItem, id: docRef.id };
  } else {
    const items = await getGallery();
    const newItem = { ...item, id: String(Date.now()), dateAdded: new Date().toISOString() };
    localStorage.setItem('gallery', JSON.stringify([newItem, ...items]));
    return newItem;
  }
};

export const toggleGalleryApproval = async (id: string): Promise<void> => {
  if (isFirebaseActive()) {
    const ref = doc(db!, "gallery", id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { approved: !snap.data().approved });
    }
  } else {
    const items = await getGallery();
    const updated = items.map(i => i.id === id ? { ...i, approved: !i.approved } : i);
    localStorage.setItem('gallery', JSON.stringify(updated));
  }
};

export const deleteGalleryItem = async (id: string): Promise<void> => {
    if (isFirebaseActive()) {
      await deleteDoc(doc(db!, "gallery", id));
    } else {
      const items = await getGallery();
      localStorage.setItem('gallery', JSON.stringify(items.filter(i => i.id !== id)));
    }
};

export const syncInstagram = async (): Promise<GalleryItem[]> => {
    const posts = await fetchRealInstagramPosts().catch(() => []); 
    return []; 
};

// --- TESTIMONIALS SERVICE ---

export const getTestimonials = async (): Promise<Testimonial[]> => {
  if (isFirebaseActive()) {
    const q = await getDocs(collection(db!, "testimonials"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial));
  }
  return JSON.parse(localStorage.getItem('testimonials') || '[]');
};

export const addTestimonial = async (author: string, role: string, text: string): Promise<void> => {
    const newTestimonial = { 
        author, 
        role, 
        text, 
        approved: false // Default to false
    };

    if (isFirebaseActive()) {
        await addDoc(collection(db!, "testimonials"), newTestimonial);
    } else {
        const list = await getTestimonials();
        const item = { id: String(Date.now()), ...newTestimonial };
        localStorage.setItem('testimonials', JSON.stringify([...list, item]));
    }
};

export const updateTestimonial = async (id: string, data: Partial<Testimonial>): Promise<void> => {
    if (isFirebaseActive()) {
        await updateDoc(doc(db!, "testimonials", id), data);
    } else {
        const list = await getTestimonials();
        const updated = list.map(t => t.id === id ? { ...t, ...data } : t);
        localStorage.setItem('testimonials', JSON.stringify(updated));
    }
};

export const toggleTestimonialApproval = async (id: string): Promise<void> => {
  if (isFirebaseActive()) {
    const tRef = doc(db!, "testimonials", id);
    const snap = await getDoc(tRef);
    if (snap.exists()) {
        await updateDoc(tRef, { approved: !snap.data().approved });
    }
  } else {
    const list = await getTestimonials();
    const updated = list.map(t => t.id === id ? { ...t, approved: !t.approved } : t);
    localStorage.setItem('testimonials', JSON.stringify(updated));
  }
};

export const deleteTestimonial = async (id: string): Promise<void> => {
   if (isFirebaseActive()) {
     await deleteDoc(doc(db!, "testimonials", id));
   } else {
     const list = await getTestimonials();
     localStorage.setItem('testimonials', JSON.stringify(list.filter(t => t.id !== id)));
   }
};

export const deleteUser = async (id: string): Promise<void> => {
    if (isFirebaseActive()) {
      await deleteDoc(doc(db!, "users", id));
    } else {
      const users = await getUsers();
      localStorage.setItem('users', JSON.stringify(users.filter(u => u.id !== id)));
    }
};

// --- RESOURCE SERVICE ---

export const getResources = async (): Promise<Resource[]> => {
    if (isFirebaseActive()) {
        const q = await getDocs(collection(db!, "resources"));
        return q.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
    }
    return JSON.parse(localStorage.getItem('resources') || JSON.stringify(INITIAL_RESOURCES));
};

export const addResource = async (res: Omit<Resource, 'id' | 'dateAdded'>): Promise<void> => {
    let finalUrl = res.url;
    
    // Check if URL is base64 file data, upload if Firebase active
    if (isFirebaseActive() && res.url.startsWith('data:')) {
        const storageRef = ref(storage!, `resources/${Date.now()}_file`);
        const response = await fetch(res.url);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        finalUrl = await getDownloadURL(storageRef);
    }

    const newRes = { ...res, url: finalUrl, dateAdded: new Date().toISOString() };
    
    if (isFirebaseActive()) {
        await addDoc(collection(db!, "resources"), newRes);
    } else {
        // DEMO MODE SAFEGUARD
        const list = await getResources();
        const payload = JSON.stringify([...list, { ...newRes, id: String(Date.now()) }]);
        
        // Safety check for LocalStorage limit (approx 4.5MB safe limit)
        if (payload.length > 4500000) { 
            throw new Error("Demo Mode Limit: File too large. Connect Firebase or use URL.");
        }
        
        try {
            localStorage.setItem('resources', payload);
        } catch (e) {
            throw new Error("Local Storage Full. Clear data or connect Firebase.");
        }
    }
};

export const deleteResource = async (id: string): Promise<void> => {
    if (isFirebaseActive()) {
        await deleteDoc(doc(db!, "resources", id));
    } else {
        const list = await getResources();
        localStorage.setItem('resources', JSON.stringify(list.filter(r => r.id !== id)));
    }
};

// --- CONTENT MANAGEMENT SERVICE ---

export const getPageContent = async (): Promise<PageContent[]> => {
  if (isFirebaseActive()) {
    const q = await getDocs(collection(db!, "content"));
    if (q.empty) return INITIAL_CONTENT;
    return q.docs.map(d => ({ id: d.id, ...d.data() } as PageContent));
  }
  return JSON.parse(localStorage.getItem('page_content') || JSON.stringify(INITIAL_CONTENT));
};

export const updatePageContent = async (id: string, newText: { en: string; ro: string; fr: string }): Promise<void> => {
  if (isFirebaseActive()) {
    const q = await getDocs(collection(db!, "content"));
    const existing = q.docs.find(d => d.data().id === id);
    
    if (existing) {
        await updateDoc(doc(db!, "content", existing.id), { text: newText });
    } else {
        await addDoc(collection(db!, "content"), { id, description: id, text: newText });
    }
  } else {
    const content = await getPageContent();
    const updatedContent = content.map(c => c.id === id ? { ...c, text: newText } : c);
    localStorage.setItem('page_content', JSON.stringify(updatedContent));
  }
};

export const sendContactMessage = async (msg: any): Promise<void> => {
    await sendRealEmail(msg);
    if (isFirebaseActive()) {
        await addDoc(collection(db!, "messages"), { ...msg, date: new Date().toISOString() });
    }
};
