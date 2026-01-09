
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

// --- PERMISSIONS GUARD ---

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'guest': 0,
  'member': 1,
  'admin': 2
};

/**
 * Task 3: Permissions Guard
 * Checks if the current user meets the minimum role requirement.
 */
export const checkPermissions = async (requiredRole: UserRole): Promise<boolean> => {
  const firebaseUser = auth.currentUser;
  
  // If no user and we require more than guest, fail
  if (!firebaseUser) return requiredRole === 'guest';

  // Fetch the latest profile to ensure we have the correct role
  const profile = await getUserProfile(firebaseUser.uid);
  const userRole = profile?.role || 'member';

  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// --- AUTH SERVICE ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  // Immediately fetch profile after login
  const profile = await getUserProfile(firebaseUser.uid);
  
  if (!profile) {
      // Create profile if missing
      const defaultUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || email.split('@')[0],
        email: firebaseUser.email || '',
        role: 'member'
      };
      await setDoc(doc(db, "users", firebaseUser.uid), {
        ...defaultUser,
        createdAt: new Date().toISOString()
      });
      return defaultUser;
  }

  return profile;
};

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

  await setDoc(doc(db, "users", newUser.id), {
    ...newUser,
    createdAt: new Date().toISOString()
  });

  return newUser;
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  try {
    const docRef = doc(db, "users", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: userId, ...snap.data() } as User;
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
      callback(profile || {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          role: 'member'
      });
    } else {
      callback(null);
    }
  });
};

// --- CONTENT MANAGEMENT SERVICE ---

/**
 * Task 2: Refactored Fetch Logic
 * Ensures user document is synced before fetching restricted content
 * and handles permission errors gracefully.
 */
export const getPageContent = async (): Promise<PageContent[]> => {
  // If logged in, ensure we have the user document state ready (Sync check)
  if (auth.currentUser) {
      try {
          await getDoc(doc(db, "users", auth.currentUser.uid));
      } catch (e) {
          console.warn("User document sync delayed, proceeding with public fetch.");
      }
  }

  try {
    const q = await getDocs(collection(db, "content"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as PageContent));
  } catch (e: any) {
    if (e.code === 'permission-denied') {
        throw new Error("Access Denied: You do not have the required role to view this content.");
    }
    console.error("Page content fetch failed:", e);
    return [];
  }
};

export const updatePageContent = async (id: string, newText: { en: string; ro: string; fr: string }): Promise<void> => {
  // Task 2 Pt 4: Explicit permission check with clear error
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) {
      throw new Error("Unauthorized: Only administrators can modify site content.");
  }

  const q = await getDocs(collection(db, "content"));
  const existing = q.docs.find(d => d.data().id === id);
  if (existing) {
      await updateDoc(doc(db, "content", existing.id), { text: newText });
  } else {
      await addDoc(collection(db, "content"), { id, description: id, text: newText });
  }
};

// --- DATA SERVICES (With refined error handling) ---

export const getEvents = async (): Promise<Event[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Event));
  } catch (e) {
    console.error("Failed to fetch events:", e);
    return [];
  }
};

export const getGallery = async (): Promise<GalleryItem[]> => {
  try {
    const q = await getDocs(collection(db, "gallery"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem));
  } catch (e) {
    console.error("Gallery fetch failed:", e);
    return [];
  }
};

// Fix: Added missing addGalleryItem
export const addGalleryItem = async (item: Partial<GalleryItem>): Promise<void> => {
  const galleryData = {
    ...item,
    dateAdded: new Date().toISOString(),
    approved: item.approved ?? false
  };
  await addDoc(collection(db, "gallery"), galleryData);
};

// Fix: Added missing deleteGalleryItem
export const deleteGalleryItem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "gallery", id));
};

// Fix: Added missing toggleGalleryApproval
export const toggleGalleryApproval = async (id: string): Promise<void> => {
  const ref = doc(db, "gallery", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { approved: !snap.data().approved });
  }
};

