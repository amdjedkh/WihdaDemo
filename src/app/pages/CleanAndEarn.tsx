import image_68006784dd90767bc6dc432709cdab530114952c from 'figma:asset/68006784dd90767bc6dc432709cdab530114952c.png'
import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { toast } from 'sonner';
import SwipeBack from '../components/SwipeBack';
import { useAuth } from '../context/AuthContext';
import { apiFetch, API_BASE, getStoredToken } from '../lib/api';
import {
  ArrowLeft,
  Camera,
  Play,
  Square,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Loader2,
  ImageIcon,
  MapPin,
  AlertCircle,
} from 'lucide-react';

type CleaningStep = 'checking' | 'intro' | 'active-exists' | 'upload-before' | 'timer' | 'upload-after' | 'validating' | 'approved' | 'rejected' | 'pending-review';


export default function CleanAndEarn() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { language } = useApp();
  const [step, setStep] = useState<CleaningStep>('checking');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<any | null>(null);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [beforeUploadedAt, setBeforeUploadedAt] = useState<Date | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoSheetFor, setPhotoSheetFor] = useState<'before' | 'after' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputBeforeRef = useRef<HTMLInputElement>(null);
  const fileInputBeforeCameraRef = useRef<HTMLInputElement>(null);
  const fileInputAfterRef = useRef<HTMLInputElement>(null);
  const fileInputAfterCameraRef = useRef<HTMLInputElement>(null);

  // Notification permission is requested globally in App.tsx

  // Check for active submission on mount
  useEffect(() => {
    if (!user) { setStep('intro'); return; }

    // Restore persisted result first
    const saved = localStorage.getItem('cleanify_result');
    if (saved) {
      try {
        const { savedStep, savedCoins, savedRejectionReason } = JSON.parse(saved);
        if (savedStep === 'approved') { setCoinsEarned(savedCoins ?? 0); setStep('approved'); return; }
        if (savedStep === 'rejected') { setRejectionReason(savedRejectionReason ?? ''); setStep('rejected'); return; }
      } catch {}
    }

    apiFetch('/v1/cleanify/active')
      .then((data) => {
        const sub = data.data?.submission;
        if (sub) {
          if (sub.status === 'pending_review') {
            setSubmissionId(sub.id);
            setStep('pending-review');
            pollSubmissionStatus(sub.id);
          } else {
            setActiveSubmission(sub);
            setStep('active-exists');
          }
        } else {
          setStep('intro');
        }
      })
      .catch(() => setStep('intro'));
  }, [user]);

  const resumeActiveSubmission = () => {
    if (!activeSubmission) return;
    setSubmissionId(activeSubmission.id);
    if (activeSubmission.status === 'in_progress') {
      setBeforeUploadedAt(activeSubmission.before_uploaded_at ? new Date(activeSubmission.before_uploaded_at) : null);
      setStep('upload-after');
    } else {
      setStep('upload-before');
    }
    setActiveSubmission(null);
  };

  const abandonActiveSubmission = async () => {
    if (!activeSubmission) return;
    setLoading(true);
    try {
      await apiFetch(`/v1/cleanify/${activeSubmission.id}/abandon`, { method: 'POST' });
      setActiveSubmission(null);
      setStep('intro');
    } catch {
      toast.error('Failed to abandon submission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Start submission ────────────────────────────────────────────────────────

  const startSubmission = async () => {
    if (!user) {
      toast('Sign in required', { description: 'Please sign in to use Clean & Earn' });
      navigate('/login');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch('/v1/cleanify/start', { method: 'POST' });
      if (data.success) {
        setSubmissionId(data.data.submission_id);
        setStep('upload-before');
        // Schedule a local notification reminder
        LocalNotifications.schedule({
          notifications: [{
            id: 1001,
            title: language === 'ar' ? 'نظّف واكسب جارٍ 🧹' : 'Clean & Earn in progress 🧹',
            body: language === 'ar' ? 'لا تنسَ التقاط صورة بعد التنظيف لكسب العملات!' : "Don't forget to take your after photo and earn coins!",
            schedule: { at: new Date(Date.now() + 25 * 60 * 1000) },
            extra: { submissionId: data.data.submission_id },
          }],
        }).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start submission');
      toast.error(err.message || 'Failed to start');
    } finally {
      setLoading(false);
    }
  };

  // ─── Upload before photo ─────────────────────────────────────────────────────

  const handleBeforeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !submissionId) return;

    setLoading(true);
    setError('');

    try {
      // 1. Get presigned upload URL
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || 'jpg');
      const presignedData = await apiFetch(`/v1/cleanify/${submissionId}/before/presigned-url`, {
        method: 'POST',
        body: JSON.stringify({ file_extension: ext }),
      });

      const { upload_url, file_key } = presignedData.data;

      // 2. Upload file directly to R2
      const uploadRes = await fetch(upload_url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload photo');

      // 3. Confirm the upload
      await apiFetch(`/v1/cleanify/${submissionId}/before/confirm`, {
        method: 'POST',
        body: JSON.stringify({ file_key }),
      });

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => setBeforeImage(reader.result as string);
      reader.readAsDataURL(file);

      setBeforeUploadedAt(new Date());
      setStep('timer');
      toast('Before photo uploaded!', { description: 'Now clean the area and take the after photo' });
    } catch (err: any) {
      setError(err.message || 'Failed to upload before photo');
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Timer controls ──────────────────────────────────────────────────────────

  const startTimer = () => {
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('upload-after');
  };

  // ─── Upload after photo ──────────────────────────────────────────────────────

  const handleAfterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !submissionId) return;

    setLoading(true);
    setError('');

    try {
      // 1. Get presigned URL
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || 'jpg');
      const presignedData = await apiFetch(`/v1/cleanify/${submissionId}/after/presigned-url`, {
        method: 'POST',
        body: JSON.stringify({ file_extension: ext }),
      });

      const { upload_url, file_key } = presignedData.data;

      // 2. Upload
      const uploadRes = await fetch(upload_url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload photo');

      // 3. Confirm — this queues AI review
      await apiFetch(`/v1/cleanify/${submissionId}/after/confirm`, {
        method: 'POST',
        headers: { 'X-Language': language },
        body: JSON.stringify({ file_key }),
      });

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => setAfterImage(reader.result as string);
      reader.readAsDataURL(file);

      // Cancel the 25-min reminder and schedule a "result ready" notification
      LocalNotifications.cancel({ notifications: [{ id: 1001 }] }).catch(() => {});
      LocalNotifications.schedule({
        notifications: [{
          id: 1002,
          title: 'Clean & Earn Result Ready 🎉',
          body: 'Your submission has been reviewed. Tap to see the result!',
          schedule: { at: new Date(Date.now() + 2 * 60 * 1000) }, // fires in ~2 min
          extra: { submissionId },
        }],
      }).catch(() => {});
      setStep('validating');
      pollSubmissionStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to upload after photo');
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Poll for AI review result ────────────────────────────────────────────────

  const pollSubmissionStatus = useCallback(async (idOverride?: string) => {
    const id = idOverride ?? submissionId;
    if (!id) return;

    let attempts = 0;
    const maxAttempts = 60; // poll for up to ~3 minutes

    const poll = async () => {
      try {
        const data = await apiFetch(`/v1/cleanify/submissions/${id}`);
        if (!data.success) return;

        const submission = data.data;
        const status = submission.status;

        if (status === 'approved') {
          const coins = submission.coins_awarded ?? 150;
          setCoinsEarned(coins);
          localStorage.setItem('cleanify_result', JSON.stringify({ savedStep: 'approved', savedCoins: coins }));
          LocalNotifications.cancel({ notifications: [{ id: 1002 }] }).catch(() => {});
          LocalNotifications.schedule({ notifications: [{ id: 1003, title: language === 'ar' ? 'تمت الموافقة على التقديم! 🎉' : 'Submission Approved! 🎉', body: language === 'ar' ? `لقد حصلت على ${coins} عملة! عمل رائع!` : `You earned ${coins} coins! Great work!`, schedule: { at: new Date(Date.now() + 500) } }] }).catch(() => {});
          setStep('approved');
          setTimeout(() => refreshProfile(), 1500);
          toast('Approved!', { description: `You earned ${coins} coins!` });
          return;
        }
        if (status === 'rejected') {
          const reason = submission.review_note || '';
          setRejectionReason(reason);
          localStorage.setItem('cleanify_result', JSON.stringify({ savedStep: 'rejected', savedRejectionReason: reason }));
          LocalNotifications.cancel({ notifications: [{ id: 1002 }] }).catch(() => {});
          LocalNotifications.schedule({ notifications: [{ id: 1004, title: 'Submission Not Approved', body: reason || 'Your submission could not be verified. Please try again.', schedule: { at: new Date(Date.now() + 500) } }] }).catch(() => {});
          setStep('rejected');
          return;
        }

        // pending_review or still queued — show waiting UI but keep polling
        setStep('pending-review');
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
        // after maxAttempts the screen stays on pending-review; user will get notification
      } catch {
        attempts++;
        if (attempts < maxAttempts) setTimeout(poll, 5000);
      }
    };

    setTimeout(poll, 3000);
  }, [submissionId, refreshProfile]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetFlow = () => {
    localStorage.removeItem('cleanify_result');
    setStep('intro');
    setSubmissionId(null);
    setActiveSubmission(null);
    setBeforeImage(null);
    setAfterImage(null);
    setBeforeUploadedAt(null);
    setTimeElapsed(0);
    setIsTimerRunning(false);
    setCoinsEarned(0);
    setError('');
    if (timerRef.current) clearInterval(timerRef.current);
  };

const stepNumber = (step === 'intro' || step === 'checking' || step === 'active-exists') ? 0 : step === 'upload-before' ? 1 : step === 'timer' ? 2 : step === 'upload-after' ? 3 : 4;

  return (
    <MobileContainer>
      <PageTransition>
      <SwipeBack>
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 h-14">
            <button onClick={() => navigate('/activities')} className="text-gray-800 dark:text-gray-200">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white font-[Poppins,sans-serif]">{t(language, 'cleanEarnTitle')}</h1>
          </div>

          {/* Progress Steps */}
          {stepNumber > 0 && stepNumber < 4 && step !== 'active-exists' && (
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 flex items-center gap-2">
                  <div className={`h-1.5 rounded-full flex-1 transition-all ${
                    s <= stepNumber ? 'bg-[#14ae5c]' : 'bg-gray-200'
                  }`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 relative">

          {/* Global error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="size-4 text-red-500 shrink-0" />
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}

          {/* ── Checking ── */}
          {step === 'checking' && (
            <div className="flex flex-col items-center justify-center pt-32">
              <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
            </div>
          )}

          {/* ── Active Submission Exists ── */}
          {step === 'active-exists' && (
            <div className="flex flex-col items-center pt-12 px-2">
              {activeSubmission?.status === 'pending_review' ? (
                <>
                  <div className="bg-blue-50 rounded-3xl p-6 mb-5">
                    <Loader2 className="size-14 text-blue-400 animate-spin" />
                  </div>
                  <h2 className="text-[21px] font-semibold text-gray-900 mb-2 text-center">{t(language, 'underReview')}</h2>
                  <p className="text-gray-500 text-[14px] text-center mb-8 px-4">
                    {t(language, 'pendingReviewDesc')}
                  </p>
                  <div className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-blue-400 animate-pulse" />
                      <p className="text-[13px] font-semibold text-blue-700">
                        {t(language, 'aiReviewingPhotos')}
                      </p>
                    </div>
                    <p className="text-[12px] text-gray-400 mt-1 pl-4">{t(language, 'notifWhenDone')}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/cleanify-result/${activeSubmission.id}`)}
                    className="w-full bg-blue-500 text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mb-3"
                  >
                    <ArrowRight className="size-5" /> {t(language, 'viewSubmissionStatus')}
                  </button>
                  <button
                    onClick={() => navigate('/activities')}
                    className="w-full text-gray-400 text-[14px] py-2 active:scale-[0.98] transition-transform"
                  >
                    {t(language, 'backToActivities')}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-orange-50 rounded-3xl p-6 mb-5">
                    <Clock className="size-14 text-orange-400" />
                  </div>
                  <h2 className="text-[21px] font-semibold text-gray-900 mb-2 text-center">{t(language, 'unfinishedSession')}</h2>
                  <p className="text-gray-500 text-[14px] text-center mb-8 px-4">
                    {t(language, 'unfinishedSessionDesc')}
                  </p>

                  <div className="w-full bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`size-2 rounded-full ${activeSubmission?.status === 'in_progress' ? 'bg-green-500' : 'bg-orange-400'}`} />
                      <p className="text-[13px] font-semibold text-gray-700">
                        {activeSubmission?.status === 'in_progress' ? t(language, 'beforePhotoStatus') : t(language, 'beforePhotoNotYet')}
                      </p>
                    </div>
                    {activeSubmission?.before_uploaded_at && (
                      <p className="text-[12px] text-gray-400 mt-1 pl-4">
                        {t(language, 'startedAt')} {new Date(activeSubmission.before_uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={resumeActiveSubmission}
                      className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="size-5" /> {t(language, 'continueSession')}
                    </button>
                    <button
                      onClick={abandonActiveSubmission}
                      disabled={loading}
                      className="w-full bg-red-500 text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="size-5 animate-spin" /> : t(language, 'abandonAndNew')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Intro ── */}
          {step === 'intro' && (
            <div className="flex flex-col items-center pt-8">
              <div className="relative w-[calc(100%+2.5rem)] -mx-5 h-[200px] mb-6">
                <img
                  src={image_68006784dd90767bc6dc432709cdab530114952c}
                  alt="Volunteers cleaning"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white dark:from-gray-900 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
              </div>
              <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white text-center mb-2">{t(language, 'makeItShine')}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-[14px] text-center mb-8 px-4">
                {t(language, 'cleanEarnDesc')}
              </p>

              <div className="w-full space-y-3 mb-8">
                {[
                  { icon: Camera, text: t(language, 'introStep1'), step: '1' },
                  { icon: Clock, text: t(language, 'introStep2'), step: '2' },
                  { icon: Upload, text: t(language, 'introStep3'), step: '3' },
                  { icon: Sparkles, text: t(language, 'introStep4'), step: '4' },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5">
                    <div className="bg-[#14ae5c] text-white rounded-full size-8 flex items-center justify-center text-[12px] font-bold shrink-0">
                      {item.step}
                    </div>
                    <p className="text-[13px] text-gray-700">{item.text}</p>
                  </div>
                ))}
              </div>

              {!user ? (
                <div className="w-full space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                    <p className="text-[13px] text-yellow-800 font-medium">{t(language, 'signInToParticipate')}</p>
                    <p className="text-[12px] text-yellow-700 mt-0.5">{t(language, 'signInRequired')}</p>
                  </div>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    {t(language, 'signIn')} <ArrowRight className="size-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startSubmission}
                  disabled={loading}
                  className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : <>{t(language, 'letsGo')} <ArrowRight className="size-5" /></>}
                </button>
              )}
            </div>
          )}

          {/* ── Upload Before ── */}
          {step === 'upload-before' && (
            <div className="flex flex-col items-center pt-6">
              <div className="bg-orange-50 rounded-2xl p-4 mb-4">
                <Camera className="size-8 text-orange-500" />
              </div>
              <h2 className="text-[20px] font-semibold text-gray-900 mb-1">{t(language, 'beforePhoto')}</h2>
              <p className="text-gray-500 text-[13px] text-center mb-6">
                {t(language, 'beforePhotoDesc')}
              </p>

              <button
                onClick={() => setPhotoSheetFor('before')}
                disabled={loading}
                className="w-full h-[280px] border-2 border-dashed border-[#14ae5c]/40 rounded-2xl flex flex-col items-center justify-center bg-green-50/30 active:bg-green-50 transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-10 text-[#14ae5c] animate-spin" />
                ) : (
                  <>
                    <div className="bg-[#14ae5c]/10 rounded-full p-4 mb-3">
                      <ImageIcon className="size-8 text-[#14ae5c]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#14ae5c]">{t(language, 'tapToAddPhoto')}</p>
                    <p className="text-[12px] text-gray-400 mt-1">{t(language, 'cameraOrLibrary')}</p>
                  </>
                )}
              </button>

              <input ref={fileInputBeforeCameraRef} type="file" accept="image/*" capture="environment" onChange={handleBeforeImageUpload} className="hidden" />
              <input ref={fileInputBeforeRef} type="file" accept="image/*" onChange={handleBeforeImageUpload} className="hidden" />
            </div>
          )}

          {/* ── Timer ── */}
          {step === 'timer' && (
            <div className="flex flex-col items-center pt-6">
              <h2 className="text-[20px] font-semibold text-gray-900 mb-1">{t(language, 'cleanTheArea')}</h2>
              <p className="text-gray-500 text-[13px] mb-2">
                {isTimerRunning ? t(language, 'timerRunning') : t(language, 'timerReady')}
              </p>
              <p className="text-[12px] text-[#14ae5c] font-medium mb-4">
                {t(language, 'timerStartHint')}
              </p>

              {beforeImage && (
                <div className="w-full rounded-2xl overflow-hidden mb-6 border border-gray-100">
                  <img src={beforeImage} alt="Before" className="w-full h-[160px] object-cover" />
                  <div className="bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500 font-medium">
                    {t(language, 'beforePhotoConfirmed')}
                  </div>
                </div>
              )}

              {/* Timer Display */}
              <div className={`bg-gray-50 rounded-3xl p-8 mb-6 w-full flex flex-col items-center ${
                isTimerRunning ? 'ring-2 ring-[#14ae5c]/20' : ''
              }`}>
                <div className={`text-[52px] font-mono font-bold tracking-wider ${
                  isTimerRunning ? 'text-[#14ae5c]' : 'text-gray-800'
                }`}>
                  {formatTime(timeElapsed)}
                </div>
                {isTimerRunning && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="size-2 rounded-full bg-[#14ae5c] animate-pulse" />
                    <span className="text-[12px] text-[#14ae5c] font-medium">{t(language, 'recording')}</span>
                  </div>
                )}
              </div>

              {!isTimerRunning ? (
                <button
                  onClick={startTimer}
                  className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Play className="size-5" fill="white" /> {t(language, 'startTimer')}
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Square className="size-4" fill="white" /> {t(language, 'doneCleaning')}
                </button>
              )}
            </div>
          )}

          {/* ── Upload After ── */}
          {step === 'upload-after' && (
            <div className="flex flex-col items-center pt-6">
              <div className="bg-blue-50 rounded-2xl p-4 mb-4">
                <Camera className="size-8 text-blue-500" />
              </div>
              <h2 className="text-[20px] font-semibold text-gray-900 mb-1">{t(language, 'afterPhoto')}</h2>
              <p className="text-gray-500 text-[13px] text-center mb-4">
                {t(language, 'afterPhotoDesc')}
              </p>

              {/* Time check banner */}

              <div className="flex gap-2 w-full mb-4">
                {beforeImage && (
                  <div className="flex-1 rounded-xl overflow-hidden border border-gray-100">
                    <img src={beforeImage} alt="Before" className="w-full h-[100px] object-cover" />
                    <div className="bg-gray-50 px-2 py-1 text-[10px] text-gray-500 font-medium text-center">{t(language, 'before')}</div>
                  </div>
                )}
                <div className="flex-1 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center h-[124px]">
                  <span className="text-[10px] text-gray-400">{t(language, 'after')}</span>
                </div>
              </div>

              <button
                onClick={() => setPhotoSheetFor('after')}
                disabled={loading}
                className="w-full h-[200px] border-2 border-dashed border-[#14ae5c]/40 rounded-2xl flex flex-col items-center justify-center bg-green-50/30 active:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="size-10 text-[#14ae5c] animate-spin" />
                ) : (
                  <>
                    <div className="bg-[#14ae5c]/10 rounded-full p-4 mb-3">
                      <ImageIcon className="size-8 text-[#14ae5c]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#14ae5c]">
                      {t(language, 'tapToAddPhoto')}
                    </p>
                  </>
                )}
              </button>

              <input ref={fileInputAfterCameraRef} type="file" accept="image/*" capture="environment" onChange={handleAfterImageUpload} className="hidden" />
              <input ref={fileInputAfterRef} type="file" accept="image/*" onChange={handleAfterImageUpload} className="hidden" />

              <p className="text-[12px] text-gray-400 mt-4 flex items-center gap-1">
                <Clock className="size-3" /> Time spent: {formatTime(timeElapsed)}
              </p>
            </div>
          )}

          {/* ── Validating ── */}
          {step === 'validating' && (
            <div className="flex flex-col items-center justify-center pt-20">
              <div className="bg-green-50 rounded-3xl p-8 mb-6">
                <Loader2 className="size-12 text-[#14ae5c] animate-spin" />
              </div>
              <h2 className="text-[20px] font-semibold text-gray-900 mb-2">{t(language, 'validating')}</h2>
              <p className="text-gray-500 text-[14px] text-center px-8">
                {t(language, 'validatingDesc')}
              </p>
              <div className="flex gap-2 mt-8">
                <div className="size-2 rounded-full bg-[#14ae5c] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="size-2 rounded-full bg-[#14ae5c] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="size-2 rounded-full bg-[#14ae5c] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* ── Pending Review ── */}
          {step === 'pending-review' && (
            <div className="flex flex-col items-center pt-8">
              <div className="bg-blue-50 rounded-3xl p-6 mb-4">
                <Clock className="size-16 text-blue-500" />
              </div>
              <h2 className="text-[22px] font-semibold text-blue-600 mb-1">{t(language, 'underReview')}</h2>
              <p className="text-gray-500 text-[14px] text-center mb-6 px-4">
                {t(language, 'pendingReviewTeamDesc')}
              </p>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 w-full mb-6">
                <p className="text-[13px] font-semibold text-blue-700 mb-1">{t(language, 'whatHappensNext')}</p>
                <p className="text-[12px] text-blue-600">
                  {t(language, 'pendingReviewTeamInfo')}
                </p>
              </div>
              <button
                onClick={() => navigate('/activities')}
                className="w-full bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
              >
                {t(language, 'backToActivities')}
              </button>
            </div>
          )}

          {/* ── Approved ── */}
          {step === 'approved' && (
            <div className="flex flex-col items-center pt-8">
              <div className="bg-green-50 rounded-3xl p-6 mb-4">
                <CheckCircle2 className="size-16 text-[#14ae5c]" />
              </div>
              <h2 className="text-[22px] font-semibold text-[#14ae5c] mb-1">{t(language, 'approved')}</h2>
              <p className="text-gray-500 text-[14px] text-center mb-6">
                {t(language, 'approvedDesc')}
              </p>

              <div className="bg-gradient-to-br from-[#fff9e6] to-[#fff3cc] rounded-2xl p-6 w-full text-center mb-6">
                <p className="text-[12px] text-gray-500 mb-2">{t(language, 'coinsEarned')}</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="size-[36px] rounded-full border-[3px] border-[#f0a326] flex items-center justify-center">
                    <span className="text-[16px] font-bold text-[#f0a326]">$</span>
                  </div>
                  <span className="text-[40px] font-bold text-[#f0a326]">{coinsEarned}</span>
                </div>
              </div>

              {beforeImage && afterImage && (
                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    <img src={beforeImage} alt="Before" className="w-full h-[100px] object-cover" />
                    <div className="bg-red-50 px-2 py-1 text-[10px] text-red-500 font-medium text-center">{t(language, 'before')}</div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    <img src={afterImage} alt="After" className="w-full h-[100px] object-cover" />
                    <div className="bg-green-50 px-2 py-1 text-[10px] text-[#14ae5c] font-medium text-center">{t(language, 'after')}</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => navigate('/activities')}
                  className="flex-1 bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                >
                  {t(language, 'done')}
                </button>
                <button
                  onClick={resetFlow}
                  className="flex-1 border-2 border-[#14ae5c] text-[#14ae5c] py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
                >
                  <RotateCcw className="size-4" /> {t(language, 'again')}
                </button>
              </div>
            </div>
          )}

          {/* ── Rejected ── */}
          {step === 'rejected' && (
            <div className="flex flex-col items-center pt-8">
              <div className="bg-red-50 rounded-3xl p-6 mb-4">
                <XCircle className="size-16 text-red-500" />
              </div>
              <h2 className="text-[22px] font-semibold text-red-500 mb-1">{t(language, 'notApproved')}</h2>
              <p className="text-gray-500 text-[14px] text-center mb-6 px-4">
                {t(language, 'rejectedDesc')}
              </p>

              {rejectionReason ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 w-full mb-6">
                  <p className="text-[13px] font-semibold text-red-600 mb-1">{t(language, 'reason')}</p>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300">{rejectionReason}</p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 w-full mb-6">
                  <p className="text-[13px] font-semibold text-red-600 mb-2">{t(language, 'possibleReasons')}</p>
                  <ul className="text-[12px] text-gray-600 space-y-1.5">
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span>{t(language, 'rejectedReason1')}</li>
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span>{t(language, 'rejectedReason2')}</li>
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span>{t(language, 'rejectedReason3')}</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={resetFlow}
                  className="flex-1 bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
                >
                  <RotateCcw className="size-4" /> {t(language, 'tryAgain')}
                </button>
                <button
                  onClick={() => navigate('/activities')}
                  className="flex-1 border-2 border-gray-200 text-gray-500 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                >
                  {t(language, 'cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ── Photo picker bottom sheet ── */}
      {photoSheetFor && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPhotoSheetFor(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-5" />
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white mb-4 text-center">{t(language, 'addPhoto')}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setPhotoSheetFor(null);
                  setTimeout(() => {
                    if (photoSheetFor === 'before') fileInputBeforeCameraRef.current?.click();
                    else fileInputAfterCameraRef.current?.click();
                  }, 100);
                }}
                className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-4 active:bg-gray-100 dark:active:bg-gray-600 transition-colors"
              >
                <div className="bg-[#14ae5c]/10 rounded-xl p-2.5">
                  <Camera className="size-5 text-[#14ae5c]" />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(language, 'takeAPhoto')}</p>
                  <p className="text-[12px] text-gray-400">{t(language, 'useCamera')}</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setPhotoSheetFor(null);
                  setTimeout(() => {
                    if (photoSheetFor === 'before') fileInputBeforeRef.current?.click();
                    else fileInputAfterRef.current?.click();
                  }, 100);
                }}
                className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-4 active:bg-gray-100 dark:active:bg-gray-600 transition-colors"
              >
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-2.5">
                  <ImageIcon className="size-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(language, 'uploadFromLibrary')}</p>
                  <p className="text-[12px] text-gray-400">{t(language, 'chooseExisting')}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}
