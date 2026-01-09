
import { User, Event, GalleryItem, Testimonial, ContactMessage, UserRole, PageContent, Resource } from '../types';
import { auth, db, storage } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged
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

// Helper to check if Firebase is Active
export const isFirebaseActive = () => !!auth && !!db;

// --- AUTH SERVICE ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  // Fetch custom user role from Firestore
  let role: UserRole = 'member';
  let phoneNumber = '';
  let carrier = '';
  let avatarColor = '';
  let customInitials = '';
  
  try {
      const docRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(docRef);

      if (userDoc.exists()) {
          const data = userDoc.data();
          role = data.role || 'member';
          phoneNumber = data.phoneNumber || '';
          carrier = data.carrier || '';
          avatarColor = data.avatarColor || '';
          customInitials = data.customInitials || '';
      }
  } catch (e) {
      console.warn("Firestore fetch failed during login:", e);
  }

  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || email.split('@')[0],
    email: firebaseUser.email || '',
    role: role,
    avatar: firebaseUser.photoURL || '',
    phoneNumber,
    carrier,
    avatarColor,
    customInitials
  };
};

export const registerUser = async (name: string, email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  await updateProfile(userCredential.user, { displayName: name });
  
  // Check if this is the first user to make them admin
  let role: UserRole = 'member';
  try {
      const q = query(collection(db, "users"), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
          role = 'admin'; 
      }
  } catch (e) {
      console.error("Error checking user count", e);
  }

  const newUser: User = {
    id: userCredential.user.uid,
    name,
    email,
    role: role,
    avatar: '',
    phoneNumber: ''
  };

  await setDoc(doc(db, "users", newUser.id), {
    name, 
    email, 
    role: role, 
    createdAt: new Date().toISOString(), 
    phoneNumber: ''
  });

  return newUser;
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const docRef = doc(db, "users", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: userId,
        name: data.name || '',
        email: data.email || '',
        role: data.role || 'member',
        avatar: data.avatar || '',
        phoneNumber: data.phoneNumber,
        carrier: data.carrier,
        avatarColor: data.avatarColor,
        customInitials: data.customInitials
      } as User;
    }
  } catch (e) {
    console.error("Error fetching user profile:", e);
  }
  return null;
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      if (profile) {
          callback(profile);
      } else {
          callback({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              role: 'member',
              avatar: firebaseUser.photoURL || ''
          });
      }
    } else {
      callback(null);
    }
  });
};

export const getUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  await updateDoc(doc(db, "users", userId), { role });
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, "users", userId), data);
};

export const updateUserAvatar = async (userId: string, file: File): Promise<string> => {
  const storageRef = ref(storage, `avatars/${userId}_${Date.now()}`);
  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", userId), { avatar: imageUrl });
  if (auth.currentUser && auth.currentUser.uid === userId) {
      await updateProfile(auth.currentUser, { photoURL: imageUrl });
  }

  return imageUrl;
};

// --- EVENTS SERVICE ---

export const getEvents = async (): Promise<Event[]> => {
  const querySnapshot = await getDocs(collection(db, "events"));
  return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Event));
};

const processEventDescription = async (description: string | { en: string; ro: string; fr: string }): Promise<{ en: string; ro: string; fr: string }> => {
  let descObj = { en: '', ro: '', fr: '' };
  if (typeof description === 'string') {
    descObj.en = description;
  } else if (description && typeof description === 'object') {
    descObj = { ...description };
  }

  let sourceText = descObj.en || descObj.ro || descObj.fr || '';
  let sourceLang = descObj.en ? 'en' : descObj.ro ? 'ro' : 'fr';

  if (!sourceText) return descObj;

  if (!descObj.en) descObj.en = await translateText(sourceText, 'en', sourceLang);
  if (!descObj.ro) descObj.ro = await translateText(sourceText, 'ro', sourceLang);
  if (!descObj.fr) descObj.fr = await translateText(sourceText, 'fr', sourceLang);

  return descObj;
};

export const saveEvent = async (event: Event): Promise<Event> => {
  const translatedDescription = await processEventDescription(event.description);
  const eventToSave = { ...event, description: translatedDescription };

  let imageUrl = eventToSave.image;
  if (eventToSave.image?.startsWith('data:')) {
      const storageRef = ref(storage, `events/${Date.now()}_img`);
      const response = await fetch(eventToSave.image);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      imageUrl = await getDownloadURL(storageRef);
  }

  const eventData = { ...eventToSave, image: imageUrl || '' };
  if (eventData.id) {
      await setDoc(doc(db, "events", eventData.id), eventData);
  } else {
      const docRef = await addDoc(collection(db, "events"), eventData);
      eventData.id = docRef.id;
      await updateDoc(docRef, { id: docRef.id });
  }
  return eventData;
};

