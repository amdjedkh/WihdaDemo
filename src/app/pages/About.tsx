import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, Leaf, Users, Award, Heart } from 'lucide-react';

const APP_VERSION = '1.0.0';

export default function About() {
  const navigate = useNavigate();

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-white">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 flex-1 font-[Poppins,sans-serif]">About Us</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10 px-5">
          {/* Hero */}
          <div className="bg-gradient-to-r from-[#14ae5c] to-emerald-500 rounded-2xl p-6 mb-6 flex flex-col items-center text-center">
            <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
              <Leaf className="size-8 text-white" />
            </div>
            <h2 className="text-white text-[22px] font-bold font-[Poppins,sans-serif]">Wihda</h2>
            <p className="text-white/80 text-[13px] mt-1">Version {APP_VERSION}</p>
            <p className="text-white/90 text-[13px] mt-3 leading-relaxed">
              Connecting neighbors to share resources, reduce waste, and build stronger communities.
            </p>
          </div>

          {/* Mission */}
          <div className="mb-5">
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">Our Mission</h3>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[13px] text-gray-600 leading-relaxed">
                Wihda (وحدة) means "unity" in Arabic. We believe that communities thrive when neighbors
                help each other. Our platform makes it easy to share food, goods, and skills with the
                people living right next door — reducing waste, fostering connections, and rewarding
                those who give back.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="mb-5">
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">What We Stand For</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
                <div className="bg-green-50 rounded-full p-2 shrink-0">
                  <Users className="size-4 text-[#14ae5c]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">Community First</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Every feature is built to strengthen local bonds and encourage neighbor-to-neighbor interaction.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
                <div className="bg-blue-50 rounded-full p-2 shrink-0">
                  <Leaf className="size-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">Reduce Waste</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">By sharing what we have and cleaning up what we find, we make our neighborhoods cleaner and greener.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
                <div className="bg-yellow-50 rounded-full p-2 shrink-0">
                  <Award className="size-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">Reward Good Actions</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Earn coins and badges for every positive contribution. Good deeds deserve recognition.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
                <div className="bg-red-50 rounded-full p-2 shrink-0">
                  <Heart className="size-4 text-red-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">Trust &amp; Safety</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Verified identities and neighborhood boundaries ensure you always know who you're dealing with.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="mb-5">
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</h3>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[13px] text-gray-600">
                Questions or feedback? Reach us at{' '}
                <a href="mailto:contact@whtapp.com" className="text-[#14ae5c] font-medium">contact@whtapp.com</a>
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-300 mt-4">© 2025 Wihda. All rights reserved.</p>
        </div>
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
