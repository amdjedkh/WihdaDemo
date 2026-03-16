import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Camera, Check, Loader2, ShieldCheck,
  RefreshCw, User, CreditCard, X,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

type DocType = 'front' | 'back' | 'selfie';
type Step = 'intro' | 'upload' | 'submitted' | 'approved' | 'failed';

interface DocState {
  file: File | null;
  preview: string | null;
  uploaded: boolean;
  uploading: boolean;
}

const DOC_META: Record<DocType, { label: string; hint: string; icon: React.ReactNode }> = {
  front: {
    label: 'ID Front',
    hint: 'Photo of the front of your national ID card or passport',
    icon: <CreditCard className="size-5" />,
  },
  back: {
    label: 'ID Back',
    hint: 'Photo of the back of your national ID card',
    icon: <CreditCard className="size-5" />,
  },
  selfie: {
    label: 'Selfie',
    hint: 'A clear photo of your face',
    icon: <User className="size-5" />,
  },
};

export default function VerifyIdentity() {
  const navigate = useNavigate();
  const { refreshProfile, signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const [step, setStep] = useState<Step>('intro');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [docs, setDocs] = useState<Record<DocType, DocState>>({
    front: { file: null, preview: null, uploaded: false, uploading: false },
    back:  { file: null, preview: null, uploaded: false, uploading: false },
    selfie:{ file: null, preview: null, uploaded: false, uploading: false },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentDocType = useRef<DocType>('front');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check existing status on mount
  useEffect(() => {
    apiFetch('/v1/verification/status')
      .then((res) => {
        const status = res?.data?.verification_status;
        const session = res?.data?.session;
        if (status === 'verified') {
          setStep('approved');
        } else if (status === 'pending' || session?.status === 'processing' || session?.status === 'pending') {
          setSessionId(session?.id ?? null);
          setStep('submitted');
          startPolling(session?.id);
        } else if (status === 'failed') {
          setRejectionReason(session?.rejection_reason || 'Verification failed.');
          setStep('failed');
        }
      })
      .catch(() => {}); // not logged in yet — fine
  }, []);

  useEffect(() => {
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, []);

  // ── start session ────────────────────────────────────────────────────────────
  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await apiFetch('/v1/verification/start', { method: 'POST' });
      if (res?.data?.already_verified) {
        setStep('approved');
        return;
      }
      setSessionId(res.data.session_id);
      setStep('upload');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start verification');
    } finally {
      setStarting(false);
    }
  };

  // ── pick photo ───────────────────────────────────────────────────────────────
  const pickDoc = (type: DocType) => {
    currentDocType.current = type;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    e.target.value = '';

    const type = currentDocType.current;
    const preview = URL.createObjectURL(file);

    setDocs((prev) => ({
      ...prev,
      [type]: { file, preview, uploaded: false, uploading: true },
    }));

    try {
      // 1. Get presigned URL
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';

      const urlRes = await apiFetch('/v1/verification/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          document_type: type,
          file_extension: safeExt,
        }),
      });

      const uploadUrl: string = urlRes.data.upload_url;

      // 2. Upload directly
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      setDocs((prev) => ({
        ...prev,
        [type]: { file, preview, uploaded: true, uploading: false },
      }));
      toast.success(`${DOC_META[type].label} uploaded`);
    } catch (err: any) {
      toast.error(`Failed to upload ${DOC_META[type].label}`);
      setDocs((prev) => ({
        ...prev,
        [type]: { file: null, preview: null, uploaded: false, uploading: false },
      }));
    }
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const allUploaded = docs.front.uploaded && docs.back.uploaded && docs.selfie.uploaded;

  const handleSubmit = async () => {
    if (!sessionId || !allUploaded) return;
    setSubmitting(true);
    try {
      await apiFetch('/v1/verification/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      setStep('submitted');
      startPolling(sessionId);
    } catch (err: any) {
      toast.error(err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── poll ─────────────────────────────────────────────────────────────────────
  const startPolling = (sid: string | null) => {
    if (!sid) return;
    setPolling(true);
    let attempts = 0;
    pollTimerRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await apiFetch('/v1/verification/status');
        const status = res?.data?.verification_status;
        if (status === 'verified') {
          clearInterval(pollTimerRef.current!);
          setPolling(false);
          setStep('approved');
          await refreshProfile();
        } else if (status === 'failed') {
          clearInterval(pollTimerRef.current!);
          setPolling(false);
          setRejectionReason(res?.data?.session?.rejection_reason || 'Verification failed.');
          setStep('failed');
        } else if (attempts >= 40) {
          // ~2 min timeout — stop polling, stay on submitted
          clearInterval(pollTimerRef.current!);
          setPolling(false);
        }
      } catch {}
    }, 3000);
  };

  const removeDoc = (type: DocType) => {
    setDocs((prev) => ({
      ...prev,
      [type]: { file: null, preview: null, uploaded: false, uploading: false },
    }));
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <MobileContainer>
      <PageTransition>
      <Toaster position="top-center" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex flex-col size-full bg-white">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center h-14">
            <button onClick={() => navigate(-1)} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[17px] font-semibold text-gray-900 ml-3 flex-1 font-[Poppins,sans-serif]">
              Identity Verification
            </h1>
            <button onClick={handleLogout} className="text-[13px] text-gray-400 active:text-gray-600">
              Log out
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">

          {/* INTRO */}
          {step === 'intro' && (
            <div className="flex flex-col items-center pt-6">
              <div className="bg-blue-50 rounded-3xl p-6 mb-6">
                <ShieldCheck className="size-14 text-blue-500" />
              </div>
              <h2 className="text-[22px] font-bold text-gray-900 text-center mb-2">Verify Your Identity</h2>
              <p className="text-[13px] text-gray-500 text-center mb-8 leading-relaxed">
                To protect the community, we need to verify your identity. This takes about 2 minutes.
              </p>

              <div className="w-full space-y-3 mb-8">
                {(['front', 'back', 'selfie'] as DocType[]).map((t) => (
                  <div key={t} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5">
                    <div className="bg-[#14ae5c]/10 rounded-full p-2 text-[#14ae5c]">
                      {DOC_META[t].icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{DOC_META[t].label}</p>
                      <p className="text-[11px] text-gray-500">{DOC_META[t].hint}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
              >
                {starting ? <Loader2 className="size-5 animate-spin" /> : <><ShieldCheck className="size-5" /> Start Verification</>}
              </button>
              <button
                onClick={() => navigate('/home')}
                className="w-full text-gray-400 py-3 text-[14px] font-medium active:text-gray-600"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* UPLOAD */}
          {step === 'upload' && (
            <div className="pt-4">
              <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
                Upload clear, well-lit photos of each document. All three are required.
              </p>

              <div className="space-y-4 mb-6">
                {(['front', 'back', 'selfie'] as DocType[]).map((type) => {
                  const doc = docs[type];
                  return (
                    <div key={type} className={`rounded-2xl border-2 overflow-hidden transition-all ${doc.uploaded ? 'border-[#14ae5c]' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-3 p-3 bg-gray-50">
                        <div className={`p-2 rounded-full ${doc.uploaded ? 'bg-[#14ae5c]/10 text-[#14ae5c]' : 'bg-gray-200 text-gray-500'}`}>
                          {doc.uploaded ? <Check className="size-4" /> : DOC_META[type].icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-gray-800">{DOC_META[type].label}</p>
                          <p className="text-[11px] text-gray-400">{DOC_META[type].hint}</p>
                        </div>
                        {doc.uploading && <Loader2 className="size-4 text-[#14ae5c] animate-spin" />}
                        {doc.uploaded && !doc.uploading && (
                          <button onClick={() => removeDoc(type)} className="text-gray-400 active:text-red-500">
                            <X className="size-4" />
                          </button>
                        )}
                      </div>

                      {doc.preview ? (
                        <div className="relative">
                          <img src={doc.preview} alt={type} className="w-full h-36 object-cover" />
                          {doc.uploading && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Loader2 className="size-8 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => pickDoc(type)}
                          disabled={doc.uploading}
                          className="w-full h-28 flex flex-col items-center justify-center gap-2 bg-white active:bg-gray-50 transition-colors"
                        >
                          <Camera className="size-7 text-gray-300" />
                          <span className="text-[12px] text-gray-400">Tap to take / choose photo</span>
                        </button>
                      )}

                      {doc.preview && !doc.uploaded && !doc.uploading && (
                        <button onClick={() => pickDoc(type)} className="w-full py-2 text-[12px] text-[#14ae5c] font-medium bg-white">
                          Retake
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!allUploaded || submitting}
                className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {submitting
                  ? <Loader2 className="size-5 animate-spin" />
                  : <><ShieldCheck className="size-5" /> Submit for Review</>
                }
              </button>

              {!allUploaded && (
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  Upload all 3 documents to continue
                </p>
              )}
              <button
                onClick={() => navigate('/home')}
                className="w-full text-gray-400 py-3 text-[14px] font-medium active:text-gray-600"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* SUBMITTED / PROCESSING */}
          {step === 'submitted' && (
            <div className="flex flex-col items-center pt-10">
              <div className="bg-blue-50 rounded-3xl p-6 mb-6 relative">
                <ShieldCheck className="size-14 text-blue-400" />
                {polling && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full size-6 flex items-center justify-center">
                    <RefreshCw className="size-3.5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <h2 className="text-[20px] font-bold text-gray-900 text-center mb-2">Under Review</h2>
              <p className="text-[13px] text-gray-500 text-center mb-6 leading-relaxed">
                Your documents have been submitted. Our AI is reviewing them now.
                {polling ? ' Checking for updates…' : ' This usually takes 1–2 minutes.'}
              </p>
              <div className="w-full bg-blue-50 rounded-2xl p-4 mb-6">
                <p className="text-[12px] text-blue-700 leading-relaxed">
                  You'll be automatically redirected once your identity is confirmed. You can also come back later.
                </p>
              </div>
              <button
                onClick={() => navigate('/home')}
                className="w-full border border-gray-200 text-gray-700 py-3.5 rounded-xl text-[14px] font-medium"
              >
                Back to Home
              </button>
              <button
                onClick={() => navigate('/home')}
                className="w-full text-gray-400 py-3 text-[14px] font-medium active:text-gray-600"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* APPROVED */}
          {step === 'approved' && (
            <div className="flex flex-col items-center pt-10">
              <div className="bg-green-50 rounded-3xl p-6 mb-6">
                <ShieldCheck className="size-14 text-[#14ae5c]" />
              </div>
              <h2 className="text-[22px] font-bold text-gray-900 text-center mb-2">Identity Verified!</h2>
              <p className="text-[13px] text-gray-500 text-center mb-8">
                Your identity has been confirmed. You now have full access to Wihda.
              </p>
              <button
                onClick={async () => { await refreshProfile(); navigate('/home'); }}
                className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform"
              >
                Go to Home
              </button>
            </div>
          )}

          {/* FAILED */}
          {step === 'failed' && (
            <div className="flex flex-col items-center pt-10">
              <div className="bg-red-50 rounded-3xl p-6 mb-6">
                <ShieldCheck className="size-14 text-red-400" />
              </div>
              <h2 className="text-[22px] font-bold text-gray-900 text-center mb-2">Verification Failed</h2>
              {rejectionReason && (
                <div className="w-full bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                  <p className="text-[12px] text-red-700">{rejectionReason}</p>
                </div>
              )}
              <p className="text-[13px] text-gray-500 text-center mb-8">
                Please try again with clearer photos.
              </p>
              <button
                onClick={() => { setStep('intro'); setDocs({ front: { file: null, preview: null, uploaded: false, uploading: false }, back: { file: null, preview: null, uploaded: false, uploading: false }, selfie: { file: null, preview: null, uploaded: false, uploading: false } }); }}
                className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform"
              >
                Try Again
              </button>
            </div>
          )}

        </div>
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