export const migrateLegacyEvents = async (): Promise<number> => {
  const events = await getEvents();
  let count = 0;
  for (const ev of events) {
    let needsUpdate = typeof ev.description === 'string' || !ev.description || !((ev.description as any).en && (ev.description as any).ro);
    if (needsUpdate) {
      await saveEvent(ev);
      count++;
    }
  }
  return count;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "events", String(id)));
};

export const rsvpEvent = async (eventId: string, userId: string): Promise<void> => {
  const eventRef = doc(db, "events", eventId);
  const eventSnap = await getDoc(eventRef);
  const userData = await getDoc(doc(db, "users", userId));
  
  if (eventSnap.exists() && userData.exists()) {
    const event = eventSnap.data() as Event;
    const user = { id: userData.id, ...userData.data() } as User;
    
    if (event.attendees.includes(userId)) {
      await updateDoc(eventRef, { attendees: arrayRemove(userId) });
    } else {
      await updateDoc(eventRef, { attendees: arrayUnion(userId) });
      await sendRSVPConfirmation(
        { name: user.name, email: user.email, phone: user.phoneNumber },
        { title: event.title, date: event.date, time: event.time, location: event.location }
      );
    }
  }
};

// --- GALLERY SERVICE ---

export const getGallery = async (): Promise<GalleryItem[]> => {
  const q = await getDocs(collection(db, "gallery"));
  const items = q.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem));
  return items.map(i => ({...i, approved: i.approved === undefined ? true : i.approved}));
};

export const addGalleryItem = async (item: Omit<GalleryItem, 'id' | 'dateAdded'>): Promise<GalleryItem> => {
  let imageUrl = item.url;
  if (item.url.startsWith('data:')) {
      const storageRef = ref(storage, `gallery/${Date.now()}_img`);
      const response = await fetch(item.url);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      imageUrl = await getDownloadURL(storageRef);
  }
  
  const newItem = { ...item, url: imageUrl, dateAdded: new Date().toISOString() };
  const docRef = await addDoc(collection(db, "gallery"), newItem);
  return { ...newItem, id: docRef.id };
};

export const toggleGalleryApproval = async (id: string): Promise<void> => {
  const gRef = doc(db, "gallery", id);
  const snap = await getDoc(gRef);
  if (snap.exists()) {
    await updateDoc(gRef, { approved: !snap.data().approved });
  }
};

export const deleteGalleryItem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "gallery", id));
};

export const syncInstagram = async (): Promise<GalleryItem[]> => {
    await fetchRealInstagramPosts();
    return []; 
};

// --- TESTIMONIALS SERVICE ---

export const getTestimonials = async (): Promise<Testimonial[]> => {
  const q = await getDocs(collection(db, "testimonials"));
  return q.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial));
};

export const addTestimonial = async (author: string, role: string, text: string): Promise<void> => {
    await addDoc(collection(db, "testimonials"), { author, role, text, approved: false });
};

export const updateTestimonial = async (id: string, data: Partial<Testimonial>): Promise<void> => {
    await updateDoc(doc(db, "testimonials", id), data);
};

export const toggleTestimonialApproval = async (id: string): Promise<void> => {
  const tRef = doc(db, "testimonials", id);
  const snap = await getDoc(tRef);
  if (snap.exists()) {
      await updateDoc(tRef, { approved: !snap.data().approved });
  }
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "testimonials", id));
};

export const deleteUser = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "users", id));
};

// --- RESOURCE SERVICE ---

export const getResources = async (): Promise<Resource[]> => {
    const q = await getDocs(collection(db, "resources"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
};

export const addResource = async (res: Omit<Resource, 'id' | 'dateAdded'>): Promise<void> => {
    let finalUrl = res.url;
    if (res.url.startsWith('data:')) {
        const storageRef = ref(storage, `resources/${Date.now()}_file`);
        const response = await fetch(res.url);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        finalUrl = await getDownloadURL(storageRef);
    }
    const newRes = { ...res, url: finalUrl, dateAdded: new Date().toISOString() };
    await addDoc(collection(db, "resources"), newRes);
};

export const deleteResource = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "resources", id));
};

// --- CONTENT MANAGEMENT SERVICE ---

export const getPageContent = async (): Promise<PageContent[]> => {
  const q = await getDocs(collection(db, "content"));
  return q.docs.map(d => ({ id: d.id, ...d.data() } as PageContent));
};

export const updatePageContent = async (id: string, newText: { en: string; ro: string; fr: string }): Promise<void> => {
  const q = await getDocs(collection(db, "content"));
  const existing = q.docs.find(d => d.data().id === id);
  if (existing) {
      await updateDoc(doc(db, "content", existing.id), { text: newText });
  } else {
      await addDoc(collection(db, "content"), { id, description: id, text: newText });
  }
};

export const sendContactMessage = async (msg: any): Promise<void> => {
    await sendRealEmail(msg);
    await addDoc(collection(db, "messages"), { ...msg, date: new Date().toISOString() });
};
