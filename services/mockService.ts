
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
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendRealEmail, fetchRealInstagramPosts, sendRSVPConfirmation, translateText } from './integrations';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'guest': 0,
  'member': 1,
  'admin': 2
};

// --- HELPERS ---

/**
 * Task 1.3: Simple sleep helper to allow Firestore indexing/sync
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- AUTH SERVICES ---

/**
 * Task 1.1: Refactored Login
 * Added sync delay to allow auth state and Firestore rules to align.
 */
export const loginUser = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  // Wait for indexing/token propagation
  await sleep(500);

  const profile = await getUserProfile(firebaseUser.uid);
  return profile || {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || email.split('@')[0],
    email: firebaseUser.email || '',
    role: 'member'
  };
};

/**
 * Task 1.2: Refactored Registration
 * Ensures user document is written and indexed before returning.
 */
export const registerUser = async (name: string, email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  await updateProfile(firebaseUser, { displayName: name });
  
  const newUser: User = { 
    id: firebaseUser.uid, 
    name, 
    email, 
    role: 'member' 
  };

  // Ensure document is fully written
  await setDoc(doc(db, "users", newUser.id), { 
    ...newUser, 
    createdAt: new Date().toISOString() 
  });

  // Task 1.3: 500ms delay to allow Firestore indexing to catch up
  await sleep(500);

  return newUser;
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? { id: userId, ...snap.data() } as User : null;
  } catch (e: any) {
    if (e.code === 'permission-denied') {
        console.warn(`[AUTH SYNC] Profile inaccessible for ${userId}. This is common during initial login sync.`);
    } else {
        console.error("Profile fetch error:", e);
    }
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

/**
 * Task 2: Robust Permissions Guard
 * Gracefully handles permission-denied errors during state transitions.
 */
export const checkPermissions = async (requiredRole: UserRole): Promise<boolean> => {
  if (!auth.currentUser) return requiredRole === 'guest';
  
  try {
    const profile = await getUserProfile(auth.currentUser.uid);
    const currentRole = profile?.role || 'member';
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  } catch (e: any) {
    if (e.code === 'permission-denied') {
        console.warn("[PERMISSIONS GUARD] Access check failed due to pending auth synchronization. Defaulting to false.");
        return false;
    }
    console.error("[PERMISSIONS GUARD] Unexpected error:", e);
    return false;
  }
};

// --- CONTENT SERVICES ---

export const getPageContent = async (): Promise<PageContent[]> => {
  // Sync check: try to poke the user doc if logged in to warm up the session
  if (auth.currentUser) {
    try { await getDoc(doc(db, "users", auth.currentUser.uid)); } catch {}
  }
  
  try {
    const q = await getDocs(collection(db, "content"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as PageContent));
  } catch (e: any) {
    // If we can't get protected content, return empty instead of crashing
    if (e.code === 'permission-denied') return [];
    console.error("Content fetch error:", e);
    return [];
  }
};

export const updatePageContent = async (id: string, text: { en: string; ro: string; fr: string }): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");

  const q = await getDocs(collection(db, "content"));
  const existing = q.docs.find(d => d.data().id === id);
  if (existing) {
    await updateDoc(doc(db, "content", existing.id), { text });
  } else {
    await addDoc(collection(db, "content"), { id, description: id, text });
  }
};

// --- DATA SERVICES ---

export const getEvents = async (): Promise<Event[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    return querySnapshot.docs.map(d => ({ 
      id: d.id, 
      attendees: [], // Default value
      ...d.data() 
    } as Event));
  } catch (e) { 
    console.error("Failed to fetch events:", e);
    return [];
  }
};

export const saveEvent = async (event: Event): Promise<Event> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");

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
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
  await deleteDoc(doc(db, "events", id));
};

export const rsvpEvent = async (eventId: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, "events", eventId), { attendees: arrayUnion(userId) });
};

export const getGallery = async (): Promise<GalleryItem[]> => {
  const q = await getDocs(collection(db, "gallery"));
  return q.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem));
};

export const addGalleryItem = async (item: Partial<GalleryItem>): Promise<void> => {
  await addDoc(collection(db, "gallery"), { ...item, dateAdded: new Date().toISOString() });
};

export const deleteGalleryItem = async (id: string): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
  await deleteDoc(doc(db, "gallery", id));
};

export const toggleGalleryApproval = async (id: string): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
  
  const ref = doc(db, "gallery", id);
  const snap = await getDoc(ref);
  if (snap.exists()) await updateDoc(ref, { approved: !snap.data().approved });
};

export const getTestimonials = async (): Promise<Testimonial[]> => {
  const q = await getDocs(collection(db, "testimonials"));
  return q.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial));
};

export const addTestimonial = async (author: string, role: string, text: string): Promise<void> => {
  await addDoc(collection(db, "testimonials"), { author, role, text, approved: false });
};

export const updateTestimonial = async (id: string, data: Partial<Testimonial>): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
  await updateDoc(doc(db, "testimonials", id), data);
};

export const toggleTestimonialApproval = async (id: string): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");

  const ref = doc(db, "testimonials", id);
  const snap = await getDoc(ref);
  if (snap.exists()) await updateDoc(ref, { approved: !snap.data().approved });
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
  await deleteDoc(doc(db, "testimonials", id));
};

export const getUsers = async (): Promise<User[]> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");

  const q = await getDocs(collection(db, "users"));
  return q.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const deleteUser = async (id: string): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
  await deleteDoc(doc(db, "users", id));
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
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
  const isMember = await checkPermissions('member');
  if (!isMember) return [];
  
  try {
    const q = await getDocs(collection(db, "resources"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
  } catch (e: any) {
    if (e.code === 'permission-denied') return [];
    throw e;
  }
};

export const addResource = async (res: Partial<Resource>): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
  await addDoc(collection(db, "resources"), { ...res, dateAdded: new Date().toISOString() });
};

export const deleteResource = async (id: string): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");
  await deleteDoc(doc(db, "resources", id));
};

export const sendContactMessage = async (msg: any): Promise<void> => {
  await addDoc(collection(db, "messages"), { ...msg, date: new Date().toISOString(), read: false });
  await sendRealEmail(msg);
};

export const syncInstagram = async (): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");

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

export const migrateLegacyEvents = async (): Promise<number> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Unauthorized");

  const q = await getDocs(collection(db, "events"));
  let count = 0;
  for (const d of q.docs) {
    const data = d.data();
    if (typeof data.description === 'string') {
      const en = data.description;
      const [ro, fr] = await Promise.all([translateText(en, 'ro'), translateText(en, 'fr')]);
      await updateDoc(doc(db, "events", d.id), { description: { en, ro, fr } });
      count++;
    }
  }
  return count;
};

export {}
