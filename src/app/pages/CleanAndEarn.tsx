import image_68006784dd90767bc6dc432709cdab530114952c from '../../assets/68006784dd90767bc6dc432709cdab530114952c.png'
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { toast } from 'sonner';
import SwipeBack from '../components/SwipeBack';
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
} from 'lucide-react';
import wihdaBg from 'figma:asset/a5d87b68b83915f49c77ce9c95107f47b6de71d1.png';

type CleaningStep = 'intro' | 'upload-before' | 'timer' | 'upload-after' | 'validating' | 'approved' | 'rejected';

export default function CleanAndEarn() {
  const navigate = useNavigate();
  const [step, setStep] = useState<CleaningStep>('intro');
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputBeforeRef = useRef<HTMLInputElement>(null);
  const fileInputAfterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleBeforeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBeforeImage(reader.result as string);
        setStep('timer');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAfterImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterImage(reader.result as string);
        validateCleaning();
      };
      reader.readAsDataURL(file);
    }
  };

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

  const validateCleaning = () => {
    setStep('validating');
    setTimeout(() => {
      const isApproved = Math.random() > 0.15;
      if (isApproved) {
        const coins = Math.floor(50 + (timeElapsed / 60) * 10);
        setCoinsEarned(coins);
        setStep('approved');
        toast('Cleanup approved!', {
          description: `You earned ${coins} coins!`,
          duration: 3000,
        });
      } else {
        setStep('rejected');
      }
    }, 2500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetFlow = () => {
    setStep('intro');
    setBeforeImage(null);
    setAfterImage(null);
    setTimeElapsed(0);
    setIsTimerRunning(false);
    setCoinsEarned(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const stepNumber = step === 'intro' ? 0 : step === 'upload-before' ? 1 : step === 'timer' ? 2 : step === 'upload-after' ? 3 : 4;

  return (
    <MobileContainer>
      <PageTransition>
      <SwipeBack>
      <div className="flex flex-col size-full">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 h-14">
            <button onClick={() => navigate('/activities')} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">Clean & Earn</h1>
          </div>

          {/* Progress Steps */}
          {stepNumber > 0 && stepNumber < 4 && (
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
          {/* Intro */}
          {step === 'intro' && (
            <div className="flex flex-col items-center pt-8">
              <div className="relative w-[calc(100%+2.5rem)] -mx-5 h-[200px] mb-6">
                <img
                  src={image_68006784dd90767bc6dc432709cdab530114952c}
                  alt="Volunteers cleaning"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
              </div>
              <h2 className="text-[22px] font-semibold text-gray-900 text-center mb-2">Make It Shine!</h2>
              <p className="text-gray-500 text-[14px] text-center mb-8 px-4">
                Clean an area in your neighborhood and earn coins. Our AI will verify your work.
              </p>

              <div className="w-full space-y-3 mb-8">
                {[
                  { icon: Camera, text: 'Take a "before" photo of the dirty area', step: '1' },
                  { icon: Clock, text: 'Start the timer and clean the area', step: '2' },
                  { icon: Upload, text: 'Take an "after" photo when done', step: '3' },
                  { icon: Sparkles, text: 'Get your coins after AI validation', step: '4' },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5">
                    <div className="bg-[#14ae5c] text-white rounded-full size-8 flex items-center justify-center text-[12px] font-bold shrink-0">
                      {item.step}
                    </div>
                    <p className="text-[13px] text-gray-700">{item.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('upload-before')}
                className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                Let's Go <ArrowRight className="size-5" />
              </button>
            </div>
          )}

          {/* Upload Before */}
          {step === 'upload-before' && (
            <div className="flex flex-col items-center pt-6">
              <div className="bg-orange-50 rounded-2xl p-4 mb-4">
                <Camera className="size-8 text-orange-500" />
              </div>
              <h2 className="text-[20px] font-semibold text-gray-900 mb-1">Before Photo</h2>
              <p className="text-gray-500 text-[13px] text-center mb-6">
                Upload a photo of the unclean area
              </p>

              <button
                onClick={() => fileInputBeforeRef.current?.click()}
                className="w-full h-[280px] border-2 border-dashed border-[#14ae5c]/40 rounded-2xl flex flex-col items-center justify-center bg-green-50/30 active:bg-green-50 transition-colors"
              >
                <div className="bg-[#14ae5c]/10 rounded-full p-4 mb-3">
                  <ImageIcon className="size-8 text-[#14ae5c]" />
                </div>
                <p className="text-[14px] font-medium text-[#14ae5c]">Tap to upload photo</p>
                <p className="text-[12px] text-gray-400 mt-1">JPG, PNG or take a photo</p>
              </button>

              <input
                ref={fileInputBeforeRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleBeforeImageUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Timer */}
          {step === 'timer' && (
            <div className="flex flex-col items-center pt-6">
              <h2 className="text-[20px] font-semibold text-gray-900 mb-1">Clean the Area</h2>
              <p className="text-gray-500 text-[13px] mb-6">
                {isTimerRunning ? 'Timer is running... Keep cleaning!' : 'Start the timer when ready'}
              </p>

              {beforeImage && (
                <div className="w-full rounded-2xl overflow-hidden mb-6 border border-gray-100">
                  <img src={beforeImage} alt="Before" className="w-full h-[160px] object-cover" />
                  <div className="bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500 font-medium">
                    Before Photo
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
                    <span className="text-[12px] text-[#14ae5c] font-medium">Recording</span>
                  </div>
                )}
              </div>

              {!isTimerRunning ? (
                <button
                  onClick={startTimer}
                  className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Play className="size-5" fill="white" /> Start Timer
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Square className="size-4" fill="white" /> Done Cleaning
                </button>
              )}
            </div>
          )}

          {/* Upload After */}
          {step === 'upload-after' && (
            <div className="flex flex-col items-center pt-6">
              <div className="bg-blue-50 rounded-2xl p-4 mb-4">
                <Camera className="size-8 text-blue-500" />
              </div>
              <h2 className="text-[20px] font-semibold text-gray-900 mb-1">After Photo</h2>
              <p className="text-gray-500 text-[13px] text-center mb-4">
                Show us how clean it looks now!
              </p>

              <div className="flex gap-2 w-full mb-4">
                {beforeImage && (
                  <div className="flex-1 rounded-xl overflow-hidden border border-gray-100">
                    <img src={beforeImage} alt="Before" className="w-full h-[100px] object-cover" />
                    <div className="bg-gray-50 px-2 py-1 text-[10px] text-gray-500 font-medium text-center">Before</div>
                  </div>
                )}
                <div className="flex-1 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center h-[124px]">
                  <span className="text-[10px] text-gray-400">After</span>
                </div>
              </div>

              <button
                onClick={() => fileInputAfterRef.current?.click()}
                className="w-full h-[200px] border-2 border-dashed border-[#14ae5c]/40 rounded-2xl flex flex-col items-center justify-center bg-green-50/30 active:bg-green-50 transition-colors"
              >
                <div className="bg-[#14ae5c]/10 rounded-full p-4 mb-3">
                  <ImageIcon className="size-8 text-[#14ae5c]" />
                </div>
                <p className="text-[14px] font-medium text-[#14ae5c]">Tap to upload after photo</p>
              </button>

              <input
                ref={fileInputAfterRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAfterImageUpload}
                className="hidden"
              />

              <p className="text-[12px] text-gray-400 mt-4 flex items-center gap-1">
                <Clock className="size-3" /> Time spent: {formatTime(timeElapsed)}
              </p>
            </div>
          )}

          {/* Validating */}
          {step === 'validating' && (
            <div className="flex flex-col items-center justify-center pt-20">
              <div className="bg-green-50 rounded-3xl p-8 mb-6">
                <Loader2 className="size-12 text-[#14ae5c] animate-spin" />
              </div>
              <h2 className="text-[20px] font-semibold text-gray-900 mb-2">Validating...</h2>
              <p className="text-gray-500 text-[14px] text-center px-8">
                Our AI is comparing the before and after images to verify the cleanup
              </p>
              <div className="flex gap-2 mt-8">
                <div className="size-2 rounded-full bg-[#14ae5c] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="size-2 rounded-full bg-[#14ae5c] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="size-2 rounded-full bg-[#14ae5c] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Approved */}
          {step === 'approved' && (
            <div className="flex flex-col items-center pt-8">
              <div className="bg-green-50 rounded-3xl p-6 mb-4">
                <CheckCircle2 className="size-16 text-[#14ae5c]" />
              </div>
              <h2 className="text-[22px] font-semibold text-[#14ae5c] mb-1">Approved!</h2>
              <p className="text-gray-500 text-[14px] text-center mb-6">
                Great job making your neighborhood cleaner!
              </p>

              <div className="bg-gradient-to-br from-[#fff9e6] to-[#fff3cc] rounded-2xl p-6 w-full text-center mb-6">
                <p className="text-[12px] text-gray-500 mb-2">Coins Earned</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="size-8 rounded-full border-2 border-[#f0a326] flex items-center justify-center">
                    <span className="text-[12px] font-bold text-[#f0a326]">$</span>
                  </div>
                  <span className="text-[40px] font-bold text-[#f0a326]">{coinsEarned}</span>
                </div>
              </div>

              {beforeImage && afterImage && (
                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    <img src={beforeImage} alt="Before" className="w-full h-[100px] object-cover" />
                    <div className="bg-red-50 px-2 py-1 text-[10px] text-red-500 font-medium text-center">Before</div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    <img src={afterImage} alt="After" className="w-full h-[100px] object-cover" />
                    <div className="bg-green-50 px-2 py-1 text-[10px] text-[#14ae5c] font-medium text-center">After</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => navigate('/activities')}
                  className="flex-1 bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                >
                  Done
                </button>
                <button
                  onClick={resetFlow}
                  className="flex-1 border-2 border-[#14ae5c] text-[#14ae5c] py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
                >
                  <RotateCcw className="size-4" /> Again
                </button>
              </div>
            </div>
          )}

          {/* Rejected */}
          {step === 'rejected' && (
            <div className="flex flex-col items-center pt-8">
              <div className="bg-red-50 rounded-3xl p-6 mb-4">
                <XCircle className="size-16 text-red-500" />
              </div>
              <h2 className="text-[22px] font-semibold text-red-500 mb-1">Not Approved</h2>
              <p className="text-gray-500 text-[14px] text-center mb-6 px-4">
                We couldn't detect enough improvement. Please try again with clearer photos.
              </p>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 w-full mb-6">
                <p className="text-[13px] font-semibold text-red-600 mb-2">Possible reasons:</p>
                <ul className="text-[12px] text-gray-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">-</span>
                    Photos are too similar
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">-</span>
                    Area doesn't show significant cleaning
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">-</span>
                    Photos are unclear or poorly lit
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={resetFlow}
                  className="flex-1 bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
                >
                  <RotateCcw className="size-4" /> Try Again
                </button>
                <button
                  onClick={() => navigate('/activities')}
                  className="flex-1 border-2 border-gray-200 text-gray-500 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}