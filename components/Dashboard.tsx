
import React, { useState, useRef, useEffect } from 'react';
import { User, Event, GalleryItem, Testimonial, PageContent } from '../types';
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
  isFirebaseActive // Imported helper
} from '../services/mockService';
import { useTranslation } from '../services/translations';
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(user.role === 'admin' ? 'events' : 'schedule');
  const [isSyncing, setIsSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Connection Status
  const [isLive, setIsLive] = useState(false);
  useEffect(() => { setIsLive(isFirebaseActive()); }, []);
  
  // Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Data States
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTestimonials, setAllTestimonials] = useState<Testimonial[]>([]);
  const [pageContents, setPageContents] = useState<PageContent[]>([]);
  
  // Local Optimistic States (initialized from props)
  const [localEvents, setLocalEvents] = useState<Event[]>(events);
  const [localGallery, setLocalGallery] = useState<GalleryItem[]>(gallery);

  // Profile Settings
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');

  // Sync props to local state when props change
  useEffect(() => { setLocalEvents(events); }, [events]);
  useEffect(() => { setLocalGallery(gallery); }, [gallery]);
  
  // Content Editing State
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [editContentText, setEditContentText] = useState<{en: string, ro: string, fr: string}>({ en: '', ro: '', fr: '' });
  
  // Testimonial Editing State (Admin)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  
  // Testimonial Submission State (Member)
  const [memberStory, setMemberStory] = useState('');

  // Form States
  const [newEvent, setNewEvent] = useState<Partial<Event>>({ type: 'performance' });
  const eventImageRef = useRef<HTMLInputElement>(null);
  const eventFormTopRef = useRef<HTMLDivElement>(null);

  // --- Modal State ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'event' | 'gallery' | 'user' | 'testimonial', name?: string, img?: string } | null>(null);

  // Helper for Toasts
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Fetch local dashboard data
  useEffect(() => {
    // Both admin and members need testimonials and content might be useful
    loadCommonData();
    if (user.role === 'admin') {
      loadAdminData();
    }
  }, [user.role, activeTab]);

  const loadCommonData = async () => {
     try {
         const tData = await getTestimonials();
         setAllTestimonials(tData);
     } catch(e) { console.error(e); }
  }

  const loadAdminData = async () => {
    try {
      const u = await getUsers();
      setAllUsers(u);
      const contentData = await getPageContent();
      setPageContents(contentData);
      
      // Default selection for content tab
      if (contentData.length > 0 && !selectedContentId) {
         setSelectedContentId(contentData[0].id);
         setEditContentText(contentData[0].text);
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    }
  };

  // --- Event Handlers ---
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
    setNewEvent(ev);
    if (eventFormTopRef.current) {
      eventFormTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setNewEvent({ type: 'performance' });
    if (eventImageRef.current) eventImageRef.current.value = '';
  };

  // Trigger Modal Openers
  const requestDeleteEvent = (ev: Event) => {
    setItemToDelete({ id: ev.id, type: 'event', name: ev.title, img: ev.image });
    setModalOpen(true);
  };

  const requestDeleteGallery = (item: GalleryItem) => {
    setItemToDelete({ id: item.id, type: 'gallery', name: 'Image', img: item.url });
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

  // Centralized Delete Logic
  const executeDelete = async () => {
    if (!itemToDelete) return;

    setModalLoading(true);
    try {
      switch (itemToDelete.type) {
        case 'event':
          // Optimistic update
          setLocalEvents(prev => prev.filter(e => e.id !== itemToDelete.id));
          await deleteEvent(itemToDelete.id);
          break;
        case 'gallery':
          // Optimistic update
          setLocalGallery(prev => prev.filter(i => i.id !== itemToDelete.id));
          await deleteGalleryItem(itemToDelete.id);
          break;
        case 'user':
          await deleteUser(itemToDelete.id);
          break;
        case 'testimonial':
          // Optimistic update
          setAllTestimonials(prev => prev.filter(t => t.id !== itemToDelete.id));
          await deleteTestimonial(itemToDelete.id);
          break;
      }
      
      // Refresh Data (Sync)
      onUpdateData();
      if (itemToDelete.type === 'user') loadAdminData();
      
      showToast(`${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} deleted successfully.`, 'success');
    } catch (error) {
      console.error("Delete failed", error);
      showToast("Failed to delete item. Please try again.", 'error');
      // Revert states if needed (simplified here by just reloading)
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvent({ ...newEvent, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Gallery Handlers ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await addGalleryItem({
          url: base64,
          caption: file.name,
          source: 'upload'
        });
        onUpdateData();
        showToast('Image uploaded successfully', 'success');
      };
      reader.readAsDataURL(file);
    } catch (e) {
      showToast('Failed to upload image', 'error');
    }
  };

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

  // --- User Handlers ---
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

  // --- Testimonial Handlers (Admin) ---
  const handleToggleTestimonial = async (id: string) => {
    // Optimistic Update
    const previousState = [...allTestimonials];
    setAllTestimonials(prev => prev.map(t => 
      t.id === id ? { ...t, approved: !t.approved } : t
    ));

    try {
      await toggleTestimonialApproval(id);
      onUpdateData(); // Sync Global
      showToast('Testimonial status updated', 'success');
    } catch (e) {
      // Revert on failure
      setAllTestimonials(previousState);
      showToast('Failed to update testimonial', 'error');
    }
  };

  const handleSaveTestimonialEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingTestimonial) return;

      // Optimistic Update
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
          loadCommonData(); // Revert/Reload
      }
  };
  
  // --- Testimonial Handlers (Member) ---
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

  // --- Content Handlers ---
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
      loadAdminData(); // Refresh local state
      onUpdateData(); // Refresh app state
      showToast(t('dash_content_saved'), 'success');
    } catch (e) {
      showToast('Failed to save content', 'error');
    }
  };

  // --- Render Sections ---
  
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
         
         {/* Live Status Indicator */}
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
            <NavButton id="content" label="Page Content" icon="✏️" />
          </>
        )}
        {user.role === 'member' && (
          <>
             <NavButton id="schedule" label={t('dash_tab_schedule')} icon="📆" />
             <NavButton id="resources" label={t('dash_tab_resources')} icon="📚" />
             <NavButton id="community" label={t('dash_tab_community')} icon="✍️" />
          </>
        )}
        {user.role === 'guest' && (
           <div className="text-center p-4 text-gray-400 text-sm">
             <p className="mb-2">Account Pending Approval</p>
             <p>Contact admin to upgrade membership.</p>
           </div>
        )}
      </nav>
      
      <div className="p-4 border-t border-white/10 space-y-4 bg-slate-800/50">
        <LanguageSwitcher className="justify-center" />
        <button 
          onClick={onClose} 
          className="w-full text-gray-400 hover:text-white hover:bg-red-900/30 py-2 rounded transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span>🚪</span> {t('dash_back')}
        </button>
      </div>
    </div>
  );

  if (user.role === 'guest') {
     // Special simplified view for guests
     return (
       <div className="fixed inset-0 z-[60] bg-slate-50 font-sans flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
             <div className="text-5xl mb-4">⏳</div>
             <h2 className="text-2xl font-bold text-roBlue mb-2">Membership Pending</h2>
             <p className="text-gray-600 mb-6">Thank you for joining! An administrator needs to approve your account before you can access the member area.</p>
             <button onClick={onClose} className="bg-roBlue text-white px-6 py-3 rounded-full font-bold w-full hover:bg-blue-900 transition-colors">
               Back to Website
             </button>
          </div>
       </div>
     );
  }

  const renderAdminEvents = () => (
    <div className="space-y-8 animate-fade-in-up pb-10" ref={eventFormTopRef}>
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h3 className="text-xl font-bold mb-6 text-slate-800 border-b pb-2 flex items-center gap-2">
          <span>{newEvent.id ? '✏️' : '✨'}</span> {newEvent.id ? 'Edit Event' : t('dash_add_event')}
        </h3>
        <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label htmlFor="event-title" className="block text-sm font-bold text-gray-700">{t('dash_event_title')}</label>
            <input 
              id="event-title"
              type="text" 
              placeholder="e.g. Spring Festival" 
              className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
              value={newEvent.title || ''} 
              onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
              required 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="event-type" className="block text-sm font-bold text-gray-700">Type</label>
            <select 
              id="event-type"
              className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none bg-white" 
              value={newEvent.type} 
              onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
            >
              <option value="performance">Performance</option>
              <option value="workshop">Workshop</option>
              <option value="social">Social</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="event-date" className="block text-sm font-bold text-gray-700">{t('dash_table_date')}</label>
            <input 
              id="event-date"
              type="date" 
              className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
              value={newEvent.date || ''} 
              onChange={e => setNewEvent({...newEvent, date: e.target.value})} 
              required 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <div className="space-y-1">
              <label htmlFor="event-time" className="block text-sm font-bold text-gray-700">Start Time (EST)</label>
              <input 
                id="event-time"
                type="time" 
                className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
                value={newEvent.time || ''} 
                onChange={e => setNewEvent({...newEvent, time: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="event-endtime" className="block text-sm font-bold text-gray-700">End Time (EST)</label>
              <input 
                id="event-endtime"
                type="time" 
                className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
                value={newEvent.endTime || ''} 
                onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} 
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label htmlFor="event-location" className="block text-sm font-bold text-gray-700">{t('contact_label_location')}</label>
            <input 
              id="event-location"
              type="text" 
              placeholder="e.g. Main Hall" 
              className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-roBlue outline-none" 
              value={newEvent.location || ''} 
              onChange={e => setNewEvent({...newEvent, location: e.target.value})} 
              required 
            />
          </div>
          
          <div className="md:col-span-2 space-y-1">
             <label htmlFor="event-image" className="block text-sm font-bold text-gray-700">{t('dash_event_image')}</label>
             <div className="space-y-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <input 
                  id="event-image"
                  type="file" 
                  ref={eventImageRef} 
                  accept="image/*" 
                  onChange={handleEventImageUpload}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-roBlue file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {newEvent.image && (
                  <div className="relative h-48 w-full rounded-lg overflow-hidden border border-gray-200 group mt-4">
                    <img 
                      src={newEvent.image} 
                      alt="Event Preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewEvent({ ...newEvent, image: undefined });
                        if (eventImageRef.current) eventImageRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700"
                      title="Remove Image"
                    >
                      ✕
                    </button>
                  </div>
                )}
             </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label htmlFor="event-description" className="block text-sm font-bold text-gray-700">{t('dash_event_desc')}</label>
            <textarea 
              id="event-description"
              placeholder="Event details..." 
              className="p-3 border border-gray-300 rounded-lg w-full min-h-[100px] focus:ring-2 focus:ring-roBlue outline-none" 
              value={newEvent.description || ''} 
              onChange={e => setNewEvent({...newEvent, description: e.target.value})} 
            />
          </div>
          
          <div className="md:col-span-2 flex gap-4">
            {newEvent.id && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-500 text-white py-4 rounded-lg hover:bg-gray-600 shadow-lg transition-transform hover:-translate-y-0.5 font-bold text-lg flex items-center justify-center gap-2"
              >
                <span>🚫</span> Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 shadow-lg transition-transform hover:-translate-y-0.5 font-bold text-lg flex items-center justify-center gap-2"
            >
              <span>💾</span> {newEvent.id ? 'Update Event' : t('dash_save')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-sm font-bold text-gray-600 uppercase tracking-wider">{t('dash_table_event')}</th>
                <th className="p-4 text-sm font-bold text-gray-600 uppercase tracking-wider">{t('dash_table_date')}</th>
                <th className="p-4 text-sm font-bold text-gray-600 uppercase tracking-wider">{t('dash_table_attendees')}</th>
                <th className="p-4 text-sm font-bold text-gray-600 uppercase tracking-wider text-right">{t('dash_table_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {localEvents.map(ev => {
                // Calculate attendees
                const safeAttendees = ev.attendees || [];
                const attendeesList = allUsers.filter(u => safeAttendees.includes(u.id));
                
                return (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-4">
                        {ev.image ? (
                          <img src={ev.image} alt="" className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xl">📅</div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800">{ev.title}</div>
                          <div className="text-xs text-gray-500">{ev.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-medium align-top">
                      {new Date(ev.date).toLocaleDateString()} <br/>
                      <span className="text-xs text-gray-400">
                        {ev.time} {ev.endTime ? `- ${ev.endTime}` : ''} EST
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold whitespace-nowrap">
                          {attendeesList.length} Attendees
                        </span>
                        {attendeesList.length > 0 && (
                          <details className="text-xs text-gray-600 w-full mt-1 border border-blue-100 rounded bg-blue-50/50 p-2">
                            <summary className="cursor-pointer hover:text-roBlue font-bold select-none flex items-center gap-1">
                              <span>👥</span> View List
                            </summary>
                            <ul className="list-disc pl-4 mt-2 space-y-1 max-h-[100px] overflow-y-auto">
                              {attendeesList.map(u => (
                                <li key={u.id} className="text-slate-700">{u.name}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right align-top">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditEvent(ev)}
                          className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => requestDeleteEvent(ev)} 
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                          title={t('dash_delete')}
                        >
                          🗑️
                        </button>
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

  const renderAdminGallery = () => (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="font-bold mb-4 text-lg flex items-center gap-2">
            <span>📤</span> {t('dash_upload_title')}
          </h3>
          <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 hover:border-roBlue transition-all block group">
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
            <p className="text-gray-600 font-medium group-hover:text-roBlue">{t('dash_upload_text')}</p>
            <p className="text-xs text-gray-400 mt-2">{t('dash_upload_hint')}</p>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload}
              id="gallery-upload-input"
            />
          </label>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col items-center justify-center text-center">
          <h3 className="font-bold mb-4 text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            {t('dash_ig_title')}
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">{t('dash_ig_text')}</p>
          <button 
            onClick={handleInstagramSync} 
            disabled={isSyncing}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2 font-bold w-full sm:w-auto justify-center"
          >
            {isSyncing ? t('dash_ig_syncing') : `🔄 ${t('dash_ig_btn')}`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {localGallery.map(item => (
          <div key={item.id} className="relative group aspect-square bg-gray-200 rounded-xl overflow-hidden shadow-sm">
            <img src={item.url} alt="Admin view" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 justify-between">
                <span className="text-white text-[10px] uppercase font-bold tracking-wider bg-black/60 backdrop-blur px-2 py-1 rounded">
                  {item.source}
                </span>
                <button 
                   onClick={() => requestDeleteGallery(item)}
                   className="text-white bg-red-600 p-1.5 rounded-full hover:bg-red-700"
                   title="Delete"
                >
                  🗑️
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
                  <td className="p-4 flex items-center gap-3">
                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full border border-gray-200" />
                    <span className="font-bold text-slate-800">{u.name}</span>
                  </td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${u.role === 'admin' ? 'bg-roRed/10 text-roRed' : 'bg-blue-100 text-blue-800'}`}>
                      <span className={`w-2 h-2 rounded-full ${u.role === 'admin' ? 'bg-roRed' : 'bg-blue-800'}`}></span>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                         onClick={() => handleToggleRole(u)}
                         disabled={u.id === user.id}
                         className={`text-sm font-bold px-3 py-1 rounded transition-colors ${
                           u.id === user.id 
                             ? 'text-gray-400 cursor-not-allowed bg-gray-100' 
                             : 'text-roBlue hover:bg-roBlue hover:text-white border border-roBlue'
                         }`}
                       >
                         {u.role === 'admin' ? t('dash_demote') : t('dash_promote')}
                       </button>
                       <button 
                         onClick={() => requestDeleteUser(u)}
                         disabled={u.id === user.id}
                         className={`p-1.5 rounded text-red-500 hover:bg-red-50 ${u.id === user.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                         title="Delete User"
                       >
                         🗑️
                       </button>
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

        {/* Admin Edit Overlay */}
        {editingTestimonial && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg animate-fade-in">
                <h3 className="text-xl font-bold mb-4">{t('dash_test_edit')}</h3>
                <form onSubmit={handleSaveTestimonialEdit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('dash_test_author')}</label>
                        <input 
                           type="text" 
                           className="w-full p-2 border rounded-lg"
                           value={editingTestimonial.author}
                           onChange={e => setEditingTestimonial({...editingTestimonial, author: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('dash_test_content')}</label>
                        <textarea 
                           className="w-full p-2 border rounded-lg h-32"
                           value={editingTestimonial.text}
                           onChange={e => setEditingTestimonial({...editingTestimonial, text: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                       <button 
                         type="button"
                         onClick={() => setEditingTestimonial(null)}
                         className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                       >
                         Cancel
                       </button>
                       <button 
                         type="submit"
                         className="px-4 py-2 bg-roBlue text-white rounded-lg hover:bg-blue-900"
                       >
                         {t('dash_save')}
                       </button>
                    </div>
                </form>
             </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b">
                    <tr>
                    <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_test_author')}</th>
                    <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_test_content')}</th>
                    <th className="p-4 text-sm font-bold text-gray-600 uppercase">{t('dash_test_status')}</th>
                    <th className="p-4 text-sm font-bold text-gray-600 uppercase text-right">{t('dash_table_actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {allTestimonials.map(testimonial => (
                    <tr key={testimonial.id} className="hover:bg-slate-50">
                        <td className="p-4">
                            <div className="font-bold text-slate-800">{testimonial.author}</div>
                            <div className="text-xs text-gray-500">{testimonial.role}</div>
                        </td>
                        <td className="p-4 text-sm text-gray-600 max-w-xs leading-relaxed italic">"{testimonial.text}"</td>
                        <td className="p-4">
                            {testimonial.approved ? (
                                <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold border border-green-200">{t('dash_status_approved')}</span>
                            ) : (
                                <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs font-bold border border-yellow-200">{t('dash_status_pending')}</span>
                            )}
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setEditingTestimonial(testimonial)} 
                                className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handleToggleTestimonial(testimonial.id)} 
                                className={`text-xs font-bold px-3 py-1 rounded transition-colors ${
                                  testimonial.approved 
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                  {testimonial.approved ? t('dash_btn_hide') : t('dash_btn_approve')}
                              </button>
                              <button 
                                onClick={() => requestDeleteTestimonial(testimonial)} 
                                className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 p-1.5 rounded"
                                title={t('dash_delete')}
                              >
                                  🗑️
                              </button>
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
        <h3 className="text-xl font-bold mb-6 text-slate-800 border-b pb-2 flex items-center gap-2">
          <span>✏️</span> Manage Page Content
        </h3>
        
        <div className="space-y-6">
          <div>
             <label htmlFor="content-selector" className="block text-sm font-bold text-gray-700 mb-2">Select Section to Edit</label>
             <select 
               id="content-selector"
               className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none bg-white font-bold text-gray-700"
               value={selectedContentId}
               onChange={(e) => handleContentSelect(e.target.value)}
             >
               {pageContents.map(c => (
                 <option key={c.id} value={c.id}>{c.description}</option>
               ))}
             </select>
          </div>

          <div className="grid gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                🇬🇧 English Text
              </label>
              <textarea 
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none font-medium"
                value={editContentText.en}
                onChange={(e) => setEditContentText({...editContentText, en: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                🇷🇴 Romanian Text
              </label>
              <textarea 
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none font-medium"
                value={editContentText.ro}
                onChange={(e) => setEditContentText({...editContentText, ro: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                🇫🇷 French Text
              </label>
              <textarea 
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none font-medium"
                value={editContentText.fr}
                onChange={(e) => setEditContentText({...editContentText, fr: e.target.value})}
              />
            </div>
          </div>
          
          <button 
            onClick={handleSaveContent}
            className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 shadow-lg transition-transform hover:-translate-y-0.5 font-bold text-lg flex items-center justify-center gap-2"
          >
            <span>💾</span> Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  const renderMemberSchedule = () => {
    const myEvents = events.filter(e => e.attendees.includes(user.id));
    return (
      <div className="space-y-6 animate-fade-in-up pb-10">
        
        {/* Profile / SMS Settings */}
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-roBlue">
          <h3 className="text-xl font-bold mb-4">My Profile Settings</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-gray-700 mb-1">Mobile Number (for SMS Alerts)</label>
                <input 
                  type="tel" 
                  placeholder="+1 (555) 000-0000" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                />
             </div>
             <button 
               onClick={handleSaveProfile}
               className="bg-roBlue text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-900 transition-colors w-full md:w-auto"
             >
               Save Settings
             </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Add your number to receive instant text confirmations when you RSVP to events.</p>
        </div>

        <h2 className="text-2xl font-bold border-b pb-4">{t('dash_tab_schedule')}</h2>
        {myEvents.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-dashed border-gray-300">
             <div className="text-4xl mb-4">📅</div>
             <p className="text-gray-500 text-lg mb-4">{t('dash_no_rsvp')}</p>
             <button onClick={onClose} className="bg-roBlue text-white px-6 py-2 rounded-full font-bold hover:shadow-lg transition-all">{t('dash_browse_events')}</button>
          </div>
        ) : (
          myEvents.map(ev => (
            <div key={ev.id} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-roBlue flex flex-col sm:flex-row justify-between items-start sm:items-center group hover:shadow-md transition-all gap-4">
              <div>
                <h4 className="font-bold text-xl group-hover:text-roBlue transition-colors">{ev.title}</h4>
                <p className="text-gray-600 mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">📅 {ev.date}</span>
                    <span className="flex items-center gap-1">⏰ {ev.time} {ev.endTime ? `- ${ev.endTime}` : ''} EST</span>
                    <span className="flex items-center gap-1">📍 {ev.location}</span>
                </p>
              </div>
              <div className="text-right w-full sm:w-auto mt-2 sm:mt-0">
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200 inline-block">
                    ✓ {t('dash_status_approved')}
                  </span>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };
  
  const renderMemberCommunity = () => (
      <div className="space-y-6 animate-fade-in-up pb-10">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h2 className="text-2xl font-bold mb-4">{t('dash_test_add')}</h2>
             <p className="text-gray-600 mb-6">{t('dash_test_add_desc')}</p>
             
             <form onSubmit={handleSubmitStory} className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Your Story</label>
                    <textarea 
                       className="w-full p-4 border rounded-xl h-40 focus:ring-2 focus:ring-roBlue outline-none"
                       placeholder="Share your favorite memory from the folk club..."
                       value={memberStory}
                       onChange={e => setMemberStory(e.target.value)}
                       required
                    />
                 </div>
                 <button 
                   type="submit" 
                   className="bg-roBlue text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-900 transition-colors shadow-lg"
                 >
                   Submit for Review
                 </button>
             </form>
          </div>
          
          <div className="mt-8">
             <h3 className="font-bold text-lg mb-4 text-gray-500">My Submissions</h3>
             <div className="space-y-4">
                {allTestimonials.filter(t => t.author === user.name).map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                       <p className="text-gray-600 truncate flex-1 pr-4">"{t.text}"</p>
                       <span className={`text-xs font-bold px-2 py-1 rounded ${t.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                           {t.approved ? 'Live' : 'Pending'}
                       </span>
                    </div>
                ))}
                {allTestimonials.filter(t => t.author === user.name).length === 0 && (
                    <p className="text-gray-400 italic">No submissions yet.</p>
                )}
             </div>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 font-sans flex h-screen overflow-hidden">
      
      {/* Mobile Toggle Button (Visible only on mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-[70] flex items-center justify-between px-4 shadow-md">
         <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="text-white p-2 hover:bg-white/10 rounded"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <span className="text-white font-bold text-lg">{t('nav_dashboard')}</span>
         </div>
         <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-sm">
           Exit
         </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[75] md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Permanent on Desktop, Drawer on Mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-[80] w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out flex-shrink-0
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Close Button */}
        <div className="absolute top-2 right-2 md:hidden">
          <button onClick={() => setSidebarOpen(false)} className="text-white p-2">✕</button>
        </div>

        {renderSidebarContent()}
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full pt-16 md:pt-0 bg-slate-50 relative">
        <header className="flex-shrink-0 px-6 py-4 md:py-8 border-b border-gray-200 bg-white/50 backdrop-blur-sm flex justify-between items-center z-10">
             <div>
               <h1 className="text-2xl md:text-3xl font-serif font-bold text-roBlue capitalize">
                 {activeTab === 'users' ? t('dash_tab_users') : 
                  activeTab === 'events' ? t('dash_tab_events') : 
                  activeTab === 'gallery' ? t('dash_tab_gallery') : 
                  activeTab === 'testimonials' ? t('dash_tab_testimonials') : 
                  activeTab === 'content' ? 'Manage Content' : 
                  activeTab === 'schedule' ? t('dash_tab_schedule') : 
                  activeTab === 'community' ? t('dash_tab_community') :
                  t('nav_dashboard')}
               </h1>
               <p className="text-gray-500 text-sm hidden sm:block mt-1">
                 {t('dash_logged_in')} <span className="font-bold text-slate-800">{user.email}</span>
               </p>
             </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'events' && renderAdminEvents()}
            {activeTab === 'gallery' && renderAdminGallery()}
            {activeTab === 'users' && renderAdminUsers()}
            {activeTab === 'testimonials' && renderAdminTestimonials()}
            {activeTab === 'content' && renderAdminContent()}
            {activeTab === 'schedule' && renderMemberSchedule()}
            {activeTab === 'community' && renderMemberCommunity()}
            {activeTab === 'resources' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                {[
                  { icon: '📄', title: 'dash_resource_costume', desc: 'PDF Guide' },
                  { icon: '🎵', title: 'dash_resource_music', desc: 'MP3 Playlist' },
                  { icon: '📹', title: 'dash_resource_video', desc: 'Tutorials' }
                ].map((res, i) => (
                  <div key={i} className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg cursor-pointer border border-gray-100 text-center group transition-all transform hover:-translate-y-1">
                      <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">{res.icon}</div>
                      <h3 className="font-bold text-lg mb-2 text-slate-800">{t(res.title as any)}</h3>
                      <p className="text-gray-500 text-sm">{res.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Reusable Confirm Modal */}
      <ConfirmModal 
        isOpen={modalOpen}
        title={t('dash_delete')}
        message={itemToDelete?.name ? `${t('dash_delete_confirm')} (${itemToDelete.name})` : t('dash_delete_confirm')}
        isDestructive={true}
        isLoading={modalLoading}
        onConfirm={executeDelete}
        onClose={() => { setModalOpen(false); setItemToDelete(null); }}
        previewImage={itemToDelete?.img}
      />
    </div>
  );
};

export default Dashboard;