
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Event, GalleryItem, Testimonial, PageContent, Resource, Language } from '../types';
import { 
  saveEvent, 
  deleteEvent, 
  addGalleryItem, 
  syncInstagram, 
  getUsers, 
  updateUserRole, 
  getTestimonials,
  addTestimonial,
  toggleTestimonialApproval,
  deleteTestimonial,
  getPageContent,
  updatePageContent,
  deleteGalleryItem,
  deleteUser,
  toggleGalleryApproval,
  getResources,
  addResource,
  deleteResource
} from '../services/mockService';
import { useTranslation } from '../services/translations';
import { translateText } from '../services/integrations';
import LanguageSwitcher from './LanguageSwitcher';
import Toast from './Toast';
import Avatar from './Avatar';
import ConfirmModal from './ConfirmModal';

// --- CUSTOM HOOK FOR ROBUST TAB MANAGEMENT ---

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

function useDashboardTabs(tabs: TabConfig[], defaultTabId: string) {
  const [activeTabId, setActiveTabId] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return tabs.find(t => t.id === hash)?.id || defaultTabId;
  });

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    window.location.hash = activeTabId;
  }, [activeTabId]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowDown') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowUp') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = tabRefs.current[nextIndex];
    if (nextTab) {
      nextTab.focus();
      setActiveTabId(tabs[nextIndex].id);
    }
  };

  return { activeTabId, setActiveTabId, handleKeyDown, tabRefs };
}

// --- TYPES & PROPS ---

interface DashboardProps {
  user: User;
  events: Event[];
  gallery: GalleryItem[];
  onUpdateData: () => void;
  onClose: () => void;
}

