
export type UserRole = 'admin' | 'member' | 'guest';
export type Language = 'en' | 'ro' | 'fr';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image?: string;
  type: 'performance' | 'workshop' | 'social';
  attendees: string[]; // User IDs
}

export interface GalleryItem {
  id: string;
  url: string;
  caption: string;
  source: 'upload' | 'instagram';
  dateAdded: string;
}

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  text: string;
  approved: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  date: string;
  read: boolean;
}

export interface InstagramPost {
  id: string;
  media_url: string;
  caption: string;
  permalink: string;
}

export interface PageContent {
  id: string; // e.g., 'about_text', 'contact_subtitle'
  description: string; // For the admin to know what they are editing
  text: {
    en: string;
    ro: string;
    fr: string;
  };
}
