import { useState } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import imgWihdaTextLogo1 from "../../assets/ee118e5efe643d9ee6880fd61bb3d74d5253e1aa.png";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

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
      setError(result.error);
    } else {
      navigate('/home');
    }
  };

  return (
    <MobileContainer>
      <div className="flex flex-col size-full bg-white">
        {/* Top gradient area */}
        <div className="bg-gradient-to-b from-[#f0faf4] to-white pt-16 pb-8 px-8 flex flex-col items-center">
          <img src={imgWihdaTextLogo1} alt="Wihda" className="w-[180px] object-contain mb-4" />
          <p className="text-gray-400 text-[13px] tracking-widest">CONNECTING NEIGHBORS</p>
        </div>

        {/* Form */}
        <div className="flex-1 px-6 pt-4">
          <h2 className="text-[24px] font-bold text-gray-900 mb-1 font-[Poppins,sans-serif]">Welcome back</h2>
          <p className="text-[14px] text-gray-400 mb-8">Sign in to your account</p>

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
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-[14px] placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors"
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-12 py-3.5 text-[14px] placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#14ae5c] text-white py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="size-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[12px] text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Skip for now */}
          <button
            onClick={() => navigate('/home')}
            className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-[14px] font-medium active:scale-[0.98] transition-all"
          >
            Continue as Guest
          </button>
        </div>

        {/* Bottom signup link */}
        <div className="px-6 pb-10 pt-4 text-center">
          <p className="text-[14px] text-gray-500">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-[#14ae5c] font-semibold"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </MobileContainer>
  );
}
