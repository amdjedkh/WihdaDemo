import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import { toast } from 'sonner';
import { Mail, Phone, ArrowLeft, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';

interface LocationState {
  contactChannel?: 'email' | 'phone';
  email?: string;
}

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};
  const channel = state.contactChannel || 'email';
  const maskedContact = state.email
    ? state.email.replace(/(.{2}).*(@.*)/, '$1***$2')
    : channel === 'email' ? 'your email' : 'your phone';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-send OTP on mount
  useEffect(() => {
    sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    try {
      setResending(true);
      setError('');
      await apiFetch(`/v1/auth/verify/${channel}/send`, { method: 'POST' });
      setOtpSent(true);
      startCountdown();
      toast('Code sent!', { description: `Check ${channel === 'email' ? 'your email' : 'your SMS'}` });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ALREADY_VERIFIED') {
          toast('Already verified!', { description: 'You can now log in.' });
          navigate('/login');
          return;
        }
        setError(err.message);
      } else {
        setError('Failed to send verification code. Try again.');
      }
    } finally {
      setResending(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all digits filled
    if (value && index === 5) {
      const fullCode = [...newCode].join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeStr?: string) => {
    const finalCode = codeStr ?? code.join('');
    if (finalCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiFetch(`/v1/auth/verify/${channel}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ code: finalCode }),
      });

      toast('Verified!', { description: 'Your contact has been verified.' });

      // After email/phone verified, user needs to log in
      // (the full token is only issued on login after verification)
      navigate('/login', { state: { verified: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.code === 'CODE_EXPIRED') {
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      } else {
        setError('Verification failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fullCode = code.join('');

  return (
    <MobileContainer>
      <div className="flex flex-col size-full bg-white">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center h-14">
            <button onClick={() => navigate('/login')} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pt-2 pb-10 flex flex-col">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-50 rounded-3xl p-5">
              {channel === 'email' ? (
                <Mail className="size-12 text-[#14ae5c]" />
              ) : (
                <Phone className="size-12 text-[#14ae5c]" />
              )}
            </div>
          </div>

          <h2 className="text-[24px] font-bold text-gray-900 text-center mb-1 font-[Poppins,sans-serif]">
            Verify Your {channel === 'email' ? 'Email' : 'Phone'}
          </h2>
          <p className="text-[14px] text-gray-400 text-center mb-8">
            {otpSent
              ? `We sent a 6-digit code to ${maskedContact}`
              : `Sending code to ${maskedContact}...`}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* OTP Inputs */}
          <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`size-[52px] text-center text-[22px] font-bold rounded-2xl border-2 transition-all outline-none
                  ${digit ? 'border-[#14ae5c] bg-green-50 text-[#14ae5c]' : 'border-gray-200 bg-gray-50 text-gray-800'}
                  focus:border-[#14ae5c]`}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={loading || fullCode.length !== 6}
            className="w-full bg-[#14ae5c] text-white py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 mb-4"
          >
            {loading ? (
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="size-5" /> Verify Code
              </>
            )}
          </button>

          {/* Resend */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-[13px] text-gray-400">
                Resend code in <span className="font-semibold text-gray-600">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={sendOtp}
                disabled={resending}
                className="text-[#14ae5c] text-[13px] font-semibold flex items-center gap-1 mx-auto active:scale-95 transition-transform disabled:opacity-60"
              >
                <RotateCcw className="size-4" />
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>

          {/* Skip to login note */}
          <div className="mt-auto pt-8 text-center">
            <p className="text-[12px] text-gray-400">
              Already verified?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-[#14ae5c] font-semibold flex items-center gap-0.5 inline-flex"
              >
                Sign in <ArrowRight className="size-3" />
              </button>
            </p>
          </div>
        </div>
      </div>
    </MobileContainer>
  );
}
