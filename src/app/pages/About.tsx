import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, Leaf, Users, Award, Heart, Globe, Phone, Mail, FlaskConical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';

const APP_VERSION = '1.0.0-beta';

export default function About() {
  const navigate = useNavigate();
  const { language } = useApp();

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-800 dark:text-gray-200">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white flex-1 font-[Poppins,sans-serif]">{t(language, 'aboutTitle')}</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10 px-5">
          {/* Hero */}
          <div className="bg-gradient-to-r from-[#14ae5c] to-emerald-500 rounded-2xl p-6 mb-4 flex flex-col items-center text-center">
            <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
              <Leaf className="size-8 text-white" />
            </div>
            <h2 className="text-white text-[22px] font-bold font-[Poppins,sans-serif]">Wihda</h2>
            <p className="text-white/80 text-[13px] mt-1">Version {APP_VERSION}</p>
            <p className="text-white/90 text-[13px] mt-3 leading-relaxed">
              Connecting neighbors to share resources, reduce waste, and build stronger communities.
            </p>
          </div>

          {/* Beta notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <div className="bg-amber-100 dark:bg-amber-800 rounded-full p-2 shrink-0">
              <FlaskConical className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">{t(language, 'betaBadge')} Version</p>
              <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5">{t(language, 'betaDesc')}</p>
            </div>
          </div>

          {/* Mission */}
          <div className="mb-5">
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">{t(language, 'ourMission')}</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
              <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
                Wihda (وحدة) means "unity" in Arabic. We believe that communities thrive when neighbors
                help each other. Our platform makes it easy to share food, goods, and skills with the
                people living right next door — reducing waste, fostering connections, and rewarding
                those who give back.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="mb-5">
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">{t(language, 'whatWeStandFor')}</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-full p-2 shrink-0">
                  <Users className="size-4 text-[#14ae5c]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Community First</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">Every feature is built to strengthen local bonds and encourage neighbor-to-neighbor interaction.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-full p-2 shrink-0">
                  <Leaf className="size-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Reduce Waste</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">By sharing what we have and cleaning up what we find, we make our neighborhoods cleaner and greener.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-full p-2 shrink-0">
                  <Award className="size-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Reward Good Actions</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">Earn coins and badges for every positive contribution. Good deeds deserve recognition.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                <div className="bg-red-50 dark:bg-red-900/30 rounded-full p-2 shrink-0">
                  <Heart className="size-4 text-red-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Trust &amp; Safety</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">Verified identities and neighborhood boundaries ensure you always know who you're dealing with.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mb-5">
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">{t(language, 'contactTitle')}</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-[#14ae5c] shrink-0" />
                <a href="mailto:contact@wihdaapp.com" className="text-[13px] text-[#14ae5c] font-medium">contact@wihdaapp.com</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="size-4 text-[#14ae5c] shrink-0" />
                <a href="tel:+213549599182" className="text-[13px] text-gray-600 dark:text-gray-300">+213 549 599 182</a>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="size-4 text-[#14ae5c] shrink-0" />
                <a href="https://wihdaapp.com" target="_blank" rel="noreferrer" className="text-[13px] text-[#14ae5c] font-medium">wihdaapp.com</a>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-300 dark:text-gray-600 mt-4">© 2025 Wihda. All rights reserved.</p>
        </div>
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