// Fix: Added missing syncInstagram
export const syncInstagram = async (): Promise<void> => {
  const posts = await fetchRealInstagramPosts();
  for (const post of posts) {
    const item: GalleryItem = {
      id: post.id,
      url: post.media_url,
      caption: post.caption || '',
      source: 'instagram',
      dateAdded: new Date().toISOString(),
      approved: true,
      type: post.media_type === 'VIDEO' ? 'video' : 'image'
    };
    const q = await getDocs(collection(db, "gallery"));
    const exists = q.docs.some(d => d.data().id === post.id);
    if (!exists) {
      await setDoc(doc(db, "gallery", post.id), item);
    }
  }
};

export const getTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const q = await getDocs(collection(db, "testimonials"));
    return q.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial));
  } catch (e) {
    console.error("Testimonials fetch failed:", e);
    return [];
  }
};

// Fix: Added missing addTestimonial
export const addTestimonial = async (author: string, role: string, text: string): Promise<void> => {
  await addDoc(collection(db, "testimonials"), {
    author,
    role,
    text,
    approved: false
  });
};

// Fix: Added missing updateTestimonial
export const updateTestimonial = async (id: string, data: Partial<Testimonial>): Promise<void> => {
  await updateDoc(doc(db, "testimonials", id), data);
};

// Fix: Added missing toggleTestimonialApproval
export const toggleTestimonialApproval = async (id: string): Promise<void> => {
  const ref = doc(db, "testimonials", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { approved: !snap.data().approved });
  }
};

// Fix: Added missing deleteTestimonial
export const deleteTestimonial = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "testimonials", id));
};

export const getUsers = async (): Promise<User[]> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Permission Denied: Admin role required to list users.");
  
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Permission Denied: Admin role required to change roles.");
  await updateDoc(doc(db, "users", userId), { role });
};

// Fix: Added missing deleteUser
export const deleteUser = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "users", id));
};

export const saveEvent = async (event: Event): Promise<Event> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Permission Denied: Admin role required to save events.");
  
  const eventData = { ...event };
  if (eventData.id) {
      await setDoc(doc(db, "events", eventData.id), eventData);
  } else {
      const docRef = await addDoc(collection(db, "events"), eventData);
      eventData.id = docRef.id;
      await updateDoc(docRef, { id: docRef.id });
  }
  return eventData;
};

export const deleteEvent = async (id: string): Promise<void> => {
  const isAdmin = await checkPermissions('admin');
  if (!isAdmin) throw new Error("Permission Denied: Admin role required to delete events.");
  await deleteDoc(doc(db, "events", id));
};

// Fix: Added missing migrateLegacyEvents
export const migrateLegacyEvents = async (): Promise<number> => {
  const querySnapshot = await getDocs(collection(db, "events"));
  let count = 0;
  for (const d of querySnapshot.docs) {
    const data = d.data() as Event;
    if (typeof data.description === 'string') {
      const text = data.description;
      const ro = await translateText(text, 'ro', 'en');
      const fr = await translateText(text, 'fr', 'en');
      await updateDoc(doc(db, "events", d.id), {
        description: { en: text, ro, fr }
      });
      count++;
    }
  }
  return count;
};

export const sendContactMessage = async (msg: any): Promise<void> => {
    await addDoc(collection(db, "messages"), { ...msg, date: new Date().toISOString(), read: false });
    await sendRealEmail(msg);
};

export const getResources = async (): Promise<Resource[]> => {
    const isMember = await checkPermissions('member');
    if (!isMember) return [];
    
    try {
      const q = await getDocs(collection(db, "resources"));
      return q.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
    } catch (e) {
      console.error("Resources fetch failed:", e);
      return [];
    }
};

// Fix: Added missing addResource
export const addResource = async (resource: Partial<Resource>): Promise<void> => {
  await addDoc(collection(db, "resources"), {
    ...resource,
    dateAdded: new Date().toISOString()
  });
};

// Fix: Added missing deleteResource
export const deleteResource = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "resources", id));
};

export const rsvpEvent = async (eventId: string, userId: string): Promise<void> => {
  const eventRef = doc(db, "events", eventId);
  await updateDoc(eventRef, { attendees: arrayUnion(userId) });
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, "users", userId), data);
};

export const updateUserAvatar = async (userId: string, file: File): Promise<string> => {
  const storageRef = ref(storage, `avatars/${userId}_${Date.now()}`);
  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", userId), { avatar: imageUrl });
  return imageUrl;
};

// Fix: Added missing isFirebaseActive
export const isFirebaseActive = (): boolean => {
  return !!auth.app;
};
