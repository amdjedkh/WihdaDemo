import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the Wihda mobile application ("App"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the App.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 18 years old and a resident of a supported neighborhood to use Wihda. By using the App, you confirm that you meet these requirements.',
  },
  {
    title: '3. User Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, complete information during registration and to keep your profile up to date. Wihda reserves the right to suspend or terminate accounts that violate these Terms.',
  },
  {
    title: '4. Community Standards',
    body: 'Users must interact respectfully and honestly. Any form of harassment, fraud, or misuse of the platform — including fake listings, abuse of the exchange system, or manipulating the coin system — will result in immediate account suspension.',
  },
  {
    title: '5. Listings and Exchanges',
    body: 'All items posted must be legal, accurately described, and genuinely available. Wihda is not a party to any exchange between users. Users are responsible for ensuring items are safe and as described before completing an exchange. Wihda does not guarantee the quality, safety, or legality of any item posted.',
  },
  {
    title: '6. Coins and Rewards',
    body: 'Coins are virtual credits earned through community activity. They have no cash value and cannot be transferred or sold. Wihda reserves the right to modify, suspend, or discontinue the coin system at any time without notice.',
  },
  {
    title: '7. Privacy',
    body: 'We collect minimal personal information required to operate the App. Your location data is used only to match you with your neighborhood. We do not sell your personal data to third parties. Please see our Privacy Policy for full details.',
  },
  {
    title: '8. Intellectual Property',
    body: 'All content, designs, and software in the App are the intellectual property of Wihda or its licensors. You may not copy, reproduce, or distribute any part of the App without prior written consent.',
  },
  {
    title: '9. Disclaimer of Warranties',
    body: 'The App is provided "as is" without warranties of any kind. Wihda does not warrant that the App will be uninterrupted, error-free, or free of harmful components.',
  },
  {
    title: '10. Limitation of Liability',
    body: 'To the fullest extent permitted by law, Wihda shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the App or any exchange conducted through it.',
  },
  {
    title: '11. Changes to Terms',
    body: 'We reserve the right to update these Terms at any time. Continued use of the App after changes are posted constitutes acceptance of the revised Terms.',
  },
  {
    title: '12. Contact',
    body: 'For questions about these Terms, contact us at contact@whtapp.com.',
  },
];

export default function Terms() {
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
            <h1 className="text-[18px] font-semibold text-gray-900 flex-1 font-[Poppins,sans-serif]">Terms &amp; Conditions</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10 px-5">
          {/* Intro */}
          <div className="bg-gradient-to-r from-[#14ae5c] to-emerald-500 rounded-2xl p-5 mb-6">
            <p className="text-white font-semibold text-[15px] mb-1">Terms &amp; Conditions</p>
            <p className="text-white/80 text-[12px]">Last updated: March 2025</p>
            <p className="text-white/80 text-[12px] mt-2 leading-relaxed">
              Please read these terms carefully before using Wihda. They govern your use of the App and your participation in the community.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.title} className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-[13px] font-semibold text-gray-800 mb-2">{section.title}</h3>
                <p className="text-[12px] text-gray-500 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-gray-300 mt-6">© 2025 Wihda. All rights reserved.</p>
        </div>
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
