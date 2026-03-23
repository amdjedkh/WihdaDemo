import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import { useAuth } from '../context/AuthContext';
import { setTokens } from '../lib/api';
import wihdaLogo from '../../assets/wihda_logo.png';

/**
 * Handles Google OAuth redirects from the backend.
 *
 * Web flow   → ?access_token=...&refresh_token=...
 *              Store tokens and navigate home.
 *
 * Native flow → ?native=1&success=1
 *              Show spinner — the main app is polling the session endpoint
 *              and will call Browser.close() once tokens are ready.
 *
 * Error       → ?error=...
 *              Show message and redirect to login.
 */
export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState('');

  const native  = searchParams.get('native');
  const success = searchParams.get('success');

  useEffect(() => {
    // Native flow — nothing to do here, main app handles it via polling
    if (native === '1') return;

    const accessToken  = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const errorParam   = searchParams.get('error');

    if (errorParam) {
      setError('Google sign-in failed. Please try again.');
      setTimeout(() => navigate('/login'), 2500);
      return;
    }

    if (accessToken) {
      setTokens(accessToken, refreshToken || '');
      window.location.replace('/home');
      return;
    }

    navigate('/login');
  }, [searchParams, navigate, refreshProfile, native]);

  // ── Native success screen ─────────────────────────────────────────────────
  // Shown inside SFSafariViewController / Chrome Custom Tab.
  // Must use min-h-screen (not MobileContainer) — Capacitor is not running here.
  if (native === '1') {
    if (success !== '1') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4 px-8 text-center">
          <p className="text-red-500 text-[14px]">Sign-in failed. Please close this page and try again.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-6 px-8 text-center">
        <img src={wihdaLogo} alt="Wihda" className="w-[100px] object-contain" />
        <div className="size-8 border-2 border-gray-200 border-t-[#14ae5c] rounded-full animate-spin" />
        <p className="text-gray-500 text-[14px]">Returning to Wihda…</p>
      </div>
    );
  }

  // ── Web loading / error screen ────────────────────────────────────────────
  return (
    <MobileContainer>
      <div className="flex flex-col items-center justify-center size-full bg-white gap-4">
        {error ? (
          <p className="text-red-500 text-[14px] text-center px-8">{error}</p>
        ) : (
          <>
            <div className="size-10 border-[3px] border-gray-200 border-t-[#14ae5c] rounded-full animate-spin" />
            <p className="text-gray-500 text-[14px]">Signing you in…</p>
          </>
        )}
      </div>
    </MobileContainer>
  );
}
