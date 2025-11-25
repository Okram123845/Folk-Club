
import React, { useState } from 'react';
import { Event, GalleryItem, User } from '../types';
import { useTranslation } from '../services/translations';
import { addGalleryItem } from '../services/mockService';
import Toast from './Toast';

interface EventDetailsProps {
  event: Event;
  galleryItems: GalleryItem[];
  user: User | null;
  onBack: () => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({ event, galleryItems, user, onBack }) => {
  const { t, language } = useTranslation();
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [videoUrl, setVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter gallery items for this event AND ensure they are approved (or legacy undefined)
  const eventMedia = galleryItems.filter(item => 
    item.eventId === event.id && (item.approved === true || item.approved === undefined)
  );

  const description = typeof event.description === 'object' 
    ? (event.description as any)[language] || (event.description as any)['en']
    : event.description;

  const eventTypeKey = `event_type_${event.type}`;
  const displayType = t(eventTypeKey as any) || event.type;

  const handleMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsUploading(true);
    try {
        if (mediaType === 'video') {
             if (!videoUrl) return;
             await addGalleryItem({
                 url: videoUrl,
                 caption: `Shared by ${user.name}`,
                 source: 'upload',
                 type: 'video',
                 eventId: event.id,
                 approved: user.role === 'admin',
                 uploadedBy: user.id
             });
             setVideoUrl('');
        }
        setToast({ message: t('events_contrib_success'), type: 'success' });
    } catch (err) {
        setToast({ message: 'Upload failed', type: 'error' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          await addGalleryItem({
            url: base64,
            caption: `Shared by ${user.name}`,
            source: 'upload',
            type: 'image',
            eventId: event.id,
            approved: user.role === 'admin',
            uploadedBy: user.id
          });
          setToast({ message: t('events_contrib_success'), type: 'success' });
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setToast({ message: 'Upload failed', type: 'error' });
        setIsUploading(false);
      } finally {
        // We set uploading false in onloadend or manually if async logic was more complex
        setTimeout(() => setIsUploading(false), 1000);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-6">
      <div className="container mx-auto max-w-5xl">
        <button 
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-gray-600 hover:text-roBlue font-bold transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> {t('dash_back')}
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-12">
          <div className="relative h-64 md:h-96">
            <img 
              src={event.image || 'https://picsum.photos/1200/600'} 
              alt={event.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white w-full">
               <div className="flex flex-wrap gap-3 mb-3">
                 <span className="bg-roYellow text-roBlue px-3 py-1 rounded-full font-bold text-sm uppercase tracking-wide">
                    {displayType}
                 </span>
                 <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full font-medium text-sm border border-white/30">
                    {new Date(event.date).toLocaleDateString()}
                 </span>
               </div>
               <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight">{event.title}</h1>
            </div>
          </div>

          <div className="p-6 md:p-10 grid md:grid-cols-3 gap-10">
            <div className="md:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-roBlue mb-4">{t('events_details_title')}</h2>
                <div className="prose prose-lg text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {description}
                </div>
              </div>

              {/* Media Gallery Section */}
              <div>
                 <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>🎬</span> {t('events_media_gallery')}
                 </h3>
                 
                 {eventMedia.length > 0 ? (
                   <div className="grid sm:grid-cols-2 gap-4 mb-8">
                     {eventMedia.map(item => (
                       <div key={item.id} className="rounded-xl overflow-hidden shadow-sm bg-gray-100 aspect-video relative group">
                          {item.type === 'video' ? (
                            <iframe 
                              src={item.url.replace('watch?v=', 'embed/')} 
                              title={item.caption} 
                              className="w-full h-full" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <img src={item.url} alt={item.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          )}
                          {item.caption && item.type !== 'video' && (
                             <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                               {item.caption}
                             </div>
                          )}
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500 mb-8">
                      {t('events_no_media')}
                   </div>
                 )}

                 {/* Contribution Section */}
                 <div className="bg-slate-50 border border-roBlue/20 rounded-xl p-6">
                    <h4 className="font-bold text-lg text-roBlue mb-2">{t('events_contrib_title')}</h4>
                    <p className="text-gray-600 text-sm mb-4">{t('events_contrib_text')}</p>
                    
                    {user ? (
                        <div className="space-y-4">
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={mediaType === 'image'} onChange={() => setMediaType('image')} className="text-roBlue" />
                                    <span className="text-sm font-bold">Image</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={mediaType === 'video'} onChange={() => setMediaType('video')} className="text-roBlue" />
                                    <span className="text-sm font-bold">Video URL</span>
                                </label>
                            </div>
                            
                            {mediaType === 'image' ? (
                                <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-white transition-colors">
                                    <span className="text-roBlue font-bold">{isUploading ? t('auth_processing') : `📁 ${t('events_contrib_upload')}`}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                </label>
                            ) : (
                                <div className="flex gap-2">
                                    <input type="text" placeholder="YouTube URL" className="flex-1 p-2 border rounded-lg" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                                    <button onClick={handleMediaSubmit} disabled={isUploading || !videoUrl} className="bg-roBlue text-white px-4 rounded-lg font-bold hover:bg-blue-900 disabled:opacity-50">
                                        {isUploading ? '...' : 'Add'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white p-3 rounded-lg border border-gray-200 text-center text-sm text-gray-500 italic">
                            {t('events_contrib_login')}
                        </div>
                    )}
                 </div>
              </div>
            </div>

            <div className="md:col-span-1">
               <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 sticky top-24">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Event Info</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                       <div className="w-8 h-8 rounded-full bg-roBlue/10 flex items-center justify-center text-roBlue">📅</div>
                       <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">Date</p>
                          <p className="font-medium">{new Date(event.date).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="w-8 h-8 rounded-full bg-roBlue/10 flex items-center justify-center text-roBlue">⏰</div>
                       <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">Time</p>
                          <p className="font-medium">{event.time} {event.endTime ? `- ${event.endTime}` : ''} EST</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="w-8 h-8 rounded-full bg-roBlue/10 flex items-center justify-center text-roBlue">📍</div>
                       <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">Location</p>
                          <p className="font-medium">{event.location}</p>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default EventDetails;
