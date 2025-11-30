
import React, { useState } from 'react';
import { loginUser, registerUser } from '../services/mockService';
import { User } from '../types';
import { useTranslation } from '../services/translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let user;
      if (isLogin) {
        user = await loginUser(email, password);
      } else {
        user = await registerUser(name, email, password);
      }
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError("Incorrect email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered.");
      } else {
        setError(err.message || t('auth_error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    // Keep email if typed, but clear password
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          aria-label="Close modal"
        >
          ×
        </button>
        
        <h2 className="text-2xl md:text-3xl font-bold text-center text-roBlue mb-6 font-serif">
          {isLogin ? t('auth_welcome') : t('auth_join')}
        </h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-bold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-bold text-gray-700 mb-1">
                {t('contact_form_name')}
              </label>
              <input
                id="auth-name"
                type="text"
                placeholder="John Doe"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="block text-sm font-bold text-gray-700 mb-1">
              {t('contact_label_email')}
            </label>
            <input
              id="auth-email"
              type="email"
              placeholder="name@example.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-bold text-gray-700 mb-1">
              {t('auth_password')}
            </label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roBlue outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-roBlue text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition-colors disabled:opacity-70 flex justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {t('auth_processing')}
              </span>
            ) : (isLogin ? t('auth_login_btn') : t('auth_signup_btn'))}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? t('auth_switch_signup') : t('auth_switch_login')}
          <button 
            onClick={toggleMode}
            className="text-roRed font-bold hover:underline ml-1"
          >
            {isLogin ? t('auth_signup_btn') : t('auth_login_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
