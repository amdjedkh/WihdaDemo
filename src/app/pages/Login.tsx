import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import wihdaLogo from "../../assets/wihda_logo.png";
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import { API_BASE, setTokens } from '../lib/api';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, refreshProfile } = useAuth();
  const { language } = useApp();
  const browserListenerRef = useRef<{ remove: () => void } | null>(null);

  // Clean up browser listener on unmount
  useEffect(() => {
    return () => { browserListenerRef.current?.remove(); };
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);

    if (!Capacitor.isNativePlatform()) {
      // Web: plain redirect — backend handles everything, returns tokens in URL
      window.location.href = `${API_BASE}/v1/auth/google`;
      return;
    }

    // Native (iOS / Android): open SFSafariViewController / Chrome Custom Tab.
    // Google allows OAuth in these — NOT in plain WebViews.
    // Flow: open browser → user signs in → backend stores tokens in KV →
    //       app polls session endpoint → Browser.close() → navigate to home.
    try {
      const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      let done = false;

      // If user manually closes the browser before OAuth completes
      browserListenerRef.current = await Browser.addListener('browserFinished', () => {
        browserListenerRef.current?.remove();
        browserListenerRef.current = null;
        if (!done) setGoogleLoading(false);
      });

      await Browser.open({
        url: `${API_BASE}/v1/auth/google?session_id=${sessionId}`,
        presentationStyle: 'popover',
      });

      // Poll for tokens while the browser is open (every 800 ms, up to 40 s)
      for (let i = 0; i < 50 && !done; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 800));
        try {
          const res  = await fetch(`${API_BASE}/v1/auth/google/session?id=${sessionId}`);
          const data = await res.json() as any;
          if (data?.success && data?.data?.access_token) {
            done = true;
            browserListenerRef.current?.remove();
            browserListenerRef.current = null;
            await Browser.close();
            setTokens(data.data.access_token, data.data.refresh_token || '');
            navigate('/home');
            refreshProfile().catch(() => {});
            return;
          }
        } catch { /* network hiccup — keep polling */ }
      }

      if (!done) setGoogleLoading(false);
    } catch {
      setGoogleLoading(false);
    }
  }, [navigate, refreshProfile]);

  const justVerified = (location.state as any)?.verified;

  useEffect(() => {
    const state = location.state as any;
    if (state?.email) setEmail(state.email);
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      if (result.code === 'CONTACT_VERIFICATION_REQUIRED') {
        navigate('/verify-otp', {
          state: { contactChannel: result.contactChannel || 'email', email },
        });
        return;
      }
      setError(result.error);
    } else {
      navigate('/home');
    }
  };

  return (
    <MobileContainer>
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        {/* Top gradient area */}
        <div className="bg-gradient-to-b from-[#f0faf4] to-white dark:from-gray-800 dark:to-gray-900 pt-16 pb-8 px-8 flex flex-col items-center relative">
          <button
            onClick={() => navigate('/admin-login')}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/90 dark:bg-gray-700 text-white text-[11px] font-semibold"
          >
            <ShieldCheck className="size-3.5" />
            Admin
          </button>
          <img src={wihdaLogo} alt="Wihda" className="w-[160px] object-contain mb-4" />
          <p className="text-gray-400 text-[13px] tracking-widest">CONNECTING NEIGHBORS</p>
        </div>

        {/* Form */}
        <div className="flex-1 px-6 pt-4">
          <h2 className="text-[24px] font-bold text-gray-900 dark:text-white mb-1 font-[Poppins,sans-serif]">{t(language, 'welcomeBack')}</h2>
          <p className="text-[14px] text-gray-400 mb-8">{t(language, 'signInToAccount')}</p>

          {justVerified && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-[13px] px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              {t(language, 'emailVerifiedMsg')}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder={t(language, 'passwordLabel')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl pl-12 pr-12 py-3.5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[13px] text-[#14ae5c] font-medium"
              >
                {t(language, 'forgotPassword')}
              </button>
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
                  {t(language, 'signIn')} <ArrowRight className="size-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            <span className="text-[12px] text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {googleLoading ? (
              <div className="size-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                </svg>
                {t(language, 'continueWithGoogle')}
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/home')}
            className="w-full text-gray-400 py-2 text-[13px] active:scale-[0.98] transition-all mt-2"
          >
            {t(language, 'continueAsGuest')}
          </button>
        </div>

        {/* Bottom signup link */}
        <div className="px-6 pb-10 pt-4 text-center">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            {t(language, 'noAccount')}{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-[#14ae5c] font-semibold"
            >
              {t(language, 'signUp')}
            </button>
          </p>
        </div>
      </div>
    </MobileContainer>
  );
}
