import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[110] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all transform animate-fade-in-up border ${
      type === 'success' 
        ? 'bg-white border-green-500 text-green-800' 
        : 'bg-white border-red-500 text-red-800'
    }`}>
      <span className={`flex items-center justify-center w-8 h-8 rounded-full text-lg ${
        type === 'success' ? 'bg-green-100' : 'bg-red-100'
      }`}>
        {type === 'success' ? '✓' : '✕'}
      </span>
      <div>
        <h4 className="font-bold text-sm">{type === 'success' ? 'Success' : 'Error'}</h4>
        <p className="text-sm font-medium opacity-90">{message}</p>
      </div>
      <button 
        onClick={onClose} 
        className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;