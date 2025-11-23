import React from 'react';
import { GalleryItem } from '../types';
import { useTranslation } from '../services/translations';

interface GalleryProps {
  items: GalleryItem[];
}

const Gallery: React.FC<GalleryProps> = ({ items }) => {
  const { t } = useTranslation();

  return (
    <section id="gallery" className="py-16 md:py-20 bg-white w-full max-w-[100vw] overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-roBlue mb-2">{t('gallery_title')}</h2>
          <p className="text-gray-500">{t('gallery_subtitle')} @RomanianFolkClub</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative group aspect-square overflow-hidden bg-gray-100 rounded-lg cursor-pointer">
              <img 
                src={item.url} 
                alt={item.caption} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Instagram-like Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-4 text-center">
                <p className="font-medium text-sm line-clamp-3 hidden sm:block">{item.caption}</p>
                {item.source === 'instagram' && (
                  <span className="mt-0 sm:mt-2 text-[10px] sm:text-xs uppercase tracking-widest text-roYellow font-bold">
                    📷 Instagram
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
