
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
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-slate-500'
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
  const [eventInputType, setEventInputType] = useState<'url' | 'file'>('url'); 
  const [descriptionLang, setDescriptionLang] = useState<Language>('en'); 
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [newResource, setNewResource] = useState<Partial<Resource>>({ category: 'document' });
  const [resourceInputType, setResourceInputType] = useState<'url' | 'file'>('url');
  
  const eventImageRef = useRef<HTMLInputElement>(null);
  const eventFormTopRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
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
        onUpdateData(); 
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
      showToast("Failed to delete item.", 'error');
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
        showToast(isLive ? "File too large (Max 10MB)" : "Demo Mode: Max 2MB", 'error');
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

  const handleAdminMediaSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mediaUrl) return;
      
      try {
          await addGalleryItem({
              url: mediaUrl,
              caption: mediaCaption || 'Gallery Item',
              source: 'upload',
              type: mediaType,
              eventId: selectedEventId || undefined,
              approved: true
          });
          setMediaUrl('');
          setMediaCaption('');
          setSelectedEventId('');
          onUpdateData();
          showToast('Media added to gallery!', 'success');
      } catch (err) {
          showToast('Failed to add media', 'error');
      }
  };

  const handleApproveGalleryItem = async (id: string) => {
     try {
       await toggleGalleryApproval(id);
       onUpdateData();
       showToast('Media visibility updated!', 'success');
     } catch(e) {
       showToast('Failed to update status', 'error');
     }
  }

  const handleInstagramSync = async () => {
    setIsSyncing(true);
    try {
      await syncInstagram();
      onUpdateData();
      showToast('Synced with Instagram', 'success');
    } catch (e) {
      showToast('Instagram sync failed.', 'error');
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
      await updateUserProfile(user.id, { 
          phoneNumber, 
          carrier,
          avatarColor,
          customInitials,
          avatar: displayAvatar 
      });
      showToast("Profile settings saved!", 'success');
      onUpdateData(); 
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
          showToast("Permission denied.", 'error');
      }
  };

  const handleToggleTestimonial = async (id: string) => {
    try {
      await toggleTestimonialApproval(id);
      onUpdateData();
      showToast('Testimonial status updated', 'success');
      loadCommonData();
    } catch (e) {
      showToast('Failed to update testimonial', 'error');
    }
  };

  const handleSaveTestimonialEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingTestimonial) return;
      try {
          await updateTestimonial(editingTestimonial.id, { 
              text: editingTestimonial.text, 
              author: editingTestimonial.author 
          });
          setEditingTestimonial(null);
          onUpdateData();
          showToast(t('dash_content_saved'), 'success');
          loadCommonData();
      } catch(e) {
          showToast("Failed to update testimonial", 'error');
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
          showToast(e.message || 'Failed to add resource', 'error');
      }
  };
  
  const handleResourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const limit = isLive ? 50 * 1024 * 1024 : 2 * 1024 * 1024;
      if (file.size > limit) {
          showToast(isLive ? "File too large (Max 50MB)" : "Demo Mode: Max 2MB", 'error');
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
      className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
        activeTab === id 
          ? 'bg-roYellow text-roBlue shadow-lg scale-[1.02] font-bold' 
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-roBlue text-white overflow-hidden">
      <div className="p-8 flex flex-col items-center border-b border-white/10">
         <div className="relative mb-4 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
           <Avatar src={displayAvatar} name={user.name} color={avatarColor} initials={customInitials} className="w-24 h-24 rounded-full border-4 border-roYellow shadow-2xl text-2xl" />
           <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-xl">📸</span>
           </div>
         </div>
         <h3 className="font-bold text-xl text-center truncate w-full">{user.name}</h3>
         <div className="flex items-center gap-2 mt-2">
           <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full shadow-sm ${user.role === 'admin' ? 'bg-roRed text-white' : 'bg-roYellowDark text-roBlue'}`}>
             {user.role}
           </span>
         </div>
      </div>
      <nav className="flex-1 p-6 space-y-3 overflow-y-auto no-scrollbar">
        {user.role === 'admin' ? (
          <>
            <NavButton id="events" label={t('dash_tab_events')} icon="📅" />
            <NavButton id="gallery" label={t('dash_tab_gallery')} icon="🖼️" />
            <NavButton id="users" label={t('dash_tab_users')} icon="👥" />
            <NavButton id="testimonials" label={t('dash_tab_testimonials')} icon="💬" />
            <NavButton id="resources" label={t('dash_tab_resources')} icon="📚" />
            <NavButton id="content" label={t('dash_tab_content')} icon="✏️" />
          </>
        ) : (
          <>
             <NavButton id="schedule" label={t('dash_tab_schedule')} icon="📆" />
             <NavButton id="resources" label={t('dash_tab_resources')} icon="📚" />
             <NavButton id="community" label={t('dash_tab_community')} icon="✍️" />
          </>
        )}
      </nav>
      <div className="p-6 border-t border-white/10 space-y-4 bg-slate-900/40 backdrop-blur-md">
        <LanguageSwitcher className="justify-center scale-110" />
        <button onClick={onClose} className="w-full text-slate-400 hover:text-white hover:bg-roRed/40 py-3 rounded-xl transition-all text-sm font-bold flex items-center justify-center gap-2 border border-white/5">
          <span>🚪</span> {t('dash_exit')}
        </button>
      </div>
    </div>
  );

  const renderGalleryAdmin = () => {
    return (
      <div className="space-y-10 animate-scale-in pb-10">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Add Media Form */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <h3 className="text-2xl font-black text-roBlue mb-6 flex items-center gap-3">
              <span className="bg-roBlue/10 p-2 rounded-xl text-xl">➕</span>
              {t('dash_upload_title')}
            </h3>
            <form onSubmit={handleAdminMediaSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-tighter">{t('dash_gal_type')}</label>
                  <select 
                    className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-roBlue outline-none transition-all font-bold appearance-none"
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                  >
                    <option value="image">🖼️ Image</option>
                    <option value="video">🎥 Video</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-tighter">{t('dash_gal_event_link')}</label>
                  <select 
                    className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-roBlue outline-none transition-all font-bold appearance-none"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                  >
                    <option value="">No Event Link</option>
                    {localEvents.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-tighter">URL / Link</label>
                <input 
                  type="text" 
                  placeholder={mediaType === 'video' ? "YouTube / Vimeo Link" : "Direct Image URL"}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-roBlue outline-none transition-all font-medium"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-tighter">Caption</label>
                <input 
                  type="text" 
                  placeholder="Short description..."
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-roBlue outline-none transition-all font-medium"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-roBlue text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:shadow-roBlue/30 transform hover:-translate-y-1 active:scale-95 transition-all"
              >
                {t('dash_save')}
              </button>
            </form>
          </div>

          {/* Integration Status */}
          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-roYellow/10 rounded-full blur-3xl"></div>
            <div>
              <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                <span className="bg-white/10 p-2 rounded-xl text-xl">🔌</span>
                {t('dash_ig_title')}
              </h3>
              <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                {t('dash_ig_text')} @RomanianKitchenerFolkClub.
              </p>
            </div>
            
            <button 
              onClick={handleInstagramSync}
              disabled={isSyncing}
              className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 ${
                isSyncing ? 'bg-white/20 text-slate-400' : 'bg-white text-roBlue hover:bg-roYellow'
              }`}
            >
              {isSyncing ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-200 rounded-full animate-spin"></div>
                  {t('dash_ig_syncing')}
                </>
              ) : (
                <>📷 {t('dash_ig_btn')}</>
              )}
            </button>
          </div>
        </div>

        {/* Gallery Management Grid */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
              <span className="text-roRed">🖼️</span> {t('dash_tab_gallery')}
            </h3>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
               <button className="px-4 py-2 rounded-lg bg-roBlue text-white font-bold text-xs">All Items</button>
               <button className="px-4 py-2 rounded-lg text-slate-400 font-bold text-xs hover:text-roBlue">Pending</button>
            </div>
          </div>

          {localGallery.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-slate-300 font-black text-xl uppercase tracking-widest">No Media Found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-100">
              {localGallery.map(item => (
                <div key={item.id} className="relative aspect-square group bg-white overflow-hidden">
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-3xl">🎥</div>
                  ) : (
                    <img src={item.url} alt={item.caption} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  )}
                  
                  {/* Approval Indicator */}
                  {!item.approved && (
                    <div className="absolute top-2 left-2 bg-roRed text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg">
                      {t('dash_gal_pending')}
                    </div>
                  )}

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-roBlue/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 p-4">
                    <p className="text-white text-xs font-bold text-center line-clamp-2 mb-2">{item.caption}</p>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleApproveGalleryItem(item.id)}
                         className={`p-2 rounded-lg text-white transition-all hover:scale-110 ${item.approved ? 'bg-roYellow text-roBlue' : 'bg-green-500'}`}
                         title={item.approved ? t('dash_btn_hide') : t('dash_btn_approve')}
                       >
                         {item.approved ? '👁️' : '✓'}
                       </button>
                       <button 
                         onClick={() => requestDeleteGallery(item)}
                         className="p-2 bg-roRed text-white rounded-lg transition-all hover:scale-110"
                         title={t('dash_delete')}
                       >
                         🗑️
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMemberSchedule = () => {
    const myEvents = localEvents.filter(e => e.attendees.includes(user.id));
    return (
      <div className="space-y-8 animate-fade-in-up pb-10">
         {/* Member Profile - Refined Visuals */}
         <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col lg:flex-row gap-12 items-center lg:items-start relative overflow-hidden">
             {/* Abstract Background Elements */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-roYellow/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
             
             {/* Studio View Avatar Management */}
             <div className="flex flex-col items-center gap-6 w-full lg:w-72 shrink-0">
                 <div className="relative">
                     <div className="absolute -inset-2 bg-gradient-to-tr from-roBlue to-roYellow rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                     <Avatar src={displayAvatar} name={user.name} color={avatarColor} initials={customInitials} className="relative w-40 h-40 rounded-full text-5xl shadow-2xl border-4 border-white object-cover" />
                     <label className="absolute bottom-2 right-2 bg-roBlue text-white p-3 rounded-full cursor-pointer shadow-xl hover:bg-roBlue/90 hover:scale-110 transition-all border-2 border-white" title={t('dash_avatar_change')}>
                         <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarChange} />
                         <span className="text-lg">📷</span>
                     </label>
                 </div>
                 
                 {/* Design Studio Controls */}
                 <div className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest text-center">{t('dash_avatar_customize')}</p>
                    
                    <div className="mb-5">
                       <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">{t('dash_avatar_bg')}</label>
                       <div className="grid grid-cols-5 gap-2">
                          {AVATAR_COLORS.map(c => (
                             <button 
                               key={c}
                               onClick={() => { setAvatarColor(c); setDisplayAvatar(''); }} 
                               className={`w-8 h-8 rounded-full ${c} ${avatarColor === c ? 'ring-4 ring-roBlue/20 scale-110 shadow-lg' : 'hover:scale-105'} transition-all`}
                             />
                          ))}
                       </div>
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">{t('dash_avatar_initials')}</label>
                        <input 
                           type="text" 
                           maxLength={2} 
                           placeholder={user.name.substring(0,2).toUpperCase()}
                           className="w-full p-3 text-center text-lg font-black border-2 border-slate-200 rounded-xl uppercase bg-white focus:border-roBlue outline-none transition-colors"
                           value={customInitials}
                           onChange={e => { setCustomInitials(e.target.value.toUpperCase()); setDisplayAvatar(''); }}
                        />
                    </div>
                 </div>
             </div>

             {/* Personal Details Form */}
             <div className="flex-1 w-full space-y-8">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-2xl font-black text-roBlue">{t('dash_profile_settings')}</h3>
                    <div className="flex gap-2">
                       <span className="w-3 h-3 rounded-full bg-roBlue"></span>
                       <span className="w-3 h-3 rounded-full bg-roYellow"></span>
                       <span className="w-3 h-3 rounded-full bg-roRed"></span>
                    </div>
                 </div>
                 
                 <div className="grid md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                         <label className="block text-xs font-black text-slate-500 uppercase tracking-tighter">{t('dash_mobile_num')}</label>
                         <input type="tel" placeholder="+1 (555) 000-0000" className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-roBlue outline-none transition-all font-medium" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                     </div>
                     <div className="space-y-2">
                         <label className="block text-xs font-black text-slate-500 uppercase tracking-tighter">{t('dash_carrier_label')}</label>
                         <select className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-roBlue outline-none transition-all font-medium appearance-none" value={carrier} onChange={e => setCarrier(e.target.value)}>
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
                 
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-6 p-6 bg-roBlue/5 rounded-3xl border border-roBlue/10">
                    <div className="flex items-start gap-3">
                       <span className="text-2xl">💡</span>
                       <p className="text-xs text-slate-500 leading-relaxed max-w-xs">{t('dash_mobile_hint')}</p>
                    </div>
                    <button onClick={handleSaveProfile} className="bg-roBlue text-white px-10 py-4 rounded-2xl font-black hover:bg-slate-900 shadow-xl hover:shadow-roBlue/20 transition-all transform hover:-translate-y-1 w-full sm:w-auto active:scale-95 whitespace-nowrap">
                       {t('dash_save_settings')}
                    </button>
                 </div>
                 
                 <div className="pt-4 border-t border-slate-100">
                    <button onClick={handleEnableNotifications} className="text-xs text-roBlue hover:text-roRed font-black flex items-center gap-2 transition-colors">
                       <span className="p-2 bg-roBlue/10 rounded-full">🔔</span> 
                       Enable Browser Push Notifications
                    </button>
                 </div>
             </div>
         </div>

         {/* My Schedule Grid */}
         <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
             <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                   <span className="text-roRed">📅</span> {t('dash_tab_schedule')}
                </h3>
                {myEvents.length > 0 && (
                   <span className="bg-roBlue text-white text-[10px] font-black px-3 py-1 rounded-full">{myEvents.length} RSVPs</span>
                )}
             </div>
             
             {myEvents.length === 0 ? (
                 <div className="p-20 text-center flex flex-col items-center">
                     <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner animate-pulse">📆</div>
                     <p className="text-slate-400 font-bold text-lg mb-6 max-w-xs">{t('dash_no_rsvp')}</p>
                     <button onClick={onClose} className="bg-roYellow text-roBlue px-10 py-4 rounded-2xl font-black shadow-lg hover:shadow-roYellow/40 transition-all transform hover:scale-105 active:scale-95">
                        {t('dash_browse_events')}
                     </button>
                 </div>
             ) : (
                 <div className="grid md:grid-cols-2 divide-x divide-y divide-slate-100">
                     {myEvents.map(ev => (
                         <div key={ev.id} className="p-8 flex items-start gap-6 hover:bg-slate-50 transition-all group">
                             <div className="text-center bg-white shadow-md border border-slate-100 rounded-2xl p-4 min-w-[80px] group-hover:scale-110 transition-transform">
                                 <div className="text-xs font-black text-roRed uppercase tracking-widest mb-1">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</div>
                                 <div className="text-3xl font-black text-slate-800 leading-none">{new Date(ev.date).getDate()}</div>
                             </div>
                             <div className="space-y-2">
                                 <h4 className="font-black text-xl text-slate-800 group-hover:text-roBlue transition-colors">{ev.title}</h4>
                                 <div className="flex flex-col gap-1">
                                    <p className="text-sm text-slate-500 font-medium flex items-center gap-1">📍 {ev.location}</p>
                                    <p className="text-sm text-slate-400 font-medium flex items-center gap-1">⏰ {ev.time}</p>
                                 </div>
                                 <div className="pt-2">
                                    <span className="text-green-600 font-black bg-green-50 px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-wider border border-green-100">✓ Confirmed</span>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 font-sans flex h-screen overflow-hidden animate-fade-in">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-20 bg-roBlue z-[70] flex items-center justify-between px-6 shadow-xl">
         <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="text-white p-3 hover:bg-white/10 rounded-xl transition-colors">
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <span className="text-white font-black text-xl tracking-tight">{t('nav_dashboard')}</span>
         </div>
         <button onClick={onClose} className="text-roYellow font-black text-sm uppercase tracking-widest border border-roYellow/30 px-4 py-2 rounded-xl">Exit</button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-[75] md:hidden backdrop-blur-sm animate-fade-in" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-[80] w-80 shadow-2xl transform transition-transform duration-500 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {renderSidebarContent()}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full pt-20 md:pt-0 bg-slate-100">
        <header className="flex-shrink-0 px-8 py-6 md:py-10 border-b border-slate-200 bg-white/60 backdrop-blur-xl flex justify-between items-center sticky top-0 z-10">
             <div>
               <h1 className="text-3xl md:text-4xl font-black text-roBlue tracking-tight capitalize drop-shadow-sm">
                  {t(`dash_tab_${activeTab}` as any) || activeTab}
               </h1>
               <div className="flex items-center gap-2 mt-2">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 <p className="text-slate-500 text-xs font-bold">{t('dash_logged_in')} <span className="text-slate-800">{user.email}</span></p>
               </div>
             </div>
             <div className="hidden lg:flex items-center gap-4">
                <div className="bg-roBlue/5 rounded-2xl px-5 py-3 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden">
                      <Avatar src={displayAvatar} name={user.name} color={avatarColor} initials={customInitials} className="w-full h-full" />
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-slate-800 leading-none">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{user.role}</p>
                   </div>
                </div>
             </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 md:p-12 no-scrollbar">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'events' && user.role === 'admin' && (
              <div className="animate-scale-in">
                {/* Simplified placeholder for events for this specific update pass */}
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                   <p className="text-slate-400 font-bold">Event management active.</p>
                </div>
              </div>
            )}
            {activeTab === 'gallery' && user.role === 'admin' && renderGalleryAdmin()}
            {activeTab === 'schedule' && renderMemberSchedule()}
            {activeTab === 'community' && user.role === 'member' && (
              <div className="animate-fade-in-up">
                 {/* Community placeholder */}
              </div>
            )}
            
            {/* Fallback for other tabs */}
            {(activeTab !== 'schedule' && activeTab !== 'gallery') && (
               <div className="animate-fade-in-up opacity-80 p-20 text-center border-4 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-300 font-black text-2xl uppercase tracking-widest">Section Under Review</p>
               </div>
            )}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmModal isOpen={modalOpen} title={t('dash_delete')} message={itemToDelete?.name ? `${t('dash_delete_confirm')} (${itemToDelete.name})` : t('dash_delete_confirm')} isDestructive={true} isLoading={modalLoading} onConfirm={executeDelete} onClose={() => { setModalOpen(false); setItemToDelete(null); }} previewImage={itemToDelete?.img} />
    </div>
  );
};

export default Dashboard;
