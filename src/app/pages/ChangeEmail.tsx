import { useState } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { t } from '../lib/i18n';
import { ArrowLeft, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';

export default function ChangeEmail() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { language } = useApp();
  const T = (key: Parameters<typeof t>[1]) => t(language, key);

  const [step, setStep] = useState<'form' | 'verify' | 'done'>('form');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!newEmail.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/v1/me/change-email/initiate', {
        method: 'POST',
        body: JSON.stringify({ new_email: newEmail.trim(), password }),
      });
      if (data.success) {
        setStep('verify');
      } else {
        setError(data.error?.message || 'Failed to send code');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/v1/me/change-email/confirm', {
        method: 'POST',
        body: JSON.stringify({ new_email: newEmail.trim(), code }),
      });
      if (data.success) {
        await refreshProfile();
        setStep('done');
      } else {
        setError(data.error?.message || 'Invalid code');
      }
    } catch (e: any) {
      setError(e?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-gray-50">

        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)] bg-white border-b border-gray-100">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 flex-1 font-[Poppins,Tajawal,sans-serif]">
              {T('changeEmailTitle')}
            </h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10">

          {step === 'done' ? (
            <div className="flex flex-col items-center text-center pt-16">
              <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="size-10 text-[#14ae5c]" />
              </div>
              <h2 className="text-[20px] font-bold text-gray-900 mb-2">{T('emailChanged')}</h2>
              <button
                onClick={() => navigate('/settings')}
                className="mt-6 bg-[#14ae5c] text-white px-8 py-3 rounded-2xl text-[14px] font-semibold"
              >
                {T('cancelBtn').replace('Cancel', 'Back to Settings').replace('إلغاء', 'العودة للإعدادات')}
              </button>
            </div>
          ) : step === 'form' ? (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[12px] text-gray-500 font-medium mb-1.5">{T('newEmail')}</p>
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                  <Mail className="size-4 text-gray-400 shrink-0" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none"
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[12px] text-gray-500 font-medium mb-1.5">{T('currentPassword')}</p>
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                  <Lock className="size-4 text-gray-400 shrink-0" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}

              <button
                onClick={handleSendCode}
                disabled={loading || !newEmail.trim() || !password.trim()}
                className="w-full bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {T('sendCode')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <Mail className="size-8 text-blue-500 mx-auto mb-2" />
                <p className="text-[14px] font-semibold text-gray-900 mb-1">{T('verifyCode')}</p>
                <p className="text-[12px] text-gray-500">{T('verifyCodeDesc')}</p>
                <p className="text-[13px] font-medium text-blue-600 mt-1">{newEmail}</p>
              </div>

              <input
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="000000"
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-[24px] text-center font-bold tracking-[0.3em] text-gray-900 outline-none shadow-sm"
                maxLength={6}
                inputMode="numeric"
              />

              {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}

              <button
                onClick={handleConfirm}
                disabled={loading || code.length !== 6}
                className="w-full bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {T('confirmChange')}
              </button>

              <button onClick={() => setStep('form')} className="text-[13px] text-gray-400 text-center">
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
