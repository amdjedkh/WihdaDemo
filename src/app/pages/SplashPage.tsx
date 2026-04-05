import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import imgWihdaTextLogo1 from "figma:asset/ee118e5efe643d9ee6880fd61bb3d74d5253e1aa.png";
import { getStoredToken } from '../lib/api';

export default function SplashPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('exit'), 2000);
    const t3 = setTimeout(() => {
      // Check if user has a stored JWT token
      const token = getStoredToken();
      if (token) {
        navigate('/home');
      } else {
        navigate('/login');
      }
    }, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [navigate]);

  return (
    <div className="h-screen w-full bg-white flex items-center justify-center">
      <div className="bg-white relative w-full max-w-[430px] h-full sm:h-[812px] overflow-hidden sm:shadow-2xl sm:rounded-[2.5rem] sm:border sm:border-gray-200/50">
        <div
          className={`flex flex-col items-center justify-center size-full bg-white transition-all duration-700 ease-out ${
            phase === 'exit' ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
        >
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-10 -right-10 size-40 rounded-full bg-[#52ADE5]/10 transition-all duration-1000"
              style={{
                transform: phase === 'enter' ? 'scale(0)' : 'scale(1)',
                opacity: phase === 'enter' ? 0 : 1,
              }}
            />
            <div
              className="absolute top-1/4 -left-8 size-24 rounded-full bg-[#14ae5c]/10 transition-all duration-1000 delay-100"
              style={{
                transform: phase === 'enter' ? 'scale(0)' : 'scale(1)',
                opacity: phase === 'enter' ? 0 : 1,
              }}
            />
            <div
              className="absolute bottom-1/3 -right-6 size-32 rounded-full bg-[#52ADE5]/8 transition-all duration-1000 delay-200"
              style={{
                transform: phase === 'enter' ? 'scale(0)' : 'scale(1)',
                opacity: phase === 'enter' ? 0 : 1,
              }}
            />
            <div
              className="absolute -bottom-10 left-1/4 size-28 rounded-full bg-[#14ae5c]/8 transition-all duration-1000 delay-300"
              style={{
                transform: phase === 'enter' ? 'scale(0)' : 'scale(1)',
                opacity: phase === 'enter' ? 0 : 1,
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Animated dot */}
            <div
              className="size-6 rounded-full bg-[#52ADE5] mb-4 transition-all duration-700"
              style={{
                transform: phase === 'enter' ? 'translateY(-20px) scale(0)' : 'translateY(0) scale(1)',
                opacity: phase === 'enter' ? 0 : 1,
              }}
            />

            {/* Logo */}
            <img
              src={imgWihdaTextLogo1}
              alt="Wihda"
              className="w-[260px] object-contain transition-all duration-700 delay-200"
              style={{
                transform: phase === 'enter' ? 'translateY(20px)' : 'translateY(0)',
                opacity: phase === 'enter' ? 0 : 1,
              }}
            />

            {/* Tagline */}
            <p
              className="text-gray-400 text-[13px] mt-6 tracking-widest transition-all duration-700 delay-400"
              style={{
                opacity: phase === 'enter' ? 0 : 0.7,
                transform: phase === 'enter' ? 'translateY(10px)' : 'translateY(0)',
              }}
            >
              CONNECTING NEIGHBORS
            </p>

            {/* Loading bar */}
            <div className="mt-10 w-[120px] h-[3px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#14ae5c] rounded-full transition-all ease-linear"
                style={{
                  width: phase === 'enter' ? '0%' : phase === 'hold' ? '80%' : '100%',
                  transitionDuration: phase === 'hold' ? '1600ms' : '400ms',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}