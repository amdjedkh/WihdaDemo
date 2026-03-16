import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import { Clock, ShieldCheck, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VerifyPending() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

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
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="bg-blue-50 rounded-3xl p-6 mb-6">
            <Clock className="size-16 text-blue-500" />
          </div>

          <h2 className="text-[24px] font-bold text-gray-900 text-center mb-2 font-[Poppins,sans-serif]">
            Identity Verification Pending
          </h2>
          <p className="text-[14px] text-gray-500 text-center mb-8 leading-relaxed">
            Your account requires identity verification before you can fully access Wihda.
            Please upload your ID documents to get started.
          </p>

          {/* Steps */}
          <div className="w-full space-y-3 mb-8">
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3.5">
              <div className="bg-[#14ae5c] text-white rounded-full size-7 flex items-center justify-center text-[11px] font-bold shrink-0">
                ✓
              </div>
              <p className="text-[13px] text-gray-700">Account created</p>
            </div>
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3.5">
              <div className="bg-[#14ae5c] text-white rounded-full size-7 flex items-center justify-center text-[11px] font-bold shrink-0">
                ✓
              </div>
              <p className="text-[13px] text-gray-700">Contact verified</p>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3.5">
              <div className="bg-blue-400 text-white rounded-full size-7 flex items-center justify-center shrink-0">
                <Clock className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] text-gray-700 font-medium">Identity verification</p>
                <p className="text-[11px] text-gray-500">Upload your ID documents to proceed</p>
              </div>
              <button
                onClick={() => navigate('/verify-identity')}
                className="bg-blue-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-all"
              >
                Verify Now
              </button>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5 opacity-50">
              <div className="bg-gray-300 text-white rounded-full size-7 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4" />
              </div>
              <p className="text-[13px] text-gray-500">Full access granted</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 w-full mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <Mail className="size-4 text-gray-500" />
              <p className="text-[13px] font-semibold text-gray-800">We'll notify you by email</p>
            </div>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              Once your identity is verified, you'll receive an email confirmation and can log in with full access.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-[#14ae5c] text-white py-3.5 rounded-xl text-[15px] font-semibold active:scale-[0.98] transition-all"
          >
            Log out
          </button>
        </div>
      </div>
    </MobileContainer>
  );
}
