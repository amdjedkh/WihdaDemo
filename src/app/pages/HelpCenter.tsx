import { useState } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, ChevronDown, ChevronUp, Mail, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';

const faqs = [
  {
    category: 'Using the App',
    questions: [
      { q: 'How do I post an item?', a: 'Go to any category from the Home screen, tap the + button, fill in the details and submit. Make sure your account is verified to post.' },
      { q: 'How do I join a neighborhood?', a: 'Tap the location button at the top of the Home screen, find your neighborhood on the map, and tap Join.' },
      { q: 'Why do I need to verify my identity?', a: 'Verification helps build trust in the community. Verified users can post items, request exchanges, and interact with neighbors.' },
    ],
  },
  {
    category: 'Exchanges',
    questions: [
      { q: 'How does matching work?', a: "When you post an offer or a need, our system automatically matches you with compatible neighbors. You'll be notified when a match is found." },
      { q: 'How do I confirm an exchange?', a: 'Open the chat with your match, then tap "I gave / received the item" once the exchange is done. The other party must confirm within 5 minutes.' },
      { q: "What happens if an exchange doesn't work out?", a: 'You can cancel from the chat at any time before confirming. No coins are deducted for cancelled exchanges.' },
    ],
  },
  {
    category: 'Coins',
    questions: [
      { q: 'How do I earn coins?', a: 'You earn coins by completing exchanges (200 coins as giver, 50 as receiver), completing Clean & Earn tasks (150 coins), and other community activities.' },
      { q: 'How do I redeem coins?', a: 'Visit the Rewards Store from the Home screen. Browse available rewards, check if you have enough coins, and tap Redeem.' },
      { q: 'Do coins expire?', a: 'No, your earned coins never expire. They stay in your account until you use them.' },
    ],
  },
  {
    category: 'Neighborhood Features',
    questions: [
      { q: 'Can I be in multiple neighborhoods?', a: 'Currently you can be a member of one primary neighborhood. Neighborhoods are defined by geographic boundaries.' },
      { q: 'How do I create a new neighborhood?', a: 'In the Choose Location screen, switch to "Create" mode, draw the neighborhood boundary on the map, fill in the name and details, then submit.' },
      { q: 'Who can see posts in my neighborhood?', a: 'Posts are visible to all members of the same neighborhood, creating a trusted local community.' },
    ],
  },
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const { language } = useApp();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [contactName, setContactName] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  const toggle = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    // In production this would POST to a support endpoint
    setMessageSent(true);
    setContactName('');
    setContactMessage('');
  };

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
            <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white flex-1 font-[Poppins,sans-serif]">{t(language, 'helpCenterTitle')}</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10 px-5">
          {/* Hero */}
          <div className="bg-gradient-to-r from-[#14ae5c] to-emerald-500 rounded-2xl p-5 mb-6">
            <p className="text-white font-semibold text-[16px] mb-1">{t(language, 'howCanWeHelp')}</p>
            <p className="text-white/80 text-[13px]">{t(language, 'helpHeroDesc')}</p>
          </div>

          {/* FAQs */}
          {faqs.map((section) => (
            <div key={section.category} className="mb-5">
              <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2">{section.category}</h3>
              <div className="space-y-2">
                {section.questions.map((item, i) => {
                  const key = `${section.category}-${i}`;
                  const isOpen = openItems.has(key);
                  return (
                    <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                      >
                        <span className="text-[13px] font-medium text-gray-800 dark:text-gray-100 flex-1 pr-4">{item.q}</span>
                        {isOpen ? <ChevronUp className="size-4 text-gray-400 shrink-0" /> : <ChevronDown className="size-4 text-gray-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Contact Support */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-5">
            <h3 className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 mb-3">{t(language, 'contactSupportTitle')}</h3>
            <div className="flex items-center gap-3 mb-2">
              <Mail className="size-4 text-blue-500 shrink-0" />
              <a href="mailto:contact@wihdaapp.com" className="text-[13px] text-blue-600 dark:text-blue-400 font-medium">contact@wihdaapp.com</a>
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">{t(language, 'respondTime')}</p>
          </div>

          {/* Contact Form */}
          {messageSent ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
              <p className="text-[14px] font-semibold text-green-700 dark:text-green-400">{t(language, 'messageSentTitle')}</p>
              <p className="text-[12px] text-green-600 dark:text-green-500 mt-1">We'll get back to you at contact@wihdaapp.com</p>
              <button onClick={() => setMessageSent(false)} className="mt-3 text-[13px] text-[#14ae5c] font-medium">{t(language, 'sendAnotherMsg')}</button>
            </div>
          ) : (
            <div>
              <h3 className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 mb-3">{t(language, 'askUs')}</h3>
              <form onSubmit={handleSendMessage} className="space-y-3">
                <input
                  type="text"
                  placeholder={t(language, 'namePlaceholder')}
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none"
                />
                <textarea
                  placeholder={t(language, 'questionPlaceholder')}
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none resize-none"
                />
                <button
                  type="submit"
                  disabled={!contactMessage.trim()}
                  className="w-full bg-[#14ae5c] text-white py-3 rounded-xl text-[14px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="size-4" /> {t(language, 'sendMessage')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
