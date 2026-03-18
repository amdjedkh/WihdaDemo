import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import { apiFetch, setTokens, getStoredToken } from '../lib/api';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

const ALLOWED_EMAILS = ['amdjedkh.collab@gmail.com'];

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Already authenticated as admin → skip to panel
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'admin' && payload.exp * 1000 > Date.now()) {
        navigate('/admin-panel', { replace: true });
      }
    } catch { /* ignore */ }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ALLOWED_EMAILS.includes(email.toLowerCase().trim())) {
      setError('Unauthorized. This email is not permitted.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!data.success) {
        setError(data.error?.message || 'Login failed. Check your credentials.');
        return;
      }

      const { access_token, refresh_token, user } = data.data;

      if (user?.role !== 'admin') {
        setError('Unauthorized. Admin privileges required.');
        return;
      }

      setTokens(access_token, refresh_token);
      navigate('/admin-panel', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileContainer>
      <div className="flex flex-col size-full bg-gray-950">

        {/* Header */}
        <div className="pt-[env(safe-area-inset-top)] px-5">
          <div className="flex items-center h-14">
            <button
              onClick={() => navigate('/login')}
              className="text-gray-400 active:text-white transition-colors"
            >
              <ArrowLeft className="size-6" />
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center px-8 pt-4 pb-10">
          <div className="size-20 rounded-3xl bg-[#14ae5c] flex items-center justify-center mb-5 shadow-2xl shadow-[#14ae5c]/40">
            <ShieldCheck className="size-10 text-white" />
          </div>
          <h1 className="text-[26px] font-bold text-white mb-1 font-[Poppins,sans-serif]">
            Admin Access
          </h1>
          <p className="text-gray-500 text-[13px] text-center">
            Restricted to authorised administrators only
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 px-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 mb-5">
              <p className="text-red-400 text-[13px] font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-600" />
              <input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-2xl pl-12 pr-4 py-4 text-[14px] placeholder:text-gray-600 focus:border-[#14ae5c] focus:outline-none transition-colors"
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-600" />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-2xl pl-12 pr-12 py-4 text-[14px] placeholder:text-gray-600 focus:border-[#14ae5c] focus:outline-none transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
              >
                {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 shadow-lg shadow-[#14ae5c]/30"
            >
              {loading
                ? <Loader2 className="size-5 animate-spin" />
                : 'Enter Admin Panel'}
            </button>
          </form>
        </div>

        <div className="pb-[env(safe-area-inset-bottom)] pb-8 text-center">
          <p className="text-gray-700 text-[11px]">Wihda · Admin Control System</p>
        </div>
      </div>
    </MobileContainer>
  );
}
