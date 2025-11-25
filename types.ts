
export type UserRole = 'admin' | 'member' | 'guest';
export type Language = 'en' | 'ro' | 'fr';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phoneNumber?: string; // Added for SMS notifications
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string; // Start Time
  endTime?: string; // End Time
  location: string;
  description: string | { en: string; ro: string; fr: string };
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
  type?: 'image' | 'video'; 
  eventId?: string; 
  approved: boolean; // New field for moderation
  uploadedBy?: string; // New field to track contributor
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
  id: string; 
  description: string; 
  text: {
    en: string;
    ro: string;
    fr: string;
  };
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'music' | 'choreography' | 'costume' | 'document';
  dateAdded: string;
}
