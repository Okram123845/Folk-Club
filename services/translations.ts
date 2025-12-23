
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
  nav_login: { en: 'Join / Login', ro: 'Autentificare', fr: 'Connexion' },
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
  about_feature_1: { en: 'Weekly Dance Workshops', ro: 'Ateliere Săptămânale', fr: 'Ateliers de Danse' },
  about_feature_2: { en: 'Cultural Exhibitions', ro: 'Expoziții Culturale', fr: 'Expositions Culturelles' },
  about_feature_3: { en: 'Youth Programs', ro: 'Programe pentru Tineret', fr: 'Programmes Jeunesse' },

  // Events
  events_title: { en: 'Upcoming Events', ro: 'Evenimente Viitoare', fr: 'Événements à Venir' },
  events_archive_title: { en: 'Event History', ro: 'Arhivă Evenimente', fr: 'Historique des Événements' },
  events_subtitle: { en: 'Join us in our celebrations. Members can RSVP directly, and everyone can add events to their calendar.', ro: 'Alăturați-vă sărbătorilor noastre. Membrii pot confirma participarea direct.', fr: 'Rejoignez-nous dans nos célébrations. Les membres peuvent répondre directement.' },
  events_calendar_btn: { en: 'View Full Calendar', ro: 'Calendar Complet', fr: 'Calendrier Complet' },
  events_view_archive: { en: 'View Past Events', ro: 'Vezi Evenimente Trecute', fr: 'Voir Événements Passés' },
  events_back_upcoming: { en: 'Back to Upcoming', ro: 'Înapoi la Curente', fr: 'Retour aux Événements' },
  events_no_upcoming: { en: 'No upcoming events scheduled at the moment.', ro: 'Nu există evenimente programate momentan.', fr: 'Aucun événement prévu pour le moment.' },
  events_rsvp_btn: { en: 'RSVP Now', ro: 'Participă', fr: 'Réservez' },
  events_going_btn: { en: 'Going', ro: 'Particip', fr: 'J\'y vais' },
  events_login_rsvp: { en: 'Login to RSVP', ro: 'Autentificare pentru RSVP', fr: 'Connexion pour Réserver' },
  events_completed_badge: { en: 'Completed', ro: 'Finalizat', fr: 'Terminé' },
  events_ended_msg: { en: 'Event has ended', ro: 'Eveniment încheiat', fr: 'L\'événement est terminé' },
  events_view_details: { en: 'View Details', ro: 'Detalii', fr: 'Voir Détails' },
  events_details_title: { en: 'Event Details', ro: 'Detalii Eveniment', fr: 'Détails de l\'événement' },
  events_media_gallery: { en: 'Event Media Gallery', ro: 'Galerie Media', fr: 'Galerie Média' },
  events_no_media: { en: 'No media uploaded for this event yet.', ro: 'Nu există media încărcată.', fr: 'Aucun média téléchargé.' },
  events_contrib_title: { en: 'Contribute to Gallery', ro: 'Contribuie la Galerie', fr: 'Contribuer à la Galerie' },
  events_contrib_text: { en: 'Members can upload photos and videos to this event. They will be visible after admin approval.', ro: 'Membrii pot încărca poze și video-uri. Vor fi vizibile după aprobare.', fr: 'Les membres peuvent télécharger des photos. Elles seront visibles après approbation.' },
  events_contrib_upload: { en: 'Upload Media', ro: 'Încarcă', fr: 'Télécharger' },
  events_contrib_success: { en: 'Media submitted for review!', ro: 'Trimis spre aprobare!', fr: 'Soumis pour examen !' },
  events_contrib_login: { en: 'Login as Member to contribute', ro: 'Autentificare pentru a contribui', fr: 'Connectez-vous pour contribuer' },
  events_info_box_title: { en: 'Event Info', ro: 'Informații', fr: 'Infos' },
  events_label_date: { en: 'Date', ro: 'Dată', fr: 'Date' },
  events_label_time: { en: 'Time', ro: 'Oră', fr: 'Heure' },
  events_label_location: { en: 'Location', ro: 'Locație', fr: 'Lieu' },
  events_archive_empty: { en: 'No archived events found.', ro: 'Niciun eveniment găsit.', fr: 'Aucun événement trouvé.' },
  events_search_placeholder: { en: 'Search events...', ro: 'Caută evenimente...', fr: 'Rechercher des événements...' },
  
  // RSVP Modal
  rsvp_modal_title: { en: 'You are going!', ro: 'Participi!', fr: 'Vous participez !' },
  rsvp_modal_msg: { en: 'Would you like to add this event to your Google Calendar?', ro: 'Adaugi evenimentul în Google Calendar?', fr: 'Ajouter cet événement à Google Agenda ?' },
  rsvp_btn_add: { en: 'Add to Calendar', ro: 'Adaugă în Calendar', fr: 'Ajouter au calendrier' },
  rsvp_btn_no: { en: 'No thanks', ro: 'Nu, mulțumesc', fr: 'Non merci' },

  // Navigation
  nav_back_home: { en: 'Back to Home', ro: 'Înapoi la Acasă', fr: 'Retour à l\'Accueil' },

  // Event Types
  event_type_performance: { en: 'Performance', ro: 'Spectacol', fr: 'Spectacle' },
  event_type_workshop: { en: 'Workshop', ro: 'Atelier', fr: 'Atelier' },
  event_type_social: { en: 'Social', ro: 'Social', fr: 'Social' },

  // Gallery
  gallery_title: { en: 'Cultural Gallery', ro: 'Galerie Culturală', fr: 'Galerie Culturelle' },
  gallery_subtitle: { en: 'Follow us on Instagram', ro: 'Urmărește-ne pe Instagram', fr: 'Suivez-nous sur Instagram' },

  // Testimonials
  testimonials_title: { en: 'Community Stories', ro: 'Poveștile Comunității', fr: 'Histoires de la Communauté' },

  // Contact
  contact_title: { en: 'Get in Touch', ro: 'Contact', fr: 'Contactez-nous' },
  contact_subtitle: { en: 'Interested in joining our folk club, booking a performance, or just want to say hello?', ro: 'Vrei să te alături clubului, să rezervi un spectacol sau doar să ne saluți?', fr: 'Rejoindre le club, réserver un spectacle ou dire bonjour ?' },
  contact_label_location: { en: 'Location', ro: 'Locație', fr: 'Emplacement' },
  contact_label_email: { en: 'Email', ro: 'Email', fr: 'Email' },
  contact_form_title: { en: 'Send a Message', ro: 'Trimite un Mesaj', fr: 'Envoyer un Message' },
  contact_form_name: { en: 'Name', ro: 'Nume', fr: 'Nom' },
  contact_form_msg: { en: 'Message', ro: 'Mesaj', fr: 'Message' },
  contact_btn_send: { en: 'Send Message', ro: 'Trimite', fr: 'Envoyer' },
  contact_btn_sending: { en: 'Sending...', ro: 'Se trimite...', fr: 'Envoi...' },
  contact_btn_success: { en: 'Message Sent!', ro: 'Trimis!', fr: 'Envoyé !' },

  // Auth
  auth_welcome: { en: 'Welcome Back', ro: 'Bine ai Revenit', fr: 'Bon Retour' },
  auth_join: { en: 'Join the Club', ro: 'Înregistrare', fr: 'Rejoindre le Club' },
  auth_login_btn: { en: 'Login', ro: 'Autentificare', fr: 'Connexion' },
  auth_signup_btn: { en: 'Create Account', ro: 'Creează Cont', fr: 'Créer un Compte' },
  auth_switch_signup: { en: "Don't have an account?", ro: 'Nu ai cont?', fr: "Pas encore de compte ?" },
  auth_switch_login: { en: 'Already a member?', ro: 'Ai deja cont?', fr: 'Déjà membre ?' },
  auth_demo: { en: 'Demo Credentials', ro: 'Date Demo', fr: 'Identifiants Démo' },
  auth_processing: { en: 'Processing...', ro: 'Se procesează...', fr: 'Traitement...' },
  auth_password: { en: 'Password', ro: 'Parolă', fr: 'Mot de passe' },
  auth_error_generic: { en: 'Authentication failed', ro: 'Eroare autentificare', fr: 'Échec de l\'authentification' },
  auth_error_invalid_cred: { en: 'Incorrect email or password.', ro: 'Email sau parolă incorectă.', fr: 'Email ou mot de passe incorrect.' },
  auth_error_email_taken: { en: 'This email is already registered.', ro: 'Acest email este deja înregistrat.', fr: 'Cet email est déjà enregistré.' },

  // Dashboard - General
  dash_tab_events: { en: 'Manage Events', ro: 'Evenimente', fr: 'Gérer Événements' },
  dash_tab_gallery: { en: 'Manage Gallery', ro: 'Galerie', fr: 'Gérer Galerie' },
  dash_tab_users: { en: 'Manage Users', ro: 'Utilizatori', fr: 'Utilisateurs' },
  dash_tab_testimonials: { en: 'Testimonials', ro: 'Testimoniale', fr: 'Témoignages' },
  dash_tab_schedule: { en: 'My Schedule', ro: 'Program', fr: 'Mon Planning' },
  dash_tab_resources: { en: 'Member Resources', ro: 'Resurse', fr: 'Ressources' },
  dash_tab_community: { en: 'My Stories', ro: 'Povești', fr: 'Mes Histoires' },
  dash_tab_content: { en: 'Page Content', ro: 'Conținut Site', fr: 'Contenu Page' },
  dash_back: { en: 'Back to Website', ro: 'Înapoi la Site', fr: 'Retour au Site' },
  dash_exit: { en: 'Exit', ro: 'Ieșire', fr: 'Sortie' },
  dash_logged_in: { en: 'Logged in as', ro: 'Conectat ca', fr: 'Connecté en tant que' },
  
  // Dashboard - Events
  dash_add_event: { en: 'Add / Edit Event', ro: 'Adaugă / Edit. Eveniment', fr: 'Ajouter / Modifier' },
  dash_save: { en: 'Save', ro: 'Salvează', fr: 'Enregistrer' },
  dash_cancel: { en: 'Cancel', ro: 'Anulează', fr: 'Annuler' },
  dash_update: { en: 'Update', ro: 'Actualizează', fr: 'Mettre à jour' },
  dash_delete: { en: 'Delete', ro: 'Șterge', fr: 'Supprimer' },
  dash_delete_confirm: { en: 'Are you sure you want to delete this item?', ro: 'Sigur doriți să ștergeți acest element?', fr: 'Êtes-vous sûr de vouloir supprimer cet élément ?' },
  dash_event_title: { en: 'Event Title', ro: 'Titlu', fr: 'Titre' },
  dash_event_image: { en: 'Event Image', ro: 'Imagine', fr: 'Image' },
  dash_event_desc: { en: 'Description', ro: 'Descriere', fr: 'Description' },
  dash_event_title_ph: { en: 'e.g. Spring Festival', ro: 'ex. Festivalul de Primăvară', fr: 'ex. Festival de Printemps' },
  dash_event_loc_ph: { en: 'e.g. Main Hall', ro: 'ex. Sala Principală', fr: 'ex. Salle Principale' },
  dash_event_desc_ph: { en: 'Event details in', ro: 'Detalii în', fr: 'Détails en' },
  dash_table_event: { en: 'Event', ro: 'Eveniment', fr: 'Événement' },
  dash_table_date: { en: 'Date', ro: 'Dată', fr: 'Date' },
  dash_table_attendees: { en: 'Attendees', ro: 'Participanți', fr: 'Participants' },
  dash_table_actions: { en: 'Actions', ro: 'Acțiuni', fr: 'Actions' },
  dash_search_events: { en: 'Search events...', ro: 'Caută...', fr: 'Rechercher...' },

  // Dashboard - Gallery
  dash_upload_title: { en: 'Add Media', ro: 'Adaugă Media', fr: 'Ajouter Média' },
  dash_upload_text: { en: 'Click to upload image', ro: 'Click pentru a încărca', fr: 'Cliquez pour télécharger' },
  dash_gal_type: { en: 'Media Type', ro: 'Tip', fr: 'Type' },
  dash_gal_video_url: { en: 'Video URL', ro: 'URL Video', fr: 'URL Vidéo' },
  dash_gal_video_hint: { en: 'Supports YouTube, Vimeo links.', ro: 'Link-uri YouTube, Vimeo.', fr: 'Liens YouTube, Vimeo.' },
  dash_gal_event_link: { en: 'Link to Event', ro: 'Legătură Eveniment', fr: 'Lier à l\'événement' },
  dash_gal_pending: { en: 'Pending Review', ro: 'În Așteptare', fr: 'En Attente' },
  dash_gal_approved: { en: 'Approved Media', ro: 'Aprobat', fr: 'Approuvé' },
  dash_ig_title: { en: 'Instagram Integration', ro: 'Integrare Instagram', fr: 'Intégration Instagram' },
  dash_ig_text: { en: 'Automatically pull latest photos', ro: 'Importă ultimele poze', fr: 'Importer photos' },
  dash_ig_btn: { en: 'Sync Now', ro: 'Sincronizează', fr: 'Synchroniser' },
  dash_ig_syncing: { en: 'Syncing...', ro: 'Se sincronizează...', fr: 'Synchronisation...' },

  // Dashboard - Users
  dash_table_user: { en: 'User', ro: 'Utilizator', fr: 'Utilisateur' },
  dash_table_email: { en: 'Email', ro: 'Email', fr: 'Email' },
  dash_table_role: { en: 'Role', ro: 'Rol', fr: 'Rôle' },
  dash_promote: { en: 'Promote to Admin', ro: 'Promovează Admin', fr: 'Promouvoir Admin' },
  dash_demote: { en: 'Demote to Member', ro: 'Retrogradează Membru', fr: 'Rétrograder Membre' },

  // Dashboard - Testimonials
  dash_test_add: { en: 'Submit Your Story', ro: 'Trimite Povestea Ta', fr: 'Soumettez votre histoire' },
  dash_test_add_desc: { en: 'Share your experience with the community.', ro: 'Împărtășește experiența ta cu comunitatea.', fr: 'Partagez votre expérience.' },
  dash_test_edit: { en: 'Edit Testimonial', ro: 'Editează', fr: 'Modifier' },
  dash_test_pending: { en: 'Pending Approval', ro: 'În Așteptare', fr: 'En Attente' },
  dash_test_pending_desc: { en: 'Review user stories.', ro: 'Revizuiește poveștile.', fr: 'Revoir les histoires.' },
  dash_test_live: { en: 'Live on Site', ro: 'Activ pe Site', fr: 'En Ligne' },
  dash_test_live_desc: { en: 'testimonials visible.', ro: 'testimoniale vizibile.', fr: 'témoignages visibles.' },
  dash_test_author: { en: 'Author', ro: 'Autor', fr: 'Auteur' },
  dash_test_content: { en: 'Content', ro: 'Conținut', fr: 'Contenu' },
  dash_test_status: { en: 'Status', ro: 'Status', fr: 'Statut' },
  dash_status_approved: { en: 'Approved', ro: 'Aprobat', fr: 'Approuvé' },
  dash_status_pending: { en: 'Pending', ro: 'În Așteptare', fr: 'En Attente' },
  dash_btn_approve: { en: 'Approve', ro: 'Aprobă', fr: 'Approuver' },
  dash_btn_hide: { en: 'Hide', ro: 'Ascunde', fr: 'Masquer' },
  dash_btn_remove: { en: 'Remove', ro: 'Șterge', fr: 'Retirer' },
  dash_content_saved: { en: 'Saved successfully!', ro: 'Salvat cu succes!', fr: 'Enregistré avec succès !' },
  dash_test_submitted: { en: 'Story submitted!', ro: 'Poveste trimisă!', fr: 'Histoire soumise !' },
  
  // Dashboard - Content
  dash_content_title: { en: 'Manage Content', ro: 'Gestionează Conținut', fr: 'Gérer le Contenu' },
  dash_content_select: { en: 'Select Section', ro: 'Alege Secțiunea', fr: 'Choisir la Section' },
  dash_content_en: { en: 'English', ro: 'Engleză', fr: 'Anglais' },
  dash_content_ro: { en: 'Romanian', ro: 'Română', fr: 'Roumain' },
  dash_content_fr: { en: 'French', ro: 'Franceză', fr: 'Français' },
  dash_content_save: { en: 'Save Changes', ro: 'Salvează', fr: 'Enregistrer' },

  // Dashboard - Resources
  dash_res_add: { en: 'Add Resource', ro: 'Adaugă Resursă', fr: 'Ajouter Ressource' },
  dash_res_title_label: { en: 'Title', ro: 'Titlu', fr: 'Titre' },
  dash_res_desc_label: { en: 'Description', ro: 'Descriere', fr: 'Description' },
  dash_res_input_type: { en: 'Type', ro: 'Tip', fr: 'Type' },
  dash_res_type_url: { en: 'Link', ro: 'Link', fr: 'Lien' },
  dash_res_type_file: { en: 'File', ro: 'Fișier', fr: 'Fichier' },
  dash_res_url_label: { en: 'URL', ro: 'URL', fr: 'URL' },
  dash_res_file_label: { en: 'Select File', ro: 'Alege Fișier', fr: 'Choisir Fichier' },
  dash_res_cat_label: { en: 'Category', ro: 'Categorie', fr: 'Catégorie' },
  dash_res_cat_music: { en: 'Music', ro: 'Muzică', fr: 'Musique' },
  dash_res_cat_choreo: { en: 'Choreography', ro: 'Coregrafie', fr: 'Chorégraphie' },
  dash_res_cat_costume: { en: 'Costumes', ro: 'Costume', fr: 'Costumes' },
  dash_res_cat_doc: { en: 'Documents', ro: 'Documente', fr: 'Documents' },
  dash_res_list_title: { en: 'Resources', ro: 'Resurse', fr: 'Ressources' },
  dash_res_empty: { en: 'No resources.', ro: 'Nu sunt resurse.', fr: 'Aucune ressource.' },

  // Dashboard - Member
  dash_no_rsvp: { en: "You haven't RSVP'd to any events yet.", ro: "Nu ai confirmat la niciun eveniment.", fr: "Pas encore de réponse aux événements." },
  dash_browse_events: { en: "Browse Events", ro: "Vezi Evenimente", fr: "Voir les événements" },
  dash_profile_settings: { en: "Profile Settings", ro: "Setări Profil", fr: "Paramètres de Profil" },
  dash_mobile_num: { en: "Mobile Number", ro: "Număr Mobil", fr: "Numéro Mobile" },
  dash_carrier_label: { en: "Carrier (for SMS)", ro: "Rețea (pt SMS)", fr: "Opérateur (SMS)" },
  dash_save_settings: { en: "Save Settings", ro: "Salvează", fr: "Enregistrer" },
  dash_avatar_change: { en: "Change Photo", ro: "Schimbă Poza", fr: "Changer Photo" },
  dash_mobile_hint: { en: "Required for SMS alerts.", ro: "Necesar pentru alerte SMS.", fr: "Requis pour les alertes SMS." },
  dash_avatar_error: { en: "Error updating avatar.", ro: "Eroare la actualizarea pozei.", fr: "Erreur lors de la mise à jour de l'avatar." },
  dash_my_submissions: { en: "My Submissions", ro: "Trimiterile Mele", fr: "Mes Soumissions" },
  dash_no_submissions: { en: "No stories submitted yet.", ro: "Nicio poveste trimisă.", fr: "Aucune histoire soumise." },
  dash_avatar_customize: { en: "Customize Avatar", ro: "Personalizează Avatar", fr: "Personnaliser Avatar" },
  dash_avatar_bg: { en: "Background Color", ro: "Culoare Fundal", fr: "Couleur de Fond" },
  dash_avatar_initials: { en: "Custom Initials (Max 2)", ro: "Inițiale (Max 2)", fr: "Initiales (Max 2)" }
};

// --- Context & Provider ---
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && ['en', 'ro', 'fr'].includes(savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string): string => {
    const entry = dictionary[key];
    if (!entry) return key; // Fallback to key if missing
    return entry[language] || entry['en'] || key;
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage: handleSetLanguage, t } },
    children
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within a LanguageProvider');
  return context;
};

// Helper to get localized text from either string or multi-lang object
export const getLocalizedText = (content: string | { en: string; ro: string; fr: string }, lang: Language): string => {
    if (typeof content === 'string') return content;
    if (!content) return '';
    
    // 1. Try requested language
    if (content[lang]) return content[lang];
    
    // 2. Fallback to English
    if (content['en']) return content['en'];
    
    // 3. Fallback to any available
    return content['ro'] || content['fr'] || '';
};