// --- ADMIN DASHBOARD SUB-COMPONENT ---
const AdminDashboard: React.FC<DashboardProps & { activeTabId: string }> = ({ 
  user, events, gallery, onUpdateData, activeTabId 
}) => {
  const { t } = useTranslation();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [descLang, setDescLang] = useState<Language>('en');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive: boolean;
    previewImage?: string;
  } | null>(null);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [pageContent, setPageContent] = useState<PageContent[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  // Forms
  const [editEvent, setEditEvent] = useState<Partial<Event>>({
    title: '', date: '', time: '', endTime: '', location: '', type: 'performance', 
    description: { en: '', ro: '', fr: '' }, image: '', attendees: []
  });
  const [newResource, setNewResource] = useState<Partial<Resource>>({ title: '', description: '', url: '', category: 'document' });
  const [selectedContentId, setSelectedContentId] = useState('');
  const [contentTexts, setContentTexts] = useState({ en: '', ro: '', fr: '' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const refreshData = async () => {
    getUsers().then(setAllUsers).catch(() => console.warn("Users load failed"));
    getTestimonials().then(setTestimonials).catch(() => console.warn("Testimonials load failed"));
    getPageContent().then(setPageContent).catch(() => console.warn("Content load failed"));
    getResources().then(setResources).catch(() => console.warn("Resources load failed"));
    onUpdateData();
  };

  useEffect(() => {
    refreshData();
  }, [activeTabId]);

  const triggerDelete = (title: string, message: string, onConfirm: () => Promise<void>, previewImage?: string) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
          showToast(t('dash_content_saved'));
          refreshData();
        } catch (err) {
          showToast("Deletion failed", "error");
        } finally {
          setConfirmModal(null);
        }
      },
      isDestructive: true,
      previewImage
    });
  };

  const handleAutoTranslate = async (type: 'event' | 'content') => {
    const source = type === 'event' ? (editEvent.description as any)[descLang] : contentTexts[descLang];
    if (!source) return showToast("Enter source text first", "error");
    setLoading(true);
    try {
      const targets: Language[] = (['en', 'ro', 'fr'] as Language[]).filter(l => l !== descLang);
      const results: any = { [descLang]: source };
      for (const l of targets) {
        results[l] = await translateText(source, l, descLang);
      }
      if (type === 'event') setEditEvent({ ...editEvent, description: results });
      else setContentTexts(results);
      showToast("Auto-translation complete!");
    } catch (e) { showToast("Translation failed", "error"); }
    finally { setLoading(false); }
  };

  const onSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveEvent(editEvent as Event);
      showToast("Event saved!");
      onUpdateData();
      setEditEvent({ title: '', date: '', time: '', endTime: '', location: '', type: 'performance', description: { en: '', ro: '', fr: '' }, image: '', attendees: [] });
    } catch (e) { showToast("Failed to save event", "error"); }
    finally { setLoading(false); }
  };

  const renderEvents = () => (
    <div id="panel-events" role="tabpanel" aria-labelledby="tab-events" className="space-y-8 animate-fade-in-up">
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-roBlue mb-6 border-l-4 border-roBlue pl-4">Add / Edit Event</h3>
        <form onSubmit={onSaveEvent} className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Title</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="e.g. Spring Festival" value={editEvent.title} onChange={e => setEditEvent({...editEvent, title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label><input type="date" className="w-full p-3 bg-slate-50 border rounded-xl" value={editEvent.date} onChange={e => setEditEvent({...editEvent, date: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</label><input type="time" className="w-full p-3 bg-slate-50 border rounded-xl" value={editEvent.time} onChange={e => setEditEvent({...editEvent, time: e.target.value})} /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&nbsp;</label><input type="time" className="w-full p-3 bg-slate-50 border rounded-xl" value={editEvent.endTime} onChange={e => setEditEvent({...editEvent, endTime: e.target.value})} /></div>
              </div>
            </div>
            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="e.g. Main Hall" value={editEvent.location} onChange={e => setEditEvent({...editEvent, location: e.target.value})} /></div>
            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label><select className="w-full p-3 bg-slate-50 border rounded-xl appearance-none" value={editEvent.type} onChange={e => setEditEvent({...editEvent, type: e.target.value as any})}><option value="performance">Performance</option><option value="workshop">Workshop</option><option value="social">Social</option></select></div>
          </div>
          <div className="space-y-4 flex flex-col">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description ({descLang.toUpperCase()})</label>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {['en','ro','fr'].map(l => <button key={l} type="button" onClick={() => setDescLang(l as any)} className={`px-2 py-1 text-[10px] font-black rounded ${descLang === l ? 'bg-roBlue text-white shadow-sm' : 'text-slate-400'}`}>{l.toUpperCase()}</button>)}
                <button type="button" onClick={() => handleAutoTranslate('event')} className="ml-2 text-[10px] font-black text-roBlue flex items-center gap-1">✨ Auto-Translate</button>
              </div>
            </div>
            <textarea className="w-full flex-1 p-3 bg-slate-50 border rounded-xl min-h-[120px]" placeholder={`Event details in ${descLang.toUpperCase()}...`} value={(editEvent.description as any)[descLang]} onChange={e => { const d = {...(editEvent.description as any)}; d[descLang] = e.target.value; setEditEvent({...editEvent, description: d}); }} />
            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Image URL</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="https://..." value={editEvent.image} onChange={e => setEditEvent({...editEvent, image: e.target.value})} /></div>
            <button type="submit" className="w-full bg-roBlue text-white py-4 rounded-xl font-black text-lg hover:bg-slate-900 transition-all">Save</button>
          </div>
        </form>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center"><h3 className="font-black text-slate-800">{events.length} Events</h3></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr><th className="px-6 py-4">Event</th><th className="px-6 py-4">Date</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
          <tbody className="divide-y">{events.map(ev => (<tr key={ev.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4 font-bold">{ev.title}</td><td className="px-6 py-4 text-slate-500">{ev.date}</td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => setEditEvent(ev)} className="p-2 text-roBlue hover:bg-roBlue/5 rounded-lg">✏️</button><button onClick={() => triggerDelete("Delete Event", `Are you sure you want to delete "${ev.title}"?`, () => deleteEvent(ev.id), ev.image)} className="p-2 text-roRed hover:bg-roRed/5 rounded-lg">🗑️</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );

  const renderGallery = () => {
    const pendingItems = gallery.filter(item => !item.approved);
    const approvedItems = gallery.filter(item => item.approved);

    return (
      <div id="panel-gallery" role="tabpanel" aria-labelledby="tab-gallery" className="space-y-8 animate-fade-in-up">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-200">
            <h3 className="text-xl font-black text-slate-800 mb-6">Add Media</h3>
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center gap-4 bg-slate-50 hover:bg-white cursor-pointer transition-all">
                <span className="text-3xl">📁</span><p className="font-black text-roBlue">Click to upload image</p>
              </div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Link to Event</label><select className="w-full p-3 bg-slate-50 border rounded-xl appearance-none"><option>-- None --</option>{events.map(e => <option key={e.id}>{e.title}</option>)}</select></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-roBlue to-purple-600 rounded-2xl p-8 text-white flex flex-col justify-between">
            <div><h3 className="text-xl font-black flex items-center gap-2">📸 Instagram Integration</h3><p className="text-white/70 font-medium mt-2">Sync your latest feed posts.</p></div>
            <button onClick={() => syncInstagram().then(refreshData)} className="w-full bg-white text-roBlue py-4 rounded-xl font-black shadow-lg hover:bg-roYellow transition-all">Sync Now</button>
          </div>
        </div>

        {/* Pending Review Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-black text-slate-800">Pending Review ({pendingItems.length})</h3>
          </div>
          {pendingItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6 bg-slate-50">
              {pendingItems.map(item => (
                <div key={item.id} className="relative aspect-square group bg-white rounded-xl overflow-hidden shadow-sm border">
                  <img src={item.url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-roBlue/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <button 
                      onClick={() => toggleGalleryApproval(item.id).then(() => { refreshData(); showToast("Media Approved!"); })}
                      className="w-full py-2 bg-roYellow text-roBlue font-black text-[10px] rounded-lg uppercase shadow-lg"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => triggerDelete("Deny Media", "Remove this submission?", () => deleteGalleryItem(item.id), item.url)}
                      className="w-full py-2 bg-roRed text-white font-black text-[10px] rounded-lg uppercase shadow-lg"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 italic">No items awaiting review.</div>
          )}
        </div>

        {/* Approved Media Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-black text-slate-800">Approved Media ({approvedItems.length})</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-100">
            {approvedItems.map(item => (
              <div key={item.id} className="relative aspect-square group bg-white">
                <img src={item.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-roBlue/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => triggerDelete("Delete Media", "Delete this item?", () => deleteGalleryItem(item.id), item.url)} className="p-2 bg-roRed text-white rounded-full shadow-lg">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div id="panel-users" role="tabpanel" aria-labelledby="tab-users" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
      <div className="p-6 border-b"><h3 className="text-xl font-black text-slate-800">User Management</h3></div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Role</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y">{allUsers.map(u => (
          <tr key={u.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4"><div className="flex items-center gap-3"><Avatar name={u.name} src={u.avatar} className="w-8 h-8 rounded-full" /><span className="font-bold">{u.name}</span></div></td><td className="px-6 py-4 text-slate-500">{u.email}</td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.role === 'admin' ? 'bg-roRed/10 text-roRed' : 'bg-roBlue/10 text-roBlue'}`}>{u.role}</span></td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => updateUserRole(u.id, u.role === 'admin' ? 'member' : 'admin').then(refreshData)} className="text-xs font-bold text-roBlue">{u.role === 'admin' ? 'Demote' : 'Promote'}</button>{u.id !== user.id && <button onClick={() => triggerDelete("Delete User", `Delete user "${u.name}"?`, () => deleteUser(u.id))} className="text-xs font-bold text-roRed">Delete</button>}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );

  const renderContent = () => (
    <div id="panel-content" role="tabpanel" aria-labelledby="tab-content" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in-up">
      <h3 className="text-xl font-black text-slate-800 mb-6">Page Content Editor</h3>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Section</label><div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto border rounded-xl p-2 bg-slate-50">{pageContent.map(c => (<button key={c.id} onClick={() => {setSelectedContentId(c.id); setContentTexts(c.text);}} className={`text-left p-3 rounded-lg text-sm font-bold transition-all ${selectedContentId === c.id ? 'bg-roBlue text-white' : 'hover:bg-white text-slate-600'}`}>{c.id.replace('_', ' ')}</button>))}</div></div>
        <div className="lg:col-span-2 space-y-6">
          {selectedContentId ? (<div className="space-y-6"><div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Edit Translations</label><button onClick={() => handleAutoTranslate('content')} className="text-[10px] font-black text-roBlue flex items-center gap-1">✨ Auto-Translate From {descLang.toUpperCase()}</button></div><div className="space-y-4">{['en','ro','fr'].map(l => (<div key={l}><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{l.toUpperCase()}</label><textarea className="w-full p-3 bg-slate-50 border rounded-xl min-h-[80px]" value={(contentTexts as any)[l]} onChange={e => setContentTexts({...contentTexts, [l]:e.target.value})} onFocus={() => setDescLang(l as any)} /></div>))}</div><button onClick={() => updatePageContent(selectedContentId, contentTexts).then(() => {showToast("Updated!"); refreshData();})} className="w-full bg-roBlue text-white py-4 rounded-xl font-black shadow-lg">Save Changes</button></div>) : (<div className="h-full flex items-center justify-center text-slate-300 italic">Select a section to begin.</div>)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="px-10 py-8 border-b bg-white flex justify-between items-center">
        <h1 className="text-3xl font-black text-roBlue tracking-tight capitalize">{activeTabId.replace('_', ' ')}</h1>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-black text-slate-400 uppercase">Administrator</p>
          <p className="text-sm font-bold text-slate-800">{user.email}</p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-12 no-scrollbar">
        <div className="max-w-6xl mx-auto pb-20">
          {activeTabId === 'events' && renderEvents()}
          {activeTabId === 'gallery' && renderGallery()}
          {activeTabId === 'users' && renderUsers()}
          {activeTabId === 'testimonials' && (
            <div id="panel-testimonials" role="tabpanel" aria-labelledby="tab-testimonials" className="grid md:grid-cols-2 gap-8 animate-fade-in-up">
              {testimonials.map(t => (
                <div key={t.id} className="p-6 bg-white border rounded-2xl shadow-sm flex flex-col gap-4">
                  <p className="text-sm italic text-slate-600">"{t.text}"</p>
                  <div className="flex justify-between items-center mt-auto">
                    <div className="flex items-center gap-3"><Avatar name={t.author} className="w-6 h-6 rounded-full" /><span className="text-xs font-bold">{t.author}</span></div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleTestimonialApproval(t.id).then(refreshData)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${t.approved ? 'bg-slate-200' : 'bg-roBlue text-white'}`}>{t.approved ? 'Hide' : 'Approve'}</button>
                      <button onClick={() => triggerDelete("Delete Testimonial", "Delete this story?", () => deleteTestimonial(t.id))} className="p-2 text-roRed hover:bg-roRed/5 rounded-lg">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTabId === 'resources' && (
            <div id="panel-resources" role="tabpanel" aria-labelledby="tab-resources" className="space-y-8 animate-fade-in-up">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6">Add Resource</h3>
                <form onSubmit={(e) => {e.preventDefault(); addResource(newResource as Resource).then(() => {refreshData(); setNewResource({title:'', description:'', url:'', category:'document'}); showToast("Added!");})}} className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Title" value={newResource.title} onChange={e => setNewResource({...newResource, title:e.target.value})} />
                    <textarea className="w-full p-3 bg-slate-50 border rounded-xl h-20" placeholder="Description" value={newResource.description} onChange={e => setNewResource({...newResource, description:e.target.value})} />
                    <select className="w-full p-3 bg-slate-50 border rounded-xl" value={newResource.category} onChange={e => setNewResource({...newResource, category:e.target.value as any})}><option value="music">Music</option><option value="choreography">Choreography</option><option value="costume">Costume</option><option value="document">Documents</option></select>
                  </div>
                  <div className="space-y-4 flex flex-col">
                    <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="URL (https://...)" value={newResource.url} onChange={e => setNewResource({...newResource, url:e.target.value})} />
                    <button type="submit" className="w-full bg-roBlue text-white py-4 rounded-xl font-black mt-auto">Save Resource</button>
                  </div>
                </form>
              </div>
              <div className="grid md:grid-cols-3 gap-6">{resources.map(r => (<div key={r.id} className="p-5 bg-white border rounded-2xl relative group"><button onClick={() => triggerDelete("Delete Resource", `Delete "${r.title}"?`, () => deleteResource(r.id))} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button><span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-full uppercase border text-slate-400 mb-2 inline-block">{r.category}</span><h4 className="font-black text-slate-800 line-clamp-1">{r.title}</h4><a href={r.url} target="_blank" className="text-roBlue text-xs font-black uppercase tracking-widest hover:underline mt-4 inline-block">Open Link →</a></div>))}</div>
            </div>
          )}
          {activeTabId === 'content' && renderContent()}
        </div>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  );
};

// --- MEMBER DASHBOARD SUB-COMPONENT ---
const MemberDashboard: React.FC<DashboardProps & { activeTabId: string }> = ({ 
  user, events, activeTabId, onUpdateData 
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [memberStory, setMemberStory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { getResources().then(setResources); }, [activeTabId]);

  const myEvents = events.filter(e => e.attendees.includes(user.id));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="px-10 py-8 border-b bg-white flex justify-between items-center">
        <h1 className="text-3xl font-black text-roBlue tracking-tight capitalize">{activeTabId.replace('_', ' ')}</h1>
        <p className="text-slate-400 text-xs font-bold hidden sm:block">Member: <span className="text-slate-800">{user.email}</span></p>
      </header>
      <main className="flex-1 overflow-y-auto p-12 no-scrollbar">
        <div className="max-w-6xl mx-auto pb-20">
          {activeTabId === 'schedule' && (
            <div id="panel-schedule" role="tabpanel" aria-labelledby="tab-schedule" className="space-y-8 animate-fade-in-up">
              <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-12 items-center">
                <Avatar src={user.avatar} name={user.name} className="w-40 h-40 rounded-full border-4 border-roYellow shadow-2xl" />
                <div className="flex-1 w-full space-y-4">
                  <h3 className="text-2xl font-black text-roBlue">Profile</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Email</p>
                      <p className="font-bold">{user.email}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Role</p>
                      <p className="font-bold capitalize">{user.role}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div className="p-8 border-b bg-slate-50"><h3 className="font-black text-xl">My RSVP'd Events</h3></div>
                <div className="divide-y">{myEvents.length > 0 ? myEvents.map(e => (<div key={e.id} className="p-6 flex justify-between items-center"><div className="flex gap-4 items-center"><div className="text-center p-2 bg-roBlue/5 rounded-xl min-w-[60px]"><p className="text-[10px] font-black text-roRed uppercase">{new Date(e.date).toLocaleString('default', {month:'short'})}</p><p className="text-xl font-black">{new Date(e.date).getDate()}</p></div><h4 className="font-bold text-lg">{e.title}</h4></div><span className="text-xs text-slate-400">📍 {e.location}</span></div>)) : <div className="p-20 text-center text-slate-400 italic">You haven't RSVP'd to any events.</div>}</div>
              </div>
            </div>
          )}
          {activeTabId === 'resources' && (
            <div id="panel-resources" role="tabpanel" aria-labelledby="tab-resources" className="p-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
              {resources.map(r => (<div key={r.id} className="p-6 bg-white border rounded-2xl shadow-sm flex flex-col"><span className="text-[9px] font-black bg-slate-50 px-2 py-0.5 rounded-full uppercase border text-slate-400 mb-2 inline-block w-fit">{r.category}</span><h4 className="font-bold mb-2">{r.title}</h4><p className="text-sm text-slate-500 mb-6 flex-1">{r.description}</p><a href={r.url} target="_blank" className="w-full text-center py-3 bg-roBlue text-white rounded-xl font-black text-xs uppercase tracking-widest">Open Resource</a></div>))}
            </div>
          )}
          {activeTabId === 'community' && (
            <div id="panel-community" role="tabpanel" aria-labelledby="tab-community" className="grid lg:grid-cols-2 gap-8 animate-fade-in-up">
              <div className="bg-white p-8 rounded-3xl border shadow-sm">
                <h3 className="text-xl font-black text-roBlue mb-6 flex items-center gap-2"><span>✍️</span> Submit Your Story</h3>
                <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-40 outline-none focus:ring-2 focus:ring-roBlue/10 transition-all mb-6" placeholder="Tell us about your experience..." value={memberStory} onChange={e => setMemberStory(e.target.value)} />
                <button onClick={() => {setLoading(true); addTestimonial(user.name, 'Member', memberStory).then(() => {setLoading(false); setMemberStory(''); onUpdateData();})}} className="w-full bg-roRed text-white py-4 rounded-xl font-black shadow-lg">Submit for Approval</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<DashboardProps> = (props) => {
  const { user, onClose } = props;
  const isAdmin = user.role === 'admin';
  
  const tabs = useMemo<TabConfig[]>(() => {
    return isAdmin ? [
      { id: 'events', label: 'Manage Events', icon: '📅' },
      { id: 'gallery', label: 'Manage Gallery', icon: '🖼️' },
      { id: 'users', label: 'Manage Users', icon: '👥' },
      { id: 'testimonials', label: 'Testimonials', icon: '💬' },
      { id: 'resources', label: 'Manage Resources', icon: '📁' },
      { id: 'content', label: 'Page Content', icon: '✏️' },
    ] : [
      { id: 'schedule', label: 'My Schedule', icon: '📆' },
      { id: 'resources', label: 'Resources', icon: '📁' },
      { id: 'community', label: 'My Stories', icon: '✍️' },
    ];
  }, [isAdmin]);

  const { activeTabId, setActiveTabId, handleKeyDown, tabRefs } = useDashboardTabs(tabs, isAdmin ? 'events' : 'schedule');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 font-sans flex h-screen overflow-hidden animate-fade-in">
      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-[80] w-72 bg-roBlue text-white shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-8 flex flex-col items-center border-b border-white/5">
           <Avatar name={user.name} src={user.avatar} className="w-20 h-20 rounded-full border-4 border-roYellow shadow-2xl mb-4" />
           <h3 className="font-black text-lg truncate w-full text-center">{user.name}</h3>
           <span className="text-[10px] font-black uppercase tracking-widest bg-roRed/20 text-roRed px-3 py-1 rounded-full mt-2">{user.role}</span>
        </div>

        <nav role="tablist" aria-orientation="vertical" className="p-6 space-y-2 overflow-y-auto h-[calc(100%-240px)] no-scrollbar">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              ref={el => tabRefs.current[idx] = el}
              aria-selected={activeTabId === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTabId === tab.id ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onClick={() => { setActiveTabId(tab.id); setSidebarOpen(false); }}
              className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 transition-all font-bold text-sm outline-none focus:ring-2 focus:ring-roYellow/50 ${
                activeTabId === tab.id 
                  ? 'bg-roYellow text-roBlue shadow-lg scale-[1.02]' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-lg" aria-hidden="true">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-6 border-t border-white/5 space-y-4 bg-roBlue">
           <LanguageSwitcher className="justify-center" />
           <button 
             onClick={onClose} 
             className="w-full text-slate-400 hover:text-white hover:bg-roRed/20 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest border border-white/5"
           >
             Exit Dashboard
           </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-[75] md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Mobile Header Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-roBlue z-[70] flex items-center justify-between px-6 shadow-xl">
        <button onClick={() => setSidebarOpen(true)} className="text-white p-2" aria-label="Open navigation menu">☰</button>
        <span className="text-white font-black">{isAdmin ? 'Admin Portal' : 'Member Portal'}</span>
        <button onClick={onClose} className="text-roYellow text-xs font-black uppercase">Exit</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {isAdmin ? (
          <AdminDashboard {...props} activeTabId={activeTabId} />
        ) : (
          <MemberDashboard {...props} activeTabId={activeTabId} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
