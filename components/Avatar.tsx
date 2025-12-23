
import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  color?: string; // Explicit color override
  initials?: string; // Explicit initials override
  className?: string;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, color, initials: customInitials, className = '', onClick }) => {
  // Generate consistent background color from name (fallback)
  const getBackgroundColor = (str: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  // Get initials (max 2 chars)
  const displayInitials = customInitials
    ? customInitials.substring(0, 2).toUpperCase()
    : name
        ? name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : '?';

  const baseClasses = `flex items-center justify-center font-bold text-white overflow-hidden uppercase select-none ${className}`;

  if (src && src.trim() !== '') {
    return (
      <img
        src={src}
        alt={name}
        className={`${baseClasses} object-cover`}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={`${baseClasses} ${color || getBackgroundColor(name)}`}
      style={color && color.startsWith('#') ? { backgroundColor: color } : {}}
      onClick={onClick}
      title={name}
    >
      {displayInitials}
    </div>
  );
};

export default Avatar;
