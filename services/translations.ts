import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../types';

type Translations = {
  [key: string]: {
    en: string;
    ro: string;
    fr: string;
  };
};

export const dictionary: Translations = {
  // Navigation
  nav_home: { en: 'Home', ro: 'Acasă', fr: 'Accueil' },
  nav_about: { en: 'About', ro: 'Despre Noi', fr: 'À Propos' },
  nav_events: { en: 'Events', ro: 'Evenimente', fr: 'Événements' },
  nav_gallery: { en: 'Gallery', ro: 'Galerie', fr: 'Galerie' },
  nav_contact: { en: 'Contact', ro: 'Contact', fr: 'Contact' },
  nav_login: { en: 'Join / Login', ro: 'Intră / Înscrie-te', fr: 'Rejoindre / Connexion' },
  nav_logout: { en: 'Logout', ro: 'Deconectare', fr: 'Déconnexion' },
  nav_dashboard: { en: 'Dashboard', ro: 'Panou Control', fr: 'Tableau de bord' },

  // Hero
  hero_title_prefix: { en: 'Preserving', ro: 'Păstrăm', fr: 'Préserver' },
  hero_title_highlight: { en: 'Tradition', ro: 'Tradiția', fr: 'la Tradition' },
  hero_subtitle: { en: 'Celebrating the vibrant spirit of Romanian culture through dance, music, and community.', ro: 'Celebrăm spiritul vibrant al culturii românești prin dans, muzică și comunitate.', fr: 'Célébrer l\'esprit vibrant de la culture roumaine à travers la danse, la musique et la communauté.' },
  hero_btn_events: { en: 'Explore Events', ro: 'Vezi Evenimente', fr: 'Voir les Événements' },
  hero_btn_about: { en: 'About Us', ro: 'Despre Noi', fr: 'À Propos' },

  // About
  about_title: { en: 'Who We Are', ro: 'Cine Suntem', fr: 'Qui Sommes-Nous' },
  about_text: { en: 'Since 1995, we have been the heartbeat of Romanian culture in the region. Our mission is simple: to keep the flame of our heritage alive through the energetic beats of the Hora, the intricate embroidery of our costumes, and the warmth of our community gatherings.', ro: 'Din 1995, suntem inima culturii românești din regiune. Misiunea noastră este simplă: să menținem vie flacăra moștenirii noastre prin ritmurile energice ale Horei, broderiile complexe ale costumelor noastre și căldura adunărilor comunității.', fr: 'Depuis 1995, nous sommes le cœur de la culture roumaine dans la région. Notre mission est simple : garder vivante la flamme de notre patrimoine à travers les rythmes énergiques de la Hora, les broderies complexes de nos costumes et la chaleur de nos rassemblements communautaires.' },
  about_feature_1: { en: 'Weekly Dance Workshops', ro: 'Ateliere Săptămânale de Dans', fr: 'Ateliers de Danse Hebdomadaires' },
  about_feature_2: { en: 'Cultural Exhibitions', ro: 'Expoziții Culturale', fr: 'Expositions Culturelles' },
  about_feature_3: { en: 'Youth Programs', ro: 'Programe pentru Tineret', fr: 'Programmes Jeunesse' },

  // Events
  events_title: { en: 'Upcoming Events', ro: 'Evenimente Viitoare', fr: 'Événements à Venir' },
  events_subtitle: { en: 'Join us in our celebrations. Members can RSVP directly, and everyone can add events to their calendar.', ro: 'Alăturați-vă sărbătorilor noastre. Membrii pot confirma participarea direct, iar toată lumea poate adăuga evenimente în calendar.', fr: 'Rejoignez-nous dans nos célébrations. Les membres peuvent répondre directement et chacun peut ajouter des événements à son calendrier.' },
  events_calendar_btn: { en: 'View Full Calendar', ro: 'Vezi Calendar Complet', fr: 'Voir Calendrier Complet' },
  events_rsvp_btn: { en: 'RSVP Now', ro: 'Confirmă Acum', fr: 'Réservez Maintenant' },
  events_going_btn: { en: 'Going', ro: 'Particip', fr: 'J\'y vais' },
  events_login_rsvp: { en: 'Login to RSVP', ro: 'Intră în cont pt RSVP', fr: 'Connexion pour Réserver' },

  // Gallery
  gallery_title: { en: 'Cultural Gallery', ro: 'Galerie Culturală', fr: 'Galerie Culturelle' },
  gallery_subtitle: { en: 'Follow us on Instagram', ro: 'Urmărește-ne pe Instagram', fr: 'Suivez-nous sur Instagram' },

  // Testimonials
  testimonials_title: { en: 'Community Stories', ro: 'Poveștile Comunității', fr: 'Histoires de la Communauté' },

  // Contact
  contact_title: { en: 'Get in Touch', ro: 'Contactează-ne', fr: 'Contactez-nous' },
  contact_subtitle: { en: 'Interested in joining our folk club, booking a performance, or just want to say hello?', ro: 'Interesat să te alături clubului, să rezervi un spectacol sau doar să ne saluți?', fr: 'Intéressé à rejoindre notre club, réserver un spectacle ou simplement dire bonjour ?' },
  contact_label_location: { en: 'Location', ro: 'Locație', fr: 'Emplacement' },
  contact_label_email: { en: 'Email', ro: 'Email', fr: 'Email' },
  contact_form_title: { en: 'Send a Message', ro: 'Trimite un Mesaj', fr: 'Envoyer un Message' },
  contact_form_name: { en: 'Name', ro: 'Nume', fr: 'Nom' },
  contact_form_msg: { en: 'Message', ro: 'Mesaj', fr: 'Message' },
  contact_btn_send: { en: 'Send Message', ro: 'Trimite Mesaj', fr: 'Envoyer Message' },
  contact_btn_sending: { en: 'Sending...', ro: 'Se trimite...', fr: 'Envoi...' },
  contact_btn_success: { en: 'Message Sent!', ro: 'Mesaj Trimis!', fr: 'Message Envoyé!' },

  // Auth
  auth_welcome: { en: 'Welcome Back', ro: 'Bine ai Revenit', fr: 'Bon Retour' },
  auth_join: { en: 'Join the Club', ro: 'Alătură-te Clubului', fr: 'Rejoindre le Club' },
  auth_login_btn: { en: 'Login', ro: 'Autentificare', fr: 'Connexion' },
  auth_signup_btn: { en: 'Create Account', ro: 'Creare Cont', fr: 'Créer un Compte' },
  auth_switch_signup: { en: "Don't have an account?", ro: 'Nu ai cont?', fr: "Pas encore de compte ?" },
  auth_switch_login: { en: 'Already a member?', ro: 'Ești deja membru?', fr: 'Déjà membre ?' },
  auth_demo: { en: 'Demo Credentials', ro: 'Conturi Demo', fr: 'Identifiants Démo' },
  auth_processing: { en: 'Processing...', ro: 'Se procesează...', fr: 'Traitement...' },

  // Dashboard - General
  dash_tab_events: { en: 'Manage Events', ro: 'Gest. Evenimente', fr: 'Gérer Événements' },
  dash_tab_gallery: { en: 'Manage Gallery', ro: 'Gest. Galerie', fr: 'Gérer Galerie' },
  dash_tab_users: { en: 'Manage Users', ro: 'Gest. Utilizatori', fr: 'Gérer Utilisateurs' },
  dash_tab_testimonials: { en: 'Testimonials', ro: 'Testimoniale', fr: 'Témoignages' },
  dash_tab_schedule: { en: 'My Schedule', ro: 'Programul Meu', fr: 'Mon Planning' },
  dash_tab_resources: { en: 'Member Resources', ro: 'Resurse Membri', fr: 'Ressources Membres' },
  dash_back: { en: 'Back to Website', ro: 'Înapoi la Site', fr: 'Retour au Site' },
  dash_logged_in: { en: 'Logged in as', ro: 'Conectat ca', fr: 'Connecté en tant que' },
  
  // Dashboard - Events
  dash_add_event: { en: 'Add / Edit Event', ro: 'Adaugă / Edit. Eveniment', fr: 'Ajouter / Modifier' },
  dash_save: { en: 'Save', ro: 'Salvează', fr: 'Enregistrer' },
  dash_delete: { en: 'Delete', ro: 'Șterge', fr: 'Supprimer' },
  dash_event_title: { en: 'Event Title', ro: 'Titlu Eveniment', fr: 'Titre de l\'événement' },
  dash_event_image: { en: 'Event Image', ro: 'Imagine Eveniment', fr: 'Image de l\'événement' },
  dash_event_desc: { en: 'Description', ro: 'Descriere', fr: 'Description' },
  dash_table_event: { en: 'Event', ro: 'Eveniment', fr: 'Événement' },
  dash_table_date: { en: 'Date', ro: 'Dată', fr: 'Date' },
  dash_table_attendees: { en: 'Attendees', ro: 'Participanți', fr: 'Participants' },
  dash_table_actions: { en: 'Actions', ro: 'Acțiuni', fr: 'Actions' },

  // Dashboard - Gallery
  dash_upload_title: { en: 'Upload Image', ro: 'Încarcă Imagine', fr: 'Télécharger une image' },
  dash_upload_text: { en: 'Click to upload image file', ro: 'Click pentru a încărca', fr: 'Cliquez pour télécharger' },
  dash_upload_hint: { en: 'JPG, PNG supported', ro: 'Suportă JPG, PNG', fr: 'JPG, PNG supportés' },
  dash_ig_title: { en: 'Instagram Integration', ro: 'Integrare Instagram', fr: 'Intégration Instagram' },
  dash_ig_text: { en: 'Automatically pull latest photos', ro: 'Trage automat ultimele poze', fr: 'Récupérer auto les photos' },
  dash_ig_btn: { en: 'Sync Now', ro: 'Sincronizează', fr: 'Synchroniser' },
  dash_ig_syncing: { en: 'Syncing...', ro: 'Se sincronizează...', fr: 'Synchronisation...' },

  // Dashboard - Users
  dash_table_user: { en: 'User', ro: 'Utilizator', fr: 'Utilisateur' },
  dash_table_email: { en: 'Email', ro: 'Email', fr: 'Email' },
  dash_table_role: { en: 'Role', ro: 'Rol', fr: 'Rôle' },
  dash_promote: { en: 'Promote to Admin', ro: 'Promovează Admin', fr: 'Promouvoir Admin' },
  dash_demote: { en: 'Demote to Member', ro: 'Retrogradează Membru', fr: 'Rétrograder Membre' },

  // Dashboard - Testimonials
  dash_test_pending: { en: 'Pending Approval', ro: 'În Așteptare', fr: 'En Attente' },
  dash_test_pending_desc: { en: 'Review user submitted stories.', ro: 'Revizuiește poveștile trimise.', fr: 'Revoir les histoires soumises.' },
  dash_test_live: { en: 'Live on Site', ro: 'Live pe Site', fr: 'En Ligne' },
  dash_test_live_desc: { en: 'testimonials visible.', ro: 'testimoniale vizibile.', fr: 'témoignages visibles.' },
  dash_test_author: { en: 'Author', ro: 'Autor', fr: 'Auteur' },
  dash_test_content: { en: 'Content', ro: 'Conținut', fr: 'Contenu' },
  dash_test_status: { en: 'Status', ro: 'Status', fr: 'Statut' },
  dash_status_approved: { en: 'Approved', ro: 'Aprobat', fr: 'Approuvé' },
  dash_status_pending: { en: 'Pending', ro: 'În Așteptare', fr: 'En Attente' },
  dash_btn_approve: { en: 'Approve', ro: 'Aprobă', fr: 'Approuver' },
  dash_btn_hide: { en: 'Hide', ro: 'Ascunde', fr: 'Masquer' },
  dash_btn_remove: { en: 'Remove', ro: 'Elimină', fr: 'Retirer' },
  
  // Dashboard - Member
  dash_no_rsvp: { en: "You haven't RSVP'd to any events yet.", ro: "Nu ai confirmat la niciun eveniment.", fr: "Vous n'avez pas encore répondu aux événements." },
  dash_browse_events: { en: "Browse Events", ro: "Vezi Evenimente", fr: "Parcourir les événements" },
  dash_resource_costume: { en: "Costume Guide", ro: "Ghid Costume", fr: "Guide Costumes" },
  dash_resource_music: { en: "Practice Tracks", ro: "Muzică Repetiții", fr: "Pistes d'entraînement" },
  dash_resource_video: { en: "Choreography", ro: "Coregrafie", fr: "Chorégraphie" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('app_language');
    // If not found, try to detect browser language
    if (!saved) {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'ro') return 'ro';
      if (browserLang === 'fr') return 'fr';
    }
    return (saved === 'ro' || saved === 'fr' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    if (!dictionary[key]) return key;
    return dictionary[key][language];
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
