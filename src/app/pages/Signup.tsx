import { useState } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import imgWihdaTextLogo1 from "figma:asset/ee118e5efe643d9ee6880fd61bb3d74d5253e1aa.png";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { language } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);

    const result = await signUp(email, password, name);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate('/verify-otp', {
        state: {
          contactChannel: result.contactChannel || 'email',
          email,
        },
      });
    }
  };

  return (
    <MobileContainer>
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)] bg-white dark:bg-gray-900">
          <div className="flex items-center h-14">
            <button onClick={() => navigate('/login')} className="text-gray-800 dark:text-gray-200">
              <ArrowLeft className="size-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-10">
          <div className="flex items-center gap-3 mb-2">
            <img src={imgWihdaTextLogo1} alt="Wihda" className="w-[100px] object-contain" />
          </div>
          <h2 className="text-[24px] font-bold text-gray-900 dark:text-white mb-1 font-[Poppins,sans-serif]">{t(language, 'createAccount')}</h2>
          <p className="text-[14px] text-gray-400 mb-6">{t(language, 'joinCommunity')}</p>

          {/* Welcome bonus callout */}
          <div className="bg-gradient-to-r from-[#fff9e6] to-[#fef3cd] border border-[#f0a326]/20 rounded-xl p-3 mb-6 flex items-center gap-3">
            <div className="bg-[#f0a326]/10 rounded-full p-2">
              <Gift className="size-5 text-[#f0a326]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">{t(language, 'welcomeBonus')}</p>
              <p className="text-[11px] text-gray-500">{t(language, 'welcomeBonusDesc')}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder={t(language, 'fullName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors"
                autoComplete="name"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="email"
                placeholder={t(language, 'emailAddress')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors"
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t(language, 'passwordMin')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl pl-12 pr-12 py-3.5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t(language, 'confirmPasswordLabel')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#14ae5c] text-white py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t(language, 'createAccount')} <ArrowRight className="size-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-[12px] text-gray-400 text-center mt-4 leading-relaxed">
            {t(language, 'termsAgreement')}
          </p>

          <div className="text-center mt-6">
            <p className="text-[14px] text-gray-500 dark:text-gray-400">
              {t(language, 'alreadyHaveAccount')}{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-[#14ae5c] font-semibold"
              >
                {t(language, 'signIn')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </MobileContainer>
  );
}
