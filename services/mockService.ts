
import { User, Event, GalleryItem, Testimonial, ContactMessage, UserRole, PageContent, Resource } from '../types';
import { auth, db, storage } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged,
  signOut
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
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendRealEmail, fetchRealInstagramPosts, sendRSVPConfirmation, translateText } from './integrations';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'guest': 0,
  'member': 1,
  'admin': 2
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- AUTH SERVICES ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  await sleep(500);
  const profile = await getUserProfile(firebaseUser.uid);
  return profile || {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || email.split('@')[0],
    email: firebaseUser.email || '',
    role: 'member'
  };
};

export const registerUser = async (name: string, email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  await updateProfile(firebaseUser, { displayName: name });
  const newUser: User = { id: firebaseUser.uid, name, email, role: 'member' };
  await setDoc(doc(db, "users", newUser.id), { ...newUser, createdAt: new Date().toISOString() });
  await sleep(500);
  return newUser;
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? { id: userId, ...snap.data() } as User : null;
  } catch (e: any) {
    return null;
  }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      callback(profile || { id: firebaseUser.uid, name: firebaseUser.displayName || '', email: firebaseUser.email || '', role: 'member' });
    } else {
      callback(null);
    }
  });
};

export const isFirebaseActive = (): boolean => !!auth.app;

export const checkPermissions = async (requiredRole: UserRole): Promise<boolean> => {
  if (!auth.currentUser) return requiredRole === 'guest';
  try {
    const profile = await getUserProfile(auth.currentUser.uid);
    const currentRole = profile?.role || 'member';
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  } catch (e: any) {
    return false;
  }
};

// --- DATA SERVICES ---

export const getPageContent = async (): Promise<PageContent[]> => {
  try {
    const q = await getDocs(collection(db, "content"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as PageContent));
  } catch (e) { return []; }
};

export const updatePageContent = async (id: string, text: { en: string; ro: string; fr: string }): Promise<void> => {
  const q = await getDocs(collection(db, "content"));
  const existing = q.docs.find(d => d.data().id === id);
  if (existing) {
    await updateDoc(doc(db, "content", existing.id), { text });
  } else {
    await addDoc(collection(db, "content"), { id, description: id, text });
  }
};

export const getEvents = async (): Promise<Event[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    return querySnapshot.docs.map(d => ({ id: d.id, attendees: [], ...d.data() } as Event));
  } catch (e) { return []; }
};

export const saveEvent = async (event: Event): Promise<Event> => {
  if (event.id) {
    await setDoc(doc(db, "events", event.id), event);
    return event;
  } else {
    const docRef = await addDoc(collection(db, "events"), event);
    await updateDoc(docRef, { id: docRef.id });
    return { ...event, id: docRef.id };
  }
};

export const deleteEvent = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "events", id));
};

export const rsvpEvent = async (eventId: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, "events", eventId), { attendees: arrayUnion(userId) });
};

export const getGallery = async (): Promise<GalleryItem[]> => {
  try {
    const q = await getDocs(collection(db, "gallery"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem));
  } catch (e) { return []; }
};

export const addGalleryItem = async (item: Partial<GalleryItem>): Promise<void> => {
  await addDoc(collection(db, "gallery"), { ...item, dateAdded: new Date().toISOString() });
};

export const deleteGalleryItem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "gallery", id));
};

export const toggleGalleryApproval = async (id: string): Promise<void> => {
  const ref = doc(db, "gallery", id);
  const snap = await getDoc(ref);
  if (snap.exists()) await updateDoc(ref, { approved: !snap.data().approved });
};

export const getTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const q = await getDocs(collection(db, "testimonials"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial));
  } catch (e) { return []; }
};

export const addTestimonial = async (author: string, role: string, text: string): Promise<void> => {
  await addDoc(collection(db, "testimonials"), { author, role, text, approved: false });
};

// Fix: Added missing updateTestimonial
export const updateTestimonial = async (id: string, data: Partial<Testimonial>): Promise<void> => {
  await updateDoc(doc(db, "testimonials", id), data);
};

export const toggleTestimonialApproval = async (id: string): Promise<void> => {
  const ref = doc(db, "testimonials", id);
  const snap = await getDoc(ref);
  if (snap.exists()) await updateDoc(ref, { approved: !snap.data().approved });
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "testimonials", id));
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const q = await getDocs(collection(db, "users"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as User));
  } catch (e) { return []; }
};

export const deleteUser = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "users", id));
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
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", userId), { avatar: url });
  return url;
};

export const getResources = async (): Promise<Resource[]> => {
  try {
    const q = await getDocs(collection(db, "resources"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
  } catch (e) { return []; }
};

export const addResource = async (res: Partial<Resource>): Promise<void> => {
  await addDoc(collection(db, "resources"), { ...res, dateAdded: new Date().toISOString() });
};

export const deleteResource = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "resources", id));
};

// Fix: Added missing sendContactMessage
export const sendContactMessage = async (data: { name: string; email: string; message: string }): Promise<void> => {
  await addDoc(collection(db, "messages"), { ...data, date: new Date().toISOString(), read: false });
  try {
    await sendRealEmail(data);
  } catch (e) {
    console.error("Email notification failed", e);
  }
  await sleep(500);
};

export const syncInstagram = async (): Promise<void> => {
  const posts = await fetchRealInstagramPosts();
  for (const post of posts) {
    const q = await getDocs(collection(db, "gallery"));
    if (!q.docs.some(d => d.data().id === post.id)) {
      await setDoc(doc(db, "gallery", post.id), {
        id: post.id, url: post.media_url, caption: post.caption || '',
        source: 'instagram', dateAdded: new Date().toISOString(), approved: true,
        type: post.media_type === 'VIDEO' ? 'video' : 'image'
      });
    }
  }
};
