
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
  migrateLegacyEvents,
  updateUserAvatar
} from '../services/mockService';
import { useTranslation } from '../services/translations';
import { translateText, requestNotificationPermission, sendLocalNotification } from '../services/integrations';
import LanguageSwitcher from './LanguageSwitcher';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import Avatar from './Avatar';

interface DashboardProps {
  user: User;
  events: Event[];
  gallery: GalleryItem[];
  onUpdateData: () => void;
  onClose: () => void;
}

const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-teal-500', 
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-gray-500'
];

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
  const [carrier, setCarrier] = useState(user.carrier || '');
  
  // Avatar Profile State
  const [displayAvatar, setDisplayAvatar] = useState(user.avatar || '');
  const [avatarColor, setAvatarColor] = useState(user.avatarColor || '');
  const [customInitials, setCustomInitials] = useState(user.customInitials || '');

  // Search State
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  useEffect(() => { setLocalEvents(events); }, [events]);
  useEffect(() => { setLocalGallery(gallery); }, [gallery]);
  useEffect(() => { 
      setDisplayAvatar(user.avatar || '');
      setAvatarColor(user.avatarColor || '');
      setCustomInitials(user.customInitials || '');
  }, [user]);
  
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [editContentText, setEditContentText] = useState<{en: string, ro: string, fr: string}>({ en: '', ro: '', fr: '' });
  
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [memberStory, setMemberStory] = useState('');

  const [newEvent, setNewEvent] = useState<Partial<Event>>({ type: 'performance' });
  const [eventInputType, setEventInputType] = useState<'url' | 'file'>('url'); // New state for Image Input toggle
  const [descriptionLang, setDescriptionLang] = useState<Language>('en'); 
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Resource Management State
  const [newResource, setNewResource] = useState<Partial<Resource>>({ category: 'document' });
  const [resourceInputType, setResourceInputType] = useState<'url' | 'file'>('url');
  
  const eventImageRef = useRef<HTMLInputElement>(null);
  const eventFormTopRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
           currentDesc[target] = await translateText(sourceText, target, descriptionLang);
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
    
    // Check if current image is a data URL (file) or http URL
    if (ev.image && !ev.image.startsWith('data:') && !ev.image.includes('firebase')) {
        setEventInputType('url');
    }
    
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
             // Image upload logic handled in file input
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
      // Save avatar color and initials along with phone/carrier
      // IMPORTANT: Also save displayAvatar to persist if user cleared their image
      await updateUserProfile(user.id, { 
          phoneNumber, 
          carrier,
          avatarColor,
          customInitials,
          avatar: displayAvatar 
      });
      showToast("Profile settings saved!", 'success');
      onUpdateData(); // Force app to refresh user profile immediately
    } catch(e) {
      showToast("Failed to save profile.", 'error');
    }
  };
  
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
          const newAvatarUrl = await updateUserAvatar(user.id, file);
          setDisplayAvatar(newAvatarUrl);
          // Clear custom color if they upload an image to avoid confusion
          setAvatarColor('');
          showToast('Avatar updated successfully!', 'success');
          onUpdateData();
      } catch (err: any) {
          console.error(err);
          showToast(t('dash_avatar_error'), 'error');
      }
  };
  
  const handleEnableNotifications = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
          showToast("Notifications enabled!", 'success');
          sendLocalNotification("Notifications Active", "You will now receive instant alerts for RSVPs.");
      } else {
          showToast("Permission denied. Check browser settings.", 'error');
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
      const limit = isLive ? 50 * 1024 * 1024 : 2 * 1024 * 1024;
      if (file.size > limit) {
          showToast(isLive ? "File too large (Max 50MB)" : "Demo Mode: Max 2MB. Connect Firebase for larger files.", 'error');
          e.target.value = '';
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
         <Avatar src={displayAvatar} name={user.name} color={avatarColor} initials={customInitials} className="w-20 h-20 rounded-full mb-4 border-4 border-roYellow shadow-lg text-2xl" />
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
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100" ref={eventFormTopRef}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl text-slate-800 border-l-4 border-roBlue pl-3">{t('dash_add_event')}</h3>
            {newEvent.id && (
                <button onClick={handleCancelEdit} className="text-sm text-red-500 font-bold hover:underline">{t('dash_cancel')}</button>
            )}
        </div>
        <form onSubmit={handleAddEvent} className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_event_title')}</label>
               <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-roBlue outline-none font-bold" value={newEvent.title || ''} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder={t('dash_event_title_ph')} required />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_table_date')}</label>
                  <input type="date" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newEvent.date || ''} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('events_label_time')}</label>
                  <div className="flex gap-2">
                      <input type="time" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newEvent.time || ''} onChange={e => setNewEvent({...newEvent, time: e.target.value})} required />
                      <input type="time" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newEvent.endTime || ''} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} />
                  </div>
               </div>
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('events_label_location')}</label>
                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newEvent.location || ''} onChange={e => setNewEvent({...newEvent, location: e.target.value})} placeholder={t('dash_event_loc_ph')} required />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newEvent.type || 'performance'} onChange={(e: any) => setNewEvent({...newEvent, type: e.target.value})}>
                    <option value="performance">Performance</option>
                    <option value="workshop">Workshop</option>
                    <option value="social">Social</option>
                </select>
             </div>
          </div>
          <div className="space-y-4">
             <div>
                <div className="flex justify-between items-center mb-1">
                   <label className="block text-xs font-bold text-gray-500 uppercase">{t('dash_event_desc')} ({descriptionLang.toUpperCase()})</label>
                   <div className="flex gap-2">
                       <LanguageSwitcher />
                       <button type="button" onClick={handleAutoTranslate} disabled={isTranslating} className="text-xs bg-roBlue/10 text-roBlue px-2 py-1 rounded hover:bg-roBlue/20 font-bold" title="Auto-translate to empty fields">
                          {isTranslating ? '...' : '✨ Auto-Translate'}
                       </button>
                   </div>
                </div>
                <textarea 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg h-32 resize-none" 
                    value={getEventDescription()} 
                    onChange={e => {
                        const val = e.target.value;
                        const currentDesc = typeof newEvent.description === 'string' 
                            ? { en: newEvent.description, ro: '', fr: '' } 
                            : { ...(newEvent.description as any) || { en: '', ro: '', fr: '' } };
                        currentDesc[descriptionLang] = val;
                        setNewEvent({ ...newEvent, description: currentDesc });
                    }}
                    placeholder={`${t('dash_event_desc_ph')} ${descriptionLang.toUpperCase()}...`} 
                />
             </div>
             <div>
                <div className="flex justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase">{t('dash_event_image')}</label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setEventInputType('url')} className={`text-xs px-2 py-1 rounded ${eventInputType === 'url' ? 'bg-gray-200 font-bold' : 'text-gray-400'}`}>URL</button>
                        <button type="button" onClick={() => setEventInputType('file')} className={`text-xs px-2 py-1 rounded ${eventInputType === 'file' ? 'bg-gray-200 font-bold' : 'text-gray-400'}`}>File</button>
                    </div>
                </div>
                {eventInputType === 'url' ? (
                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newEvent.image || ''} onChange={e => setNewEvent({...newEvent, image: e.target.value})} placeholder="https://..." />
                ) : (
                    <input type="file" ref={eventImageRef} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" accept="image/*" onChange={handleEventImageUpload} />
                )}
                {newEvent.image && <img src={newEvent.image} alt="Preview" className="h-20 w-auto mt-2 rounded border border-gray-200 object-cover" />}
             </div>
             <button type="submit" className="w-full py-3 bg-roBlue text-white rounded-lg font-bold hover:bg-blue-900 shadow-md transition-all mt-2">
                {newEvent.id ? t('dash_update') : t('dash_save')}
             </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-700">{localEvents.length} Events</h3>
            <div className="flex gap-2">
                <button onClick={handleFixLegacyEvents} className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200">⚠️ Fix Translations</button>
                <input type="text" placeholder={t('dash_search_events')} className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm outline-none focus:border-roBlue" value={eventSearchQuery} onChange={e => setEventSearchQuery(e.target.value)} />
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <th className="p-4">{t('dash_table_event')}</th>
                        <th className="p-4">{t('dash_table_date')}</th>
                        <th className="p-4">{t('dash_table_attendees')}</th>
                        <th className="p-4 text-right">{t('dash_table_actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {localEvents.filter(e => e.title.toLowerCase().includes(eventSearchQuery.toLowerCase())).map(ev => (
                        <tr key={ev.id} className="hover:bg-blue-50/50 transition-colors group">
                            <td className="p-4 font-bold text-slate-800">{ev.title}</td>
                            <td className="p-4 text-sm text-gray-600">{ev.date}</td>
                            <td className="p-4 text-sm text-gray-600">{ev.attendees.length}</td>
                            <td className="p-4 text-right">
                                <button onClick={() => handleEditEvent(ev)} className="text-roBlue hover:text-blue-800 font-bold text-sm mr-3">Edit</button>
                                <button onClick={() => requestDeleteEvent(ev)} className="text-red-400 hover:text-red-600 font-bold text-sm">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );

  const renderAdminGallery = () => (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="grid md:grid-cols-2 gap-8">
         <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h3 className="font-bold text-lg mb-4 text-slate-800">{t('dash_upload_title')}</h3>
             <form onSubmit={handleMediaUpload} className="space-y-4">
                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('dash_gal_type')}</label>
                     <div className="flex gap-4">
                         <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 flex-1">
                             <input type="radio" name="mediaType" checked={mediaType === 'image'} onChange={() => setMediaType('image')} />
                             <span>Image</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 flex-1">
                             <input type="radio" name="mediaType" checked={mediaType === 'video'} onChange={() => setMediaType('video')} />
                             <span>Video</span>
                         </label>
                     </div>
                 </div>
                 
                 {mediaType === 'image' ? (
                    <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                        <span className="text-roBlue font-bold block mb-1">📁 {t('dash_upload_text')}</span>
                        <span className="text-xs text-gray-400">Supports JPG, PNG (Max 5MB)</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                    </label>
                 ) : (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_gal_video_url')}</label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
                        <p className="text-xs text-gray-400 mt-1">{t('dash_gal_video_hint')}</p>
                    </div>
                 )}
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_gal_event_link')}</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                        <option value="">-- None --</option>
                        {localEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                 </div>
                 
                 {mediaType === 'video' && (
                     <button type="submit" className="w-full py-3 bg-roBlue text-white rounded-lg font-bold hover:bg-blue-900 shadow-md">Add Video</button>
                 )}
             </form>
         </div>

         <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-xl shadow-md text-white">
             <div className="flex items-center gap-3 mb-4">
                 <div className="text-3xl">📸</div>
                 <h3 className="font-bold text-lg">{t('dash_ig_title')}</h3>
             </div>
             <p className="opacity-90 mb-6">{t('dash_ig_text')}</p>
             <button onClick={handleInstagramSync} disabled={isSyncing} className="w-full py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-gray-100 shadow-md disabled:opacity-70">
                 {isSyncing ? t('dash_ig_syncing') : t('dash_ig_btn')}
             </button>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
         <div className="p-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-slate-800">{t('dash_gal_pending')}</h3></div>
         <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {localGallery.filter(i => !i.approved).length === 0 && <p className="col-span-full text-gray-400 text-center py-4">No pending items.</p>}
            {localGallery.filter(i => !i.approved).map(item => (
                <div key={item.id} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
                    <img src={item.url} className="w-full h-full object-cover opacity-50" alt="Pending" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <button onClick={() => handleApproveGalleryItem(item.id)} className="bg-green-500 text-white p-2 rounded-full shadow hover:bg-green-600">✓</button>
                        <button onClick={() => requestDeleteGallery(item)} className="bg-red-500 text-white p-2 rounded-full shadow hover:bg-red-600">✕</button>
                    </div>
                </div>
            ))}
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-slate-800">{t('dash_gal_approved')}</h3></div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {localGallery.filter(i => i.approved).map(item => (
                 <div key={item.id} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100 cursor-pointer">
                     <img src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Gallery" />
                     {item.type === 'video' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-4xl shadow-lg">▶️</span></div>}
                     <button onClick={() => requestDeleteGallery(item)} className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">✕</button>
                 </div>
             ))}
          </div>
      </div>
    </div>
  );

  const renderAdminUsers = () => (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-xl text-slate-800">{allUsers.length} {t('dash_tab_users')}</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <th className="p-4">{t('dash_table_user')}</th>
                        <th className="p-4">{t('dash_table_email')}</th>
                        <th className="p-4">{t('dash_table_role')}</th>
                        <th className="p-4 text-right">{t('dash_table_actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {allUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 flex items-center gap-3">
                                <Avatar src={u.avatar} name={u.name} color={u.avatarColor} initials={u.customInitials} className="w-8 h-8 rounded-full" />
                                <span className="font-bold text-slate-800">{u.name}</span>
                            </td>
                            <td className="p-4 text-sm text-gray-600">{u.email}</td>
                            <td className="p-4">
                                <span className={`text-xs uppercase font-bold px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="p-4 text-right flex justify-end gap-3">
                                <button onClick={() => handleToggleRole(u)} className="text-xs font-bold text-gray-500 hover:text-roBlue border border-gray-200 px-2 py-1 rounded hover:bg-gray-100">
                                    {u.role === 'admin' ? t('dash_demote') : t('dash_promote')}
                                </button>
                                <button onClick={() => requestDeleteUser(u)} className="text-xs font-bold text-red-400 hover:text-red-600 border border-red-100 px-2 py-1 rounded hover:bg-red-50">
                                    {t('dash_delete')}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderAdminTestimonials = () => (
    <div className="space-y-8 animate-fade-in-up pb-10">
        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-orange-50"><h3 className="font-bold text-orange-800">{t('dash_test_pending')}</h3></div>
                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                    {allTestimonials.filter(t => !t.approved).length === 0 && <p className="p-6 text-center text-gray-400">No pending testimonials.</p>}
                    {allTestimonials.filter(t => !t.approved).map(t => (
                        <div key={t.id} className="p-4 hover:bg-gray-50">
                            <p className="text-sm italic text-gray-600 mb-2">"{t.text}"</p>
                            <div className="flex justify-between items-end">
                                <p className="text-xs font-bold text-slate-800">- {t.author} <span className="text-gray-400">({t.role})</span></p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleToggleTestimonial(t.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold hover:bg-green-200">{t('dash_btn_approve')}</button>
                                    <button onClick={() => requestDeleteTestimonial(t)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200">{t('dash_btn_remove')}</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-green-50"><h3 className="font-bold text-green-800">{t('dash_test_live')}</h3></div>
                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                    {allTestimonials.filter(t => t.approved).length === 0 && <p className="p-6 text-center text-gray-400">No active testimonials.</p>}
                    {allTestimonials.filter(t => t.approved).map(t => (
                         <div key={t.id} className="p-4 hover:bg-gray-50 group">
                            {editingTestimonial?.id === t.id ? (
                                <form onSubmit={handleSaveTestimonialEdit} className="space-y-2">
                                    <input className="w-full text-xs p-1 border rounded" value={editingTestimonial.author} onChange={e => setEditingTestimonial({...editingTestimonial, author: e.target.value})} placeholder="Author" />
                                    <textarea className="w-full text-sm p-2 border rounded resize-none" rows={3} value={editingTestimonial.text} onChange={e => setEditingTestimonial({...editingTestimonial, text: e.target.value})} />
                                    <div className="flex gap-2 justify-end">
                                        <button type="button" onClick={() => setEditingTestimonial(null)} className="text-xs text-gray-500">Cancel</button>
                                        <button type="submit" className="text-xs bg-roBlue text-white px-3 py-1 rounded">Save</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <p className="text-sm italic text-gray-600 mb-2">"{t.text}"</p>
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-bold text-slate-800">- {t.author}</p>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingTestimonial(t)} className="text-xs text-roBlue font-bold hover:underline">Edit</button>
                                            <button onClick={() => handleToggleTestimonial(t.id)} className="text-xs text-orange-500 font-bold hover:underline">{t('dash_btn_hide')}</button>
                                            <button onClick={() => requestDeleteTestimonial(t)} className="text-xs text-red-500 font-bold hover:underline">Delete</button>
                                        </div>
                                    </div>
                                </>
                            )}
                         </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );

  const renderAdminContent = () => (
     <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-100 p-6 md:p-8 animate-fade-in-up">
        <h3 className="font-bold text-xl mb-6 text-slate-800 border-b pb-4">{t('dash_content_title')}</h3>
        
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('dash_content_select')}</label>
            <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-lg font-bold" value={selectedContentId} onChange={e => handleContentSelect(e.target.value)}>
                {pageContents.map(c => (
                    <option key={c.id} value={c.id}>{c.description}</option>
                ))}
            </select>
        </div>
        
        <div className="space-y-6">
             {['en', 'ro', 'fr'].map(lang => (
                 <div key={lang}>
                     <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{lang === 'en' ? '🇬🇧' : lang === 'ro' ? '🇷🇴' : '🇫🇷'}</span>
                        <label className="text-xs font-bold text-gray-500 uppercase">
                            {lang === 'en' ? t('dash_content_en') : lang === 'ro' ? t('dash_content_ro') : t('dash_content_fr')}
                        </label>
                     </div>
                     <textarea 
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed h-32 focus:ring-2 focus:ring-roBlue outline-none" 
                        value={editContentText[lang as 'en'|'ro'|'fr']}
                        onChange={e => setEditContentText({...editContentText, [lang]: e.target.value})}
                     />
                 </div>
             ))}
             <button onClick={handleSaveContent} className="w-full py-4 bg-roBlue text-white rounded-xl font-bold hover:bg-blue-900 shadow-lg transition-transform active:scale-[0.99]">{t('dash_content_save')}</button>
        </div>
     </div>
  );

  const renderAdminResources = () => (
     <div className="space-y-8 animate-fade-in-up pb-10">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h3 className="font-bold text-lg mb-4 text-slate-800">{t('dash_res_add')}</h3>
             <form onSubmit={handleAddResource} className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_res_title_label')}</label>
                         <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newResource.title || ''} onChange={e => setNewResource({...newResource, title: e.target.value})} required />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_res_desc_label')}</label>
                         <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newResource.description || ''} onChange={e => setNewResource({...newResource, description: e.target.value})} />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_res_cat_label')}</label>
                         <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newResource.category} onChange={(e: any) => setNewResource({...newResource, category: e.target.value})}>
                             <option value="music">{t('dash_res_cat_music')}</option>
                             <option value="choreography">{t('dash_res_cat_choreo')}</option>
                             <option value="costume">{t('dash_res_cat_costume')}</option>
                             <option value="document">{t('dash_res_cat_doc')}</option>
                         </select>
                     </div>
                 </div>
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('dash_res_input_type')}</label>
                         <div className="flex gap-4">
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" checked={resourceInputType === 'url'} onChange={() => setResourceInputType('url')} />
                                 <span className="text-sm font-bold">{t('dash_res_type_url')}</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" checked={resourceInputType === 'file'} onChange={() => setResourceInputType('file')} />
                                 <span className="text-sm font-bold">{t('dash_res_type_file')}</span>
                             </label>
                         </div>
                     </div>
                     
                     {resourceInputType === 'url' ? (
                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_res_url_label')}</label>
                             <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" value={newResource.url || ''} onChange={e => setNewResource({...newResource, url: e.target.value})} placeholder="https://..." />
                         </div>
                     ) : (
                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_res_file_label')}</label>
                             <input type="file" className="w-full p-2 border border-gray-200 rounded-lg" onChange={handleResourceFileChange} />
                         </div>
                     )}
                     
                     <button type="submit" className="w-full py-3 bg-roBlue text-white rounded-lg font-bold hover:bg-blue-900 shadow-md mt-4">
                         {t('dash_save')}
                     </button>
                 </div>
             </form>
        </div>
        
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-slate-800">{t('dash_res_list_title')}</h3></div>
             <div className="divide-y divide-gray-100">
                 {resources.length === 0 && <p className="p-6 text-center text-gray-400">{t('dash_res_empty')}</p>}
                 {resources.map(r => (
                     <div key={r.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                         <div className="flex items-center gap-3">
                             <span className="text-2xl">{r.category === 'music' ? '🎵' : r.category === 'choreography' ? '💃' : r.category === 'costume' ? '👘' : '📄'}</span>
                             <div>
                                 <h4 className="font-bold text-slate-800"><a href={r.url} target="_blank" rel="noreferrer" className="hover:text-roBlue hover:underline">{r.title}</a></h4>
                                 <p className="text-xs text-gray-500">{r.description} • {new Date(r.dateAdded).toLocaleDateString()}</p>
                             </div>
                         </div>
                         <button onClick={() => requestDeleteResource(r)} className="text-red-400 hover:text-red-600 font-bold text-sm px-3 py-1 rounded hover:bg-red-50">{t('dash_delete')}</button>
                     </div>
                 ))}
             </div>
        </div>
     </div>
  );

  const renderMemberCommunity = () => (
      <div className="space-y-8 animate-fade-in-up pb-10">
         <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h3 className="font-bold text-xl mb-4 text-roBlue">{t('dash_test_add')}</h3>
             <p className="text-gray-600 mb-6">{t('dash_test_add_desc')}</p>
             <form onSubmit={handleSubmitStory}>
                 <textarea 
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4 h-32 focus:ring-2 focus:ring-roBlue outline-none" 
                    placeholder="Write your story here..."
                    value={memberStory}
                    onChange={e => setMemberStory(e.target.value)}
                    required
                 ></textarea>
                 <button type="submit" className="bg-roBlue text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-900 shadow-md transition-transform active:scale-95">{t('contact_btn_send')}</button>
             </form>
         </div>
         
         <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h3 className="font-bold text-lg mb-4 text-slate-800">{t('dash_my_submissions')}</h3>
             {allTestimonials.filter(t => t.author === user.name).length === 0 ? (
                 <p className="text-gray-400">{t('dash_no_submissions')}</p>
             ) : (
                 <div className="space-y-4">
                     {allTestimonials.filter(t => t.author === user.name).map(t => (
                         <div key={t.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                             <p className="italic text-gray-600 mb-2">"{t.text}"</p>
                             <div className="flex items-center gap-2">
                                 <span className={`text-xs font-bold px-2 py-1 rounded-full ${t.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                     {t.approved ? t('dash_status_approved') : t('dash_status_pending')}
                                 </span>
                                 <span className="text-xs text-gray-400">{new Date().toLocaleDateString()}</span>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
      </div>
  );

  const renderMemberResources = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up pb-10">
        {resources.length === 0 && (
            <div className="col-span-full text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-400 text-lg">Coming Soon...</p>
            </div>
        )}
        {resources.map(r => (
            <div key={r.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">
                    {r.category === 'music' ? '🎵' : r.category === 'choreography' ? '💃' : r.category === 'costume' ? '👘' : '📄'}
                </div>
                <h4 className="font-bold text-lg text-slate-800 mb-2">{r.title}</h4>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{r.description}</p>
                <a 
                   href={r.url} 
                   target="_blank" 
                   rel="noreferrer" 
                   className="inline-block bg-gray-100 text-roBlue font-bold px-4 py-2 rounded-lg hover:bg-roBlue hover:text-white transition-colors"
                >
                    Access Resource →
                </a>
            </div>
        ))}
    </div>
  );

  const renderMemberSchedule = () => {
    const myEvents = localEvents.filter(e => e.attendees.includes(user.id));
    return (
      <div className="space-y-8 animate-fade-in-up pb-10">
         {/* Profile Settings Card */}
         <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col lg:flex-row gap-8 items-start">
             
             {/* Left: Avatar Management */}
             <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
                 <div className="relative group mx-auto">
                     <Avatar src={displayAvatar} name={user.name} color={avatarColor} initials={customInitials} className="w-24 h-24 rounded-full text-3xl shadow-lg border-2 border-white" />
                     <label className="absolute bottom-0 right-0 bg-roBlue text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition-colors z-10" title={t('dash_avatar_change')}>
                         <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarChange} />
                         <span className="text-xs">📷</span>
                     </label>
                 </div>
                 
                 {/* No-Image Customization */}
                 <div className="w-full bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase text-center">{t('dash_avatar_customize')}</p>
                    
                    <div className="mb-3">
                       <label className="block text-[10px] text-gray-400 mb-1">{t('dash_avatar_bg')}</label>
                       <div className="flex flex-wrap gap-2 justify-center">
                          {AVATAR_COLORS.map(c => (
                             <button 
                               key={c}
                               onClick={() => { setAvatarColor(c); setDisplayAvatar(''); }} // Clear image if color selected
                               className={`w-6 h-6 rounded-full ${c} ${avatarColor === c ? 'ring-2 ring-offset-1 ring-slate-800' : 'hover:scale-110'} transition-all`}
                             />
                          ))}
                       </div>
                    </div>
                    
                    <div>
                        <label className="block text-[10px] text-gray-400 mb-1">{t('dash_avatar_initials')}</label>
                        <input 
                           type="text" 
                           maxLength={2} 
                           placeholder={user.name.substring(0,2).toUpperCase()}
                           className="w-full p-2 text-center text-sm font-bold border rounded uppercase bg-white"
                           value={customInitials}
                           onChange={e => { setCustomInitials(e.target.value.toUpperCase()); setDisplayAvatar(''); }}
                        />
                    </div>
                 </div>
             </div>

             {/* Right: Personal Details */}
             <div className="flex-1 w-full space-y-5">
                 <h3 className="text-xl font-bold text-slate-800 border-b pb-2">{t('dash_profile_settings')}</h3>
                 <div className="grid md:grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_mobile_num')}</label>
                         <input type="tel" placeholder="+15550001234" className="w-full p-2 border rounded bg-gray-50" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('dash_carrier_label')}</label>
                         <select className="w-full p-2 border rounded bg-gray-50" value={carrier} onChange={e => setCarrier(e.target.value)}>
                             <option value="">-- Select Carrier --</option>
                             <option value="rogers">Rogers</option>
                             <option value="bell">Bell</option>
                             <option value="telus">Telus</option>
                             <option value="fido">Fido</option>
                             <option value="virgin">Virgin</option>
                             <option value="koodo">Koodo</option>
                             <option value="freedom">Freedom</option>
                         </select>
                     </div>
                 </div>
                 
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                    <p className="text-xs text-gray-400 text-center sm:text-left">{t('dash_mobile_hint')}</p>
                    <button onClick={handleSaveProfile} className="bg-roBlue text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-900 shadow-md transition-all transform hover:-translate-y-0.5 w-full sm:w-auto">{t('dash_save_settings')}</button>
                 </div>
                 
                 <div className="border-t border-gray-100 pt-4 text-center sm:text-left">
                    <button onClick={handleEnableNotifications} className="text-xs text-roBlue hover:underline flex items-center gap-1 font-bold mx-auto sm:mx-0">🔔 Enable Browser Notifications</button>
                 </div>
             </div>
         </div>

         {/* My Schedule */}
         <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
             <div className="p-6 border-b border-gray-100 bg-roBlue/5"><h3 className="font-bold text-xl text-roBlue">📅 {t('dash_tab_schedule')}</h3></div>
             {myEvents.length === 0 ? (
                 <div className="p-10 text-center">
                     <div className="text-6xl mb-4 text-gray-200">📆</div>
                     <p className="text-gray-500 font-medium mb-4">{t('dash_no_rsvp')}</p>
                     <button onClick={onClose} className="bg-roYellow text-roBlue px-6 py-2 rounded-full font-bold shadow-md hover:shadow-lg">{t('dash_browse_events')}</button>
                 </div>
             ) : (
                 <div className="divide-y divide-gray-100">
                     {myEvents.map(ev => (
                         <div key={ev.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                             <div className="flex items-center gap-4">
                                 <div className="text-center bg-gray-100 rounded-lg p-2 min-w-[60px]">
                                     <div className="text-xs font-bold text-red-500 uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</div>
                                     <div className="text-xl font-bold text-slate-800">{new Date(ev.date).getDate()}</div>
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-lg text-slate-800">{ev.title}</h4>
                                     <p className="text-sm text-gray-500">📍 {ev.location} • ⏰ {ev.time}</p>
                                 </div>
                             </div>
                             <div className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-xs">Going</div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
      </div>
    );
  };

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
