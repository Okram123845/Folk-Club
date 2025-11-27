
import React, { useState, useRef, useEffect } from 'react';
import { User, Event, GalleryItem, Testimonial, PageContent, Resource, Language } from '../types';
import { 
  saveEvent, 
  deleteEvent, 
  addGalleryItem, 
  syncInstagram, 
  getUsers, 
  updateUserRole, 
  updateUserProfile,
  getTestimonials,
  addTestimonial,
  updateTestimonial,
  toggleTestimonialApproval,
  deleteTestimonial,
  getPageContent,
  updatePageContent,
  deleteGalleryItem,
  deleteUser,
  isFirebaseActive,
  toggleGalleryApproval,
  getResources,
  addResource,
  deleteResource,
  migrateLegacyEvents
} from '../services/mockService';
import { useTranslation } from '../services/translations';
import { translateText } from '../services/integrations';
import LanguageSwitcher from './LanguageSwitcher';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';

interface DashboardProps {
  user: User;
  events: Event[];
  gallery: GalleryItem[];
  onUpdateData: () => void;
  onClose: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, events, gallery, onUpdateData, onClose }) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState(user.role === 'admin' ? 'events' : 'schedule');
  const [isSyncing, setIsSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [isLive, setIsLive] = useState(false);
  useEffect(() => { setIsLive(isFirebaseActive()); }, []);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTestimonials, setAllTestimonials] = useState<Testimonial[]>([]);
  const [pageContents, setPageContents] = useState<PageContent[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  
  const [localEvents, setLocalEvents] = useState<Event[]>(events);
  const [localGallery, setLocalGallery] = useState<GalleryItem[]>(gallery);

  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');

  useEffect(() => { setLocalEvents(events); }, [events]);
  useEffect(() => { setLocalGallery(gallery); }, [gallery]);
  
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [editContentText, setEditContentText] = useState<{en: string, ro: string, fr: string}>({ en: '', ro: '', fr: '' });
  
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [memberStory, setMemberStory] = useState('');

  const [newEvent, setNewEvent] = useState<Partial<Event>>({ type: 'performance' });
  const [descriptionLang, setDescriptionLang] = useState<Language>('en'); // Independent language toggle
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Resource Management State
  const [newResource, setNewResource] = useState<Partial<Resource>>({ category: 'document' });
  const [resourceInputType, setResourceInputType] = useState<'url' | 'file'>('url');
  
  const eventImageRef = useRef<HTMLInputElement>(null);
  const eventFormTopRef = useRef<HTMLDivElement>(null);

  // Gallery Upload State
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'event' | 'gallery' | 'user' | 'testimonial' | 'resource', name?: string, img?: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadCommonData();
    if (user.role === 'admin') {
      loadAdminData();
    }
  }, [user.role, activeTab]);

  // Sync description editor language with app language initially
  useEffect(() => {
    setDescriptionLang(language);
  }, []);

  const loadCommonData = async () => {
     try {
         const tData = await getTestimonials();
         setAllTestimonials(tData);
         const rData = await getResources();
         setResources(rData);
     } catch(e) { console.error(e); }
  }

  const loadAdminData = async () => {
    try {
      const u = await getUsers();
      setAllUsers(u);
      const contentData = await getPageContent();
      setPageContents(contentData);
      
      if (contentData.length > 0 && !selectedContentId) {
         setSelectedContentId(contentData[0].id);
         setEditContentText(contentData[0].text);
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    }
  };

  const handleFixLegacyEvents = async () => {
    const confirmFix = window.confirm("This will scan all events and automatically translate descriptions that are missing for other languages. Continue?");
    if (!confirmFix) return;

    setModalLoading(true);
    try {
      const count = await migrateLegacyEvents();
      if (count > 0) {
        showToast(`Updated ${count} legacy events with translations!`, 'success');
        onUpdateData(); // Refresh app data
      } else {
        showToast('All events are already up to date.', 'success');
      }
    } catch (e) {
      showToast('Failed to fix legacy events', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAutoTranslate = async () => {
    if (!newEvent.description) return;
    
    setIsTranslating(true);
    try {
      let currentDesc = { en: '', ro: '', fr: '' };
      if (typeof newEvent.description === 'string') {
        currentDesc = { en: newEvent.description, ro: '', fr: '' };
      } else {
        currentDesc = { ...(newEvent.description as any) };
      }

      const sourceText = currentDesc[descriptionLang];
      if (!sourceText) {
        showToast("Please enter text in the current language first.", "error");
        setIsTranslating(false);
        return;
      }

      const targets: Language[] = ['en', 'ro', 'fr'];
      for (const target of targets) {
        if (target !== descriptionLang && !currentDesc[target]) {
           currentDesc[target] = await translateText(sourceText, target);
        }
      }
      
      setNewEvent({ ...newEvent, description: currentDesc });
      showToast("Translations generated!", "success");
    } catch (e) {
      showToast("Translation failed.", "error");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    
    try {
      await saveEvent({
        ...newEvent,
        id: newEvent.id || '',
        attendees: newEvent.attendees || []
      } as Event);
      
      setNewEvent({ type: 'performance' });
      if (eventImageRef.current) eventImageRef.current.value = '';
      onUpdateData();
      showToast(t('dash_content_saved'), 'success');
    } catch (e) {
      showToast('Failed to save event.', 'error');
    }
  };

  const handleEditEvent = (ev: Event) => {
    let description = ev.description;
    
    // Normalize string description to multi-language object for editing
    if (typeof description === 'string') {
        description = { en: description, ro: description, fr: description };
    } else if (!description) {
        description = { en: '', ro: '', fr: '' };
    } else {
        // Ensure all keys exist
        description = {
            en: (description as any).en || '',
            ro: (description as any).ro || '',
            fr: (description as any).fr || ''
        };
    }

    setNewEvent({
      ...ev,
      description: description
    });
    
    if (eventFormTopRef.current) {
      eventFormTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setNewEvent({ type: 'performance' });
    if (eventImageRef.current) eventImageRef.current.value = '';
  };

  const requestDeleteEvent = (ev: Event) => {
    setItemToDelete({ id: ev.id, type: 'event', name: ev.title, img: ev.image });
    setModalOpen(true);
  };

  const requestDeleteGallery = (item: GalleryItem) => {
    setItemToDelete({ id: item.id, type: 'gallery', name: 'Media', img: item.type === 'video' ? undefined : item.url });
    setModalOpen(true);
  };

  const requestDeleteUser = (u: User) => {
    setItemToDelete({ id: u.id, type: 'user', name: u.name, img: u.avatar });
    setModalOpen(true);
  };

  const requestDeleteTestimonial = (test: Testimonial) => {
    setItemToDelete({ id: test.id, type: 'testimonial', name: `"${test.text.substring(0, 20)}..." by ${test.author}` });
    setModalOpen(true);
  };

  const requestDeleteResource = (res: Resource) => {
    setItemToDelete({ id: res.id, type: 'resource', name: res.title });
    setModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;

    setModalLoading(true);
    try {
      switch (itemToDelete.type) {
        case 'event':
          setLocalEvents(prev => prev.filter(e => e.id !== itemToDelete.id));
          await deleteEvent(itemToDelete.id);
          break;
        case 'gallery':
          setLocalGallery(prev => prev.filter(i => i.id !== itemToDelete.id));
          await deleteGalleryItem(itemToDelete.id);
          break;
        case 'user':
          await deleteUser(itemToDelete.id);
          break;
        case 'testimonial':
          setAllTestimonials(prev => prev.filter(t => t.id !== itemToDelete.id));
          await deleteTestimonial(itemToDelete.id);
          break;
        case 'resource':
          setResources(prev => prev.filter(r => r.id !== itemToDelete.id));
          await deleteResource(itemToDelete.id);
          break;
      }
      
      onUpdateData();
      if (itemToDelete.type === 'user') loadAdminData();
      showToast(`${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} deleted successfully.`, 'success');
    } catch (error) {
      console.error("Delete failed", error);
      showToast("Failed to delete item. Please try again.", 'error');
      onUpdateData();
      loadCommonData();
    } finally {
      setModalLoading(false);
      setModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleEventImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit file size (2MB for demo, 10MB for live)
      const limit = isLive ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
      if (file.size > limit) {
        showToast(isLive ? "File too large (Max 10MB)" : "Demo Mode: Max 2MB allowed", 'error');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvent({ ...newEvent, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Gallery Handlers ---
  const handleMediaUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
          if (mediaType === 'video') {
              if (!videoUrl) return;
              await addGalleryItem({
                  url: videoUrl,
                  caption: 'Video',
                  source: 'upload',
                  type: 'video',
                  eventId: selectedEventId || undefined,
                  approved: true
              });
              setVideoUrl('');
          } else {
             // Image upload logic
          }
          onUpdateData();
          showToast('Media added successfully', 'success');
      } catch (e) {
          showToast('Failed to add media', 'error');
      }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size (2MB for demo, 10MB for live)
    const limit = isLive ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > limit) {
      showToast(isLive ? "File too large (Max 10MB)" : "Demo Mode: Max 2MB allowed", 'error');
      e.target.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await addGalleryItem({
          url: base64,
          caption: file.name,
          source: 'upload',
          type: 'image',
          eventId: selectedEventId || undefined,
          approved: true
        });
        onUpdateData();
        showToast('Image uploaded successfully', 'success');
      };
      reader.readAsDataURL(file);
    } catch (e) {
      showToast('Failed to upload image', 'error');
    }
  }

  const handleApproveGalleryItem = async (id: string) => {
     try {
       await toggleGalleryApproval(id);
       onUpdateData();
       showToast('Media approved!', 'success');
     } catch(e) {
       showToast('Failed to approve media', 'error');
     }
  }

  const handleInstagramSync = async () => {
    setIsSyncing(true);
    try {
      await syncInstagram();
      onUpdateData();
      showToast('Synced with Instagram successfully', 'success');
    } catch (e) {
      showToast('Instagram sync failed. Check API configuration.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleRole = async (targetUser: User) => {
    if (targetUser.id === user.id) {
      showToast("You cannot change your own role.", 'error');
      return;
    }
    try {
      const newRole = targetUser.role === 'admin' ? 'member' : 'admin';
      await updateUserRole(targetUser.id, newRole);
      loadAdminData();
      showToast(`User role updated to ${newRole}`, 'success');
    } catch (e) {
      showToast("Failed to update user role", 'error');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile(user.id, { phoneNumber });
      showToast("Profile settings saved!", 'success');
    } catch(e) {
      showToast("Failed to save profile.", 'error');
    }
  };

  const handleToggleTestimonial = async (id: string) => {
    const previousState = [...allTestimonials];
    setAllTestimonials(prev => prev.map(t => 
      t.id === id ? { ...t, approved: !t.approved } : t
    ));

    try {
      await toggleTestimonialApproval(id);
      onUpdateData();
      showToast('Testimonial status updated', 'success');
    } catch (e) {
      setAllTestimonials(previousState);
      showToast('Failed to update testimonial', 'error');
    }
  };

  const handleSaveTestimonialEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingTestimonial) return;
      setAllTestimonials(prev => prev.map(t => 
        t.id === editingTestimonial.id ? { ...t, text: editingTestimonial.text, author: editingTestimonial.author } : t
      ));
      try {
          await updateTestimonial(editingTestimonial.id, { 
              text: editingTestimonial.text, 
              author: editingTestimonial.author 
          });
          setEditingTestimonial(null);
          onUpdateData();
          showToast(t('dash_content_saved'), 'success');
      } catch(e) {
          showToast("Failed to update testimonial", 'error');
          loadCommonData();
      }
  };
  
  const handleSubmitStory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!memberStory) return;
      try {
          await addTestimonial(user.name, 'Member', memberStory);
          setMemberStory('');
          showToast(t('dash_test_submitted'), 'success');
          loadCommonData();
      } catch(e) {
          showToast("Failed to submit story", 'error');
      }
  };

  const handleAddResource = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newResource.title || (!newResource.url && resourceInputType === 'url')) {
          showToast('Please fill in required fields', 'error');
          return;
      }
      
      try {
          await addResource(newResource as Resource);
          setNewResource({ category: 'document' });
          setResourceInputType('url');
          loadCommonData();
          showToast('Resource added successfully', 'success');
      } catch(e: any) {
          console.error(e);
          showToast(e.message || 'Failed to add resource', 'error');
      }
  };
  
  const handleResourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit file size to prevent crash
      const limit = isLive ? 50 * 1024 * 1024 : 2 * 1024 * 1024;
      
      if (file.size > limit) {
          showToast(isLive ? "File too large (Max 50MB)" : "Demo Mode: Max 2MB. Connect Firebase for larger files.", 'error');
          e.target.value = ''; // Clear input
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
         setNewResource({...newResource, url: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContentSelect = (id: string) => {
    const content = pageContents.find(c => c.id === id);
    if (content) {
      setSelectedContentId(id);
      setEditContentText(content.text);
    }
  };

  const handleSaveContent = async () => {
    try {
      await updatePageContent(selectedContentId, editContentText);
      loadAdminData();
      onUpdateData();
      showToast(t('dash_content_saved'), 'success');
    } catch (e) {
      showToast('Failed to save content', 'error');
    }
  };
  
  const NavButton = ({ id, label, icon }: { id: string, label: string, icon: string }) => (
    <button 
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }} 
      className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
        activeTab === id 
          ? 'bg-roBlue text-white shadow-md font-bold' 
          : 'text-gray-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 flex flex-col items-center border-b border-white/10">
         <img src={user.avatar} alt="Avatar" className="w-20 h-20 rounded-full mb-4 border-4 border-roYellow object-cover shadow-lg" />
         <h3 className="font-bold text-lg truncate w-full text-center">{user.name}</h3>
         <span className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full mt-2 font-bold ${user.role === 'admin' ? 'bg-roRed' : 'bg-roBlue'}`}>
           {user.role}
         </span>
         <div className={`mt-4 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-2 ${isLive ? 'bg-green-900/50 text-green-300' : 'bg-orange-900/50 text-orange-300'}`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></span>
            {isLive ? 'LIVE (Firebase)' : 'DEMO MODE'}
         </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {user.role === 'admin' && (
          <>
            <NavButton id="events" label={t('dash_tab_events')} icon="📅" />
            <NavButton id="gallery" label={t('dash_tab_gallery')} icon="🖼️" />
            <NavButton id="users" label={t('dash_tab_users')} icon="👥" />
            <NavButton id="testimonials" label={t('dash_tab_testimonials')} icon="💬" />
            <NavButton id="resources" label={t('dash_tab_resources')} icon="📚" />
            <NavButton id="content" label={t('dash_tab_content')} icon="✏️" />
          </>
        )}
        {user.role === 'member' && (
          <>
             <NavButton id="schedule" label={t('dash_tab_schedule')} icon="📆" />
             <NavButton id="resources" label={t('dash_tab_resources')} icon="📚" />
             <NavButton id="community" label={t('dash_tab_community')} icon="✍️" />
          </>
        )}
      </nav>
      <div className="p-4 border-t border-white/10 space-y-4 bg-slate-800/50">
        <LanguageSwitcher className="justify-center" />
        <button onClick={onClose} className="w-full text-gray-400 hover:text-white hover:bg-red-900/30 py-2 rounded transition-colors text-sm flex items-center justify-center gap-2">
          <span>🚪</span> {t('dash_exit')}
        </button>
      </div>
    </div>
  );

  const getEventDescription = () => {
    if (!newEvent.description) return '';
    if (typeof newEvent.description === 'string') return newEvent.description;
    return (newEvent.description as any)[descriptionLang] || '';
  };

  const renderAdminEvents = () => (
    <div className="space-y-8 animate-fade-in-up pb-10" ref={eventFormTopRef}>
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex justify-between items-center mb-6 border-b pb-2">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>{newEvent.id ? '✏️' : '✨'}</span> {t('dash_add_event')}
            </h3>
            <button 
                onClick={handleFixLegacyEvents}
                className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded border border-orange-200 hover:bg-orange-100 transition-colors flex items-center gap-1"
                title="Automatically fix descriptions that are missing translations"
            >
                🔧 Fix Legacy Events
            </button>
        </div>
        
        <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label htmlFor="event-title" className="block text-sm font-bold text-gray-700">{t('dash_event_title')}</label>
            <input 
              id="event-title" type="text" placeholder={t('dash_event_title_ph')}
              className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
              value={newEvent.title || ''} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="event-type" className="block text-sm font-bold text-gray-700">{t('dash_gal_type')}</label>
            <select 
              id="event-type"
              className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none bg-white" 
              value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
            >
              <option value="performance">{t('event_type_performance')}</option>
              <option value="workshop">{t('event_type_workshop')}</option>
              <option value="social">{t('event_type_social')}</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="event-date" className="block text-sm font-bold text-gray-700">{t('dash_table_date')}</label>
            <input 
              id="event-date" type="date" 
              className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
              value={newEvent.date || ''} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required 
            />
          </div>
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <div className="space-y-1">
              <label htmlFor="event-time" className="block text-sm font-bold text-gray-700">{t('events_label_time')} (Start)</label>
              <input 
                id="event-time" type="time" 
                className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
                value={newEvent.time || ''} onChange={e => setNewEvent({...newEvent, time: e.target.value})} required 
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="event-endtime" className="block text-sm font-bold text-gray-700">{t('events_label_time')} (End)</label>
              <input 
                id="event-endtime" type="time" 
                className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
                value={newEvent.endTime || ''} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} 
              />
            </div>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label htmlFor="event-location" className="block text-sm font-bold text-gray-700">{t('contact_label_location')}</label>
            <input 
              id="event-location" type="text" placeholder={t('dash_event_loc_ph')}
              className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
              value={newEvent.location || ''} onChange={e => setNewEvent({...newEvent, location: e.target.value})} required 
            />
          </div>
          <div className="md:col-span-2 space-y-1">
             <label htmlFor="event-image" className="block text-sm font-bold text-gray-700">{t('dash_event_image')}</label>
             <div className="space-y-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <input 
                  id="event-image" type="file" ref={eventImageRef} accept="image/*" onChange={handleEventImageUpload}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-roBlue file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {newEvent.image && (
                  <div className="relative h-48 w-full rounded-lg overflow-hidden border border-gray-200 group mt-4">
                    <img src={newEvent.image} alt="Event Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setNewEvent({ ...newEvent, image: undefined }); if (eventImageRef.current) eventImageRef.current.value = ''; }} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700" title="Remove Image">✕</button>
                  </div>
                )}
             </div>
          </div>
          
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
               <label htmlFor="event-description" className="block text-sm font-bold text-gray-700">{t('dash_event_desc')}</label>
               <div className="flex gap-2 items-center">
                 <button 
                    type="button"
                    onClick={handleAutoTranslate}
                    disabled={isTranslating}
                    className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md font-bold hover:bg-purple-200 transition-colors flex items-center gap-1 mr-2"
                    title="Automatically fill empty language fields based on current text"
                 >
                    {isTranslating ? '...' : '✨ Auto-Translate'}
                 </button>
                 <div className="flex gap-1">
                    <button type="button" onClick={() => setDescriptionLang('en')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors border ${descriptionLang === 'en' ? 'bg-roBlue text-white border-roBlue' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'}`}>EN</button>
                    <button type="button" onClick={() => setDescriptionLang('ro')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors border ${descriptionLang === 'ro' ? 'bg-roBlue text-white border-roBlue' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'}`}>RO</button>
                    <button type="button" onClick={() => setDescriptionLang('fr')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors border ${descriptionLang === 'fr' ? 'bg-roBlue text-white border-roBlue' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'}`}>FR</button>
                 </div>
               </div>
            </div>
            <textarea 
              id="event-description" placeholder={`${t('dash_event_desc_ph')} ${descriptionLang === 'ro' ? 'Română' : descriptionLang === 'fr' ? 'Français' : 'English'}`}
              className="p-3 border border-gray-300 rounded-lg w-full min-h-[120px] focus:ring-2 focus:ring-roBlue outline-none transition-all" 
              value={getEventDescription()}
              onChange={e => {
                  let currentDescObj = newEvent.description;
                  if (typeof currentDescObj !== 'object' || currentDescObj === null) {
                      const val = (currentDescObj as string) || '';
                      currentDescObj = { en: val, ro: val, fr: val };
                  }
                  setNewEvent({
                      ...newEvent, 
                      description: { ...(currentDescObj as any), [descriptionLang]: e.target.value }
                  });
              }}
            />
            <p className="text-xs text-gray-500 italic flex items-center gap-1">
               <span className="text-roBlue">ℹ</span> Editing <strong>{descriptionLang.toUpperCase()}</strong> version. Use the buttons above to translate for other languages.
            </p>
          </div>

          <div className="md:col-span-2 flex gap-4">
            {newEvent.id && (
              <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-500 text-white py-4 rounded-lg hover:bg-gray-600 shadow-lg font-bold text-lg flex items-center justify-center gap-2"><span>🚫</span> {t('dash_cancel')}</button>
            )}
            <button type="submit" className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 shadow-lg font-bold text-lg flex items-center justify-center gap-2"><span>💾</span> {newEvent.id ? t('dash_update') : t('dash_save')}</button>
          </div>
        </form>
      </div>
      
      {/* Event List Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50 border-b">
                      <tr>
                          <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_table_event')}</th>
                          <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_table_date')}</th>
                          <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_table_attendees')}</th>
                          <th className="p-4 text-sm font-bold text-gray-600 uppercase text-right">{t('dash_table_actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {localEvents.map(ev => {
                          const safeAttendees = ev.attendees || [];
                          const attendeesList = allUsers.filter(u => safeAttendees.includes(u.id));
                          return (
                              <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4">
                                      <div className="flex items-center gap-4">
                                          {ev.image ? <img src={ev.image} alt="" className="w-12 h-12 rounded-lg object-cover shadow-sm" /> : <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xl">📅</div>}
                                          <div>
                                              <div className="font-bold text-slate-800">{ev.title}</div>
                                              <div className="text-xs text-gray-500">{ev.location}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4 text-gray-600 font-medium">{new Date(ev.date).toLocaleDateString()} <br/><span className="text-xs text-gray-400">{ev.time} EST</span></td>
                                  <td className="p-4">
                                      <div className="flex flex-col items-start gap-1">
                                          <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold">{attendeesList.length} {t('dash_table_attendees')}</span>
                                          {attendeesList.length > 0 && (
                                              <details className="text-xs text-gray-600 w-full mt-1 border border-blue-100 rounded bg-blue-50/50 p-2">
                                                  <summary className="cursor-pointer hover:text-roBlue font-bold select-none flex items-center gap-1"><span>👥</span> View List</summary>
                                                  <ul className="list-disc pl-4 mt-2 space-y-1 max-h-[100px] overflow-y-auto">{attendeesList.map(u => <li key={u.id}>{u.name}</li>)}</ul>
                                              </details>
                                          )}
                                      </div>
                                  </td>
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => handleEditEvent(ev)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-lg">✏️</button>
                                          <button onClick={() => requestDeleteEvent(ev)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg">🗑️</button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );

  const renderAdminGallery = () => {
    const pendingItems = localGallery.filter(item => item.approved === false);
    const approvedItems = localGallery.filter(item => item.approved !== false);

    return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="font-bold mb-4 text-lg flex items-center gap-2"><span>📤</span> {t('dash_upload_title')}</h3>
          
          <div className="mb-4 space-y-3">
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t('dash_gal_event_link')}</label>
                  <select 
                     className="w-full p-2 border rounded-lg bg-white"
                     value={selectedEventId}
                     onChange={(e) => setSelectedEventId(e.target.value)}
                  >
                      <option value="">-- General Gallery --</option>
                      {localEvents.map(e => (
                          <option key={e.id} value={e.id}>{e.title}</option>
                      ))}
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t('dash_gal_type')}</label>
                  <div className="flex gap-2">
                      <button onClick={() => setMediaType('image')} className={`flex-1 py-2 rounded text-sm font-bold ${mediaType === 'image' ? 'bg-roBlue text-white' : 'bg-gray-100'}`}>Image</button>
                      <button onClick={() => setMediaType('video')} className={`flex-1 py-2 rounded text-sm font-bold ${mediaType === 'video' ? 'bg-roBlue text-white' : 'bg-gray-100'}`}>{t('dash_gal_video_url')}</button>
                  </div>
              </div>
          </div>

          {mediaType === 'image' ? (
            <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 hover:border-roBlue transition-all block group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
                <p className="text-gray-600 font-medium group-hover:text-roBlue">{t('dash_upload_text')}</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
            </label>
          ) : (
             <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">{t('dash_gal_video_url')}</label>
                <div className="flex gap-2">
                    <input 
                       type="text" 
                       placeholder="https://youtube.com/..." 
                       className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-roBlue outline-none"
                       value={videoUrl}
                       onChange={(e) => setVideoUrl(e.target.value)}
                    />
                    <button 
                       onClick={handleMediaUpload} 
                       className="bg-green-600 text-white px-4 rounded-lg font-bold hover:bg-green-700"
                    >
                       Add
                    </button>
                </div>
                <p className="text-xs text-gray-500">{t('dash_gal_video_hint')}</p>
             </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col items-center justify-center text-center">
          <h3 className="font-bold mb-4 text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{t('dash_ig_title')}</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">{t('dash_ig_text')}</p>
          <button onClick={handleInstagramSync} disabled={isSyncing} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2 font-bold w-full sm:w-auto justify-center">
            {isSyncing ? t('dash_ig_syncing') : `🔄 ${t('dash_ig_btn')}`}
          </button>
        </div>
      </div>
      
      {/* Pending Reviews */}
      {pendingItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="font-bold text-lg text-yellow-800 mb-4">{t('dash_gal_pending')} ({pendingItems.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {pendingItems.map(item => (
                      <div key={item.id} className="relative aspect-square bg-white rounded-lg shadow-sm overflow-hidden group">
                           {item.type === 'video' ? <div className="w-full h-full bg-black flex items-center justify-center text-white text-2xl">▶️</div> : <img src={item.url} alt="" className="w-full h-full object-cover" />}
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                               <button onClick={() => handleApproveGalleryItem(item.id)} className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600" title="Approve">✓</button>
                               <button onClick={() => requestDeleteGallery(item)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600" title="Reject">✕</button>
                           </div>
                           <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate">
                               {item.caption}
                           </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Approved Gallery */}
      <h3 className="font-bold text-lg text-slate-800">{t('dash_gal_approved')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {approvedItems.map(item => (
          <div key={item.id} className="relative group aspect-square bg-gray-200 rounded-xl overflow-hidden shadow-sm">
            {item.type === 'video' ? (
                <div className="w-full h-full bg-black flex items-center justify-center text-white">
                   <div className="text-4xl">▶️</div>
                </div>
            ) : (
                <img src={item.url} alt="Admin view" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            )}
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 justify-between">
                <div className="flex flex-col items-start gap-1">
                    <span className="text-white text-[10px] uppercase font-bold tracking-wider bg-black/60 backdrop-blur px-2 py-1 rounded">{item.source}</span>
                    {item.eventId && <span className="text-white text-[10px] bg-blue-600 px-2 py-1 rounded">Linked</span>}
                </div>
                <button onClick={() => requestDeleteGallery(item)} className="text-white bg-red-600 p-1.5 rounded-full hover:bg-red-700" title="Delete">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  };

  const renderAdminUsers = () => (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_table_user')}</th>
                <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_table_email')}</th>
                <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_table_role')}</th>
                <th className="p-4 text-sm font-bold text-gray-600 uppercase text-right">{t('dash_table_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 flex items-center gap-3"><img src={u.avatar} alt="" className="w-10 h-10 rounded-full border border-gray-200" /><span className="font-bold text-slate-800">{u.name}</span></td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${u.role === 'admin' ? 'bg-roRed/10 text-roRed' : 'bg-blue-100 text-blue-800'}`}>{u.role}</span></td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => handleToggleRole(u)} disabled={u.id === user.id} className={`text-sm font-bold px-3 py-1 rounded transition-colors ${u.id === user.id ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'text-roBlue hover:bg-roBlue hover:text-white border border-roBlue'}`}>{u.role === 'admin' ? t('dash_demote') : t('dash_promote')}</button>
                       <button onClick={() => requestDeleteUser(u)} disabled={u.id === user.id} className={`p-1.5 rounded text-red-500 hover:bg-red-50 ${u.id === user.id ? 'opacity-30 cursor-not-allowed' : ''}`}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
  const renderAdminTestimonials = () => (
    <div className="space-y-6 animate-fade-in-up pb-10">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-400">
                <h3 className="font-bold text-lg mb-2 text-slate-800">{t('dash_test_pending')}</h3>
                <p className="text-gray-500 text-sm">{t('dash_test_pending_desc')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
                <h3 className="font-bold text-lg mb-2 text-slate-800">{t('dash_test_live')}</h3>
                <p className="text-gray-500 text-sm">{allTestimonials.filter(t => t.approved).length} {t('dash_test_live_desc')}</p>
            </div>
        </div>
        {editingTestimonial && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg animate-fade-in">
                <h3 className="text-xl font-bold mb-4">{t('dash_test_edit')}</h3>
                <form onSubmit={handleSaveTestimonialEdit} className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">{t('dash_test_author')}</label><input type="text" className="w-full p-2 border rounded-lg" value={editingTestimonial.author} onChange={e => setEditingTestimonial({...editingTestimonial, author: e.target.value})}/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">{t('dash_test_content')}</label><textarea className="w-full p-2 border rounded-lg h-32" value={editingTestimonial.text} onChange={e => setEditingTestimonial({...editingTestimonial, text: e.target.value})}/></div>
                    <div className="flex gap-2 justify-end"><button type="button" onClick={() => setEditingTestimonial(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('dash_cancel')}</button><button type="submit" className="px-4 py-2 bg-roBlue text-white rounded-lg hover:bg-blue-900">{t('dash_save')}</button></div>
                </form>
             </div>
          </div>
        )}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b">
                    <tr><th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_test_author')}</th><th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_test_content')}</th><th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_test_status')}</th><th className="p-4 text-sm font-bold text-gray-600 uppercase text-right">{t('dash_table_actions')}</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {allTestimonials.map(testimonial => (
                    <tr key={testimonial.id} className="hover:bg-slate-50">
                        <td className="p-4"><div className="font-bold text-slate-800">{testimonial.author}</div><div className="text-xs text-gray-500">{testimonial.role}</div></td>
                        <td className="p-4 text-sm text-gray-600 max-w-xs leading-relaxed italic">"{testimonial.text}"</td>
                        <td className="p-4">{testimonial.approved ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold border border-green-200">{t('dash_status_approved')}</span> : <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs font-bold border border-yellow-200">{t('dash_status_pending')}</span>}</td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingTestimonial(testimonial)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-lg">✏️</button>
                              <button onClick={() => handleToggleTestimonial(testimonial.id)} className={`text-xs font-bold px-3 py-1 rounded ${testimonial.approved ? 'bg-gray-100 text-gray-600' : 'bg-green-600 text-white'}`}>{testimonial.approved ? t('dash_btn_hide') : t('dash_btn_approve')}</button>
                              <button onClick={() => requestDeleteTestimonial(testimonial)} className="bg-red-50 text-red-500 p-1.5 rounded">🗑️</button>
                            </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
              </table>
            </div>
        </div>
    </div>
  );

  const renderAdminContent = () => (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h3 className="text-xl font-bold mb-6 text-slate-800 border-b pb-2 flex items-center gap-2"><span>✏️</span> {t('dash_content_title')}</h3>
        <div className="space-y-6">
          <div>
             <label htmlFor="content-selector" className="block text-sm font-bold text-gray-700 mb-2">{t('dash_content_select')}</label>
             <select id="content-selector" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none bg-white font-bold text-gray-700" value={selectedContentId} onChange={(e) => handleContentSelect(e.target.value)}>
               {pageContents.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
             </select>
          </div>
          <div className="grid gap-6">
            <div className="space-y-1"><label className="block text-sm font-bold text-gray-700">🇬🇧 {t('dash_content_en')}</label><textarea rows={4} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none font-medium" value={editContentText.en} onChange={(e) => setEditContentText({...editContentText, en: e.target.value})}/></div>
            <div className="space-y-1"><label className="block text-sm font-bold text-gray-700">🇷🇴 {t('dash_content_ro')}</label><textarea rows={4} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none font-medium" value={editContentText.ro} onChange={(e) => setEditContentText({...editContentText, ro: e.target.value})}/></div>
            <div className="space-y-1"><label className="block text-sm font-bold text-gray-700">🇫🇷 {t('dash_content_fr')}</label><textarea rows={4} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none font-medium" value={editContentText.fr} onChange={(e) => setEditContentText({...editContentText, fr: e.target.value})}/></div>
          </div>
          <button onClick={handleSaveContent} className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 shadow-lg font-bold text-lg flex items-center justify-center gap-2"><span>💾</span> {t('dash_content_save')}</button>
        </div>
      </div>
    </div>
  );

  const renderAdminResources = () => (
      <div className="space-y-8 animate-fade-in-up pb-10">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="font-bold mb-4 text-lg flex items-center gap-2"><span>📚</span> {t('dash_res_add')}</h3>
              <form onSubmit={handleAddResource} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                      <label className="block text-sm font-bold text-gray-700">{t('dash_res_title_label')}</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={newResource.title || ''} onChange={e => setNewResource({...newResource, title: e.target.value})} required />
                  </div>
                  <div className="space-y-1">
                      <label className="block text-sm font-bold text-gray-700">{t('dash_res_cat_label')}</label>
                      <select className="w-full p-3 border rounded-lg bg-white" value={newResource.category} onChange={e => setNewResource({...newResource, category: e.target.value as any})}>
                          <option value="music">{t('dash_res_cat_music')}</option>
                          <option value="choreography">{t('dash_res_cat_choreo')}</option>
                          <option value="costume">{t('dash_res_cat_costume')}</option>
                          <option value="document">{t('dash_res_cat_doc')}</option>
                      </select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                      <label className="block text-sm font-bold text-gray-700">{t('dash_res_desc_label')}</label>
                      <textarea className="w-full p-3 border rounded-lg h-24" value={newResource.description || ''} onChange={e => setNewResource({...newResource, description: e.target.value})} />
                  </div>
                  
                  {/* File Upload Toggle */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-bold text-gray-700">{t('dash_res_input_type')}</label>
                    <div className="flex gap-2">
                         <button type="button" onClick={() => setResourceInputType('url')} className={`px-4 py-2 rounded-lg text-sm font-bold ${resourceInputType === 'url' ? 'bg-roBlue text-white' : 'bg-gray-100'}`}>{t('dash_res_type_url')}</button>
                         <button type="button" onClick={() => setResourceInputType('file')} className={`px-4 py-2 rounded-lg text-sm font-bold ${resourceInputType === 'file' ? 'bg-roBlue text-white' : 'bg-gray-100'}`}>{t('dash_res_type_file')}</button>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                      {resourceInputType === 'url' ? (
                          <>
                            <label className="block text-sm font-bold text-gray-700">{t('dash_res_url_label')}</label>
                            <input type="text" placeholder="https://..." className="w-full p-3 border rounded-lg" value={newResource.url || ''} onChange={e => setNewResource({...newResource, url: e.target.value})} />
                          </>
                      ) : (
                          <>
                             <label className="block text-sm font-bold text-gray-700">{t('dash_res_file_label')}</label>
                             <input type="file" accept="audio/*,video/*,application/pdf" className="w-full p-3 border border-gray-300 rounded-lg" onChange={handleResourceFileChange} />
                             {newResource.url && newResource.url.startsWith('data:') && <p className="text-xs text-green-600 mt-1">✓ File ready to upload</p>}
                          </>
                      )}
                  </div>

                  <button type="submit" className="md:col-span-2 bg-roBlue text-white py-3 rounded-lg font-bold hover:bg-blue-900">{t('dash_res_add')}</button>
              </form>
          </div>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
              <h3 className="p-4 font-bold border-b bg-gray-50">{t('dash_res_list_title')}</h3>
              <div className="divide-y divide-gray-100">
                  {resources.map(res => (
                      <div key={res.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div>
                              <h4 className="font-bold text-slate-800">{res.title}</h4>
                              <p className="text-sm text-gray-500 mb-1">{res.description}</p>
                              {res.url.startsWith('http') && !res.url.includes('firebase') && <a href={res.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{res.url}</a>}
                              {res.category === 'music' && (
                                <audio controls className="h-8 mt-2 max-w-full"><source src={res.url} /></audio>
                              )}
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase bg-gray-200 px-2 py-1 rounded text-gray-600">{res.category}</span>
                              <button onClick={() => requestDeleteResource(res)} className="text-red-500 hover:bg-red-50 p-2 rounded">🗑️</button>
                          </div>
                      </div>
                  ))}
                  {resources.length === 0 && <p className="p-4 text-center text-gray-500 italic">{t('dash_res_empty')}</p>}
              </div>
          </div>
      </div>
  );

  const renderMemberSchedule = () => (
      <div className="space-y-6 animate-fade-in-up pb-10">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-roBlue">
          <h3 className="text-xl font-bold mb-4">{t('dash_profile_settings')}</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full"><label className="block text-sm font-bold text-gray-700 mb-1">{t('dash_mobile_num')}</label><input type="tel" placeholder="+1 (555) 000-0000" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}/></div>
             <button onClick={handleSaveProfile} className="bg-roBlue text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-900 transition-colors w-full md:w-auto">{t('dash_save_settings')}</button>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('dash_mobile_hint')}</p>
        </div>
        <h2 className="text-2xl font-bold border-b pb-4">{t('dash_tab_schedule')}</h2>
        {events.filter(e => e.attendees.includes(user.id)).length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-dashed border-gray-300">
             <div className="text-4xl mb-4">📅</div>
             <p className="text-gray-500 text-lg mb-4">{t('dash_no_rsvp')}</p>
             <button onClick={onClose} className="bg-roBlue text-white px-6 py-2 rounded-full font-bold hover:shadow-lg transition-all">{t('dash_browse_events')}</button>
          </div>
        ) : (
          events.filter(e => e.attendees.includes(user.id)).map(ev => (
            <div key={ev.id} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-roBlue flex flex-col sm:flex-row justify-between items-start sm:items-center group hover:shadow-md transition-all gap-4">
              <div><h4 className="font-bold text-xl group-hover:text-roBlue transition-colors">{ev.title}</h4><p className="text-gray-600 mt-2 flex flex-wrap items-center gap-4 text-sm"><span className="flex items-center gap-1">📅 {ev.date}</span><span className="flex items-center gap-1">⏰ {ev.time} EST</span><span className="flex items-center gap-1">📍 {ev.location}</span></p></div>
              <div className="text-right w-full sm:w-auto mt-2 sm:mt-0"><span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200 inline-block">✓ {t('dash_status_approved')}</span></div>
            </div>
          ))
        )}
      </div>
  );
  
  const renderMemberCommunity = () => (
      <div className="space-y-6 animate-fade-in-up pb-10">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h2 className="text-2xl font-bold mb-4">{t('dash_test_add')}</h2>
             <p className="text-gray-600 mb-6">{t('dash_test_add_desc')}</p>
             <form onSubmit={handleSubmitStory} className="space-y-4">
                 <div><label className="block text-sm font-bold text-gray-700 mb-2">Your Story</label><textarea className="w-full p-4 border rounded-xl h-40 focus:ring-2 focus:ring-roBlue outline-none" placeholder="Share your favorite memory..." value={memberStory} onChange={e => setMemberStory(e.target.value)} required /></div>
                 <button type="submit" className="bg-roBlue text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-900 transition-colors shadow-lg">Submit for Review</button>
             </form>
          </div>
          <div className="mt-8">
             <h3 className="font-bold text-lg mb-4 text-gray-500">{t('dash_my_submissions')}</h3>
             <div className="space-y-4">
                {allTestimonials.filter(t => t.author === user.name).map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center"><p className="text-gray-600 truncate flex-1 pr-4">"{t.text}"</p><span className={`text-xs font-bold px-2 py-1 rounded ${t.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.approved ? 'Live' : 'Pending'}</span></div>
                ))}
                {allTestimonials.filter(t => t.author === user.name).length === 0 && <p className="text-gray-400 italic">{t('dash_no_submissions')}</p>}
             </div>
          </div>
      </div>
  );

  const renderMemberResources = () => (
      <div className="space-y-6 animate-fade-in-up pb-10">
          <h2 className="text-2xl font-bold border-b pb-4">{t('dash_tab_resources')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {['music', 'choreography', 'costume', 'document'].map(cat => {
                  const catResources = resources.filter(r => r.category === cat);
                  if (catResources.length === 0) return null;
                  
                  let icon = '📁';
                  let titleKey = 'dash_res_cat_doc';
                  if (cat === 'music') { icon = '🎵'; titleKey = 'dash_res_cat_music'; }
                  if (cat === 'choreography') { icon = '💃'; titleKey = 'dash_res_cat_choreo'; }
                  if (cat === 'costume') { icon = '👗'; titleKey = 'dash_res_cat_costume'; }
                  
                  return (
                      <div key={cat} className="bg-white p-6 rounded-xl shadow-md border-t-4 border-roBlue">
                          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><span>{icon}</span> {t(titleKey)}</h3>
                          <ul className="space-y-3">
                              {catResources.map(res => {
                                  // Determine if it's a data URL (file upload in demo mode)
                                  const isDataUrl = res.url.startsWith('data:');
                                  
                                  return (
                                  <li key={res.id} className="block p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-roBlue transition-all">
                                      {/* Content Renderer Based on Category */}
                                      {cat === 'music' ? (
                                        <div>
                                            <div className="font-bold text-roBlue mb-2">{res.title}</div>
                                            <audio controls className="w-full h-8"><source src={res.url} /></audio>
                                            <p className="text-xs text-gray-500 mt-1">{res.description}</p>
                                        </div>
                                      ) : cat === 'choreography' && (res.url.includes('youtube') || res.url.includes('vimeo')) ? (
                                        <div>
                                             <div className="font-bold text-roBlue mb-2">{res.title}</div>
                                             <div className="aspect-video rounded overflow-hidden mb-2">
                                                <iframe src={res.url.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen></iframe>
                                             </div>
                                             <p className="text-xs text-gray-500">{res.description}</p>
                                        </div>
                                      ) : cat === 'choreography' && !res.url.includes('http') ? ( 
                                         // Assume Base64/File for non-http links in choreography
                                         <div>
                                            <div className="font-bold text-roBlue mb-2">{res.title}</div>
                                            <video controls className="w-full rounded mb-2"><source src={res.url} /></video>
                                            <p className="text-xs text-gray-500">{res.description}</p>
                                         </div>
                                      ) : (
                                          <a 
                                            href={res.url} 
                                            target={isDataUrl ? undefined : "_blank"} 
                                            rel="noreferrer" 
                                            download={isDataUrl ? res.title : undefined} // Force download if data URL
                                            className="block group"
                                          >
                                              <div className="font-bold text-roBlue group-hover:underline flex items-center gap-2">
                                                {res.title}
                                                {isDataUrl ? (
                                                   <span className="text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">⬇ Download</span>
                                                ) : (
                                                   <span className="text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">↗ Opens in new tab</span>
                                                )}
                                              </div>
                                              <div className="text-sm text-gray-500 mt-1">{res.description}</div>
                                          </a>
                                      )}
                                  </li>
                                  );
                              })}
                          </ul>
                      </div>
                  );
              })}
          </div>
          {resources.length === 0 && <p className="text-center text-gray-500 py-10">{t('dash_res_empty')}</p>}
      </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 font-sans flex h-screen overflow-hidden">
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-[70] flex items-center justify-between px-4 shadow-md">
         <div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="text-white p-2 hover:bg-white/10 rounded"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button><span className="text-white font-bold text-lg">{t('nav_dashboard')}</span></div>
         <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-sm">Exit</button>
      </div>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-[75] md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-[80] w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out flex-shrink-0 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-2 right-2 md:hidden"><button onClick={() => setSidebarOpen(false)} className="text-white p-2">✕</button></div>
        {renderSidebarContent()}
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full pt-16 md:pt-0 bg-slate-50 relative">
        <header className="flex-shrink-0 px-6 py-4 md:py-8 border-b border-gray-200 bg-white/50 backdrop-blur-sm flex justify-between items-center z-10">
             <div><h1 className="text-2xl md:text-3xl font-serif font-bold text-roBlue capitalize">{t(`dash_tab_${activeTab}` as any) || activeTab}</h1><p className="text-gray-500 text-sm hidden sm:block mt-1">{t('dash_logged_in')} <span className="font-bold text-slate-800">{user.email}</span></p></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'events' && renderAdminEvents()}
            {activeTab === 'gallery' && renderAdminGallery()}
            {activeTab === 'users' && renderAdminUsers()}
            {activeTab === 'testimonials' && renderAdminTestimonials()}
            {activeTab === 'content' && renderAdminContent()}
            {activeTab === 'resources' && user.role === 'admin' && renderAdminResources()}
            {activeTab === 'schedule' && renderMemberSchedule()}
            {activeTab === 'community' && renderMemberCommunity()}
            {activeTab === 'resources' && user.role === 'member' && renderMemberResources()}
          </div>
        </main>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmModal isOpen={modalOpen} title={t('dash_delete')} message={itemToDelete?.name ? `${t('dash_delete_confirm')} (${itemToDelete.name})` : t('dash_delete_confirm')} isDestructive={true} isLoading={modalLoading} onConfirm={executeDelete} onClose={() => { setModalOpen(false); setItemToDelete(null); }} previewImage={itemToDelete?.img} />
    </div>
  );
};

export default Dashboard;
