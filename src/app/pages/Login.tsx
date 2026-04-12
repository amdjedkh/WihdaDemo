import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import wihdaLogo from "../../assets/wihda_logo.png";
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import { API_BASE, setTokens } from '../lib/api';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, refreshProfile } = useAuth();
  const { language } = useApp();
  const browserListenerRef  = useRef<{ remove: () => void } | null>(null);
  const urlOpenListenerRef  = useRef<{ remove: () => void } | null>(null);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      browserListenerRef.current?.remove();
      urlOpenListenerRef.current?.remove();
    };
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);

    if (!Capacitor.isNativePlatform()) {
      // Web: plain redirect — backend handles everything, returns tokens in URL
      window.location.href = `${API_BASE}/v1/auth/google`;
      return;
    }

    // Native (iOS / Android): open SFSafariViewController / Chrome Custom Tab.
    // Flow:
    //   1. App opens SFSafariViewController
    //   2. User signs in with Google
    //   3. Backend redirects to com.wihda.app://auth/callback?access_token=...
    //   4. iOS opens the app via URL scheme → appUrlOpen fires
    //   5. App extracts tokens, calls Browser.close() to dismiss the blank SVC, navigates home
    try {
      const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      let done = false;

      const cleanup = () => {
        browserListenerRef.current?.remove();
        browserListenerRef.current = null;
        urlOpenListenerRef.current?.remove();
        urlOpenListenerRef.current = null;
      };

      // PRIMARY: iOS opens app via URL scheme after Google OAuth completes.
      // AppDelegate.swift already dismissed SFSafariViewController natively at this point.
      urlOpenListenerRef.current = await App.addListener('appUrlOpen', (event: any) => {
        const url = event.url as string;
        if (!url.startsWith('com.wihda.app://auth/callback')) return;
        const params = new URL(url.replace('com.wihda.app://', 'https://x.com/'));
        const accessToken  = params.searchParams.get('access_token');
        const refreshToken = params.searchParams.get('refresh_token') || '';
        if (!accessToken) return;
        done = true;
        cleanup();
        setTokens(accessToken, refreshToken);
        navigate('/home');
        refreshProfile().catch(() => {});
        // Close the in-app browser — delay to let UIKit finish the URL-scheme transition
        setTimeout(() => Browser.close().catch(() => {}), 400);
      });

      // FALLBACK: user manually closed the browser without finishing
      browserListenerRef.current = await Browser.addListener('browserFinished', () => {
        cleanup();
        if (!done) setGoogleLoading(false);
      });

      await Browser.open({
        url: `${API_BASE}/v1/auth/google?session_id=${sessionId}`,
        presentationStyle: 'fullscreen',
      });
    } catch {
      setGoogleLoading(false);
    }
  }, [navigate, refreshProfile]);

  const handleAppleLogin = useCallback(async () => {
    setAppleLoading(true);

    if (!Capacitor.isNativePlatform()) {
      // Web: redirect to backend Apple OAuth (same pattern as Google)
      window.location.href = `${API_BASE}/v1/auth/apple`;
      return;
    }

    // iOS native: use the Capacitor plugin — shows the native Apple sheet
    try {
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      const result = await SignInWithApple.authorize({
        clientId: 'com.wihda.app',
        redirectURI: `${API_BASE}/v1/auth/apple/native`,
        scopes: 'email name',
        state: '',
        nonce: '',
      });

      const { identityToken, givenName, familyName } = result.response;
      if (!identityToken) throw new Error('No identity token');

      const res = await fetch(`${API_BASE}/v1/auth/apple/native`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_token: identityToken,
          given_name: givenName || '',
          family_name: familyName || '',
        }),
      });
      const data = await res.json() as any;
      if (!res.ok || !data?.data?.access_token) {
        throw new Error(data?.error?.message || 'Apple sign-in failed');
      }
      setTokens(data.data.access_token, data.data.refresh_token || '');
      await refreshProfile();
      navigate('/home');
    } catch (err: any) {
      // User cancelled the sheet (error 1001) — don't show an error
      if (!(err?.message as string)?.includes('AuthorizationError error 1001')) {
        setError('Apple sign-in failed. Please try again.');
      }
    } finally {
      setAppleLoading(false);
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
    <div className="h-screen overflow-y-auto bg-white dark:bg-gray-900">
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
        <div className="px-6 pt-4">
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

          {/* Apple Sign In — hidden on Android (not supported by Apple) */}
          {Capacitor.getPlatform() !== 'android' && (
            <button
              onClick={handleAppleLogin}
              disabled={appleLoading}
              className="w-full bg-black text-white py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {appleLoading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {/* Apple logo */}
                  <svg width="17" height="20" viewBox="0 0 814 1000" fill="white">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-36.8-155.5-127.4C46 790.9 0 663.8 0 541.2c0-222.1 149.6-340.1 298-340.1 69 0 138.3 38.6 184.1 38.6 44.6 0 122.6-41.8 199.4-41.8 32.7 0 108.2 2.6 165.3 77.8zm-207.1-84.1c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                  </svg>
                  {t(language, 'continueWithApple')}
                </>
              )}
            </button>
          )}

          <button
            onClick={() => navigate('/home')}
            className="w-full text-gray-400 py-2 text-[13px] active:scale-[0.98] transition-all mt-2"
          >
            {t(language, 'continueAsGuest')}
          </button>

          {/* Bottom signup link */}
          <div className="pb-10 pt-4 text-center">
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
    </div>
  );
}
