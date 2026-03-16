import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import { useAuth } from '../context/AuthContext';
import { apiFetch, setTokens } from '../lib/api';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Google sign-in was cancelled or failed.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (!code) {
      navigate('/login');
      return;
    }

    apiFetch('/v1/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    })
      .then(async (data) => {
        if (data.success) {
          setTokens(data.data.access_token, data.data.refresh_token);
          await refreshProfile();
          navigate('/home', { replace: true });
        } else {
          setError('Google sign-in failed. Please try again.');
          setTimeout(() => navigate('/login'), 2000);
        }
      })
      .catch(() => {
        setError('Google sign-in failed. Please try again.');
        setTimeout(() => navigate('/login'), 2000);
      });
  }, [searchParams, navigate, refreshProfile]);

  return (
    <MobileContainer>
      <div className="flex flex-col items-center justify-center size-full bg-white gap-4">
        {error ? (
          <p className="text-red-500 text-[14px] text-center px-8">{error}</p>
        ) : (
          <>
            <div className="size-10 border-3 border-gray-200 border-t-[#14ae5c] rounded-full animate-spin" />
            <p className="text-gray-500 text-[14px]">Signing you in...</p>
          </>
        )}
      </div>
    </MobileContainer>
  );
}
