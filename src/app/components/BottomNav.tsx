import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Home, Activity, Plus, Store, User, X,
  Utensils, Package, Handshake, HeartHandshake, HelpCircle, ArrowLeftRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';

function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(5);
  }
}

const sheetActionDefs = [
  { id: 'leftovers',  labelKey: 'catLeftovers'  as const, subKey: 'catLeftoversSub'  as const, icon: Utensils,       color: 'text-orange-500', bg: 'bg-orange-50',  path: '/category/leftovers'  },
  { id: 'old-items',  labelKey: 'catOldItems'   as const, subKey: 'catOldItemsSub'   as const, icon: Package,        color: 'text-blue-500',   bg: 'bg-blue-50',    path: '/category/old-items'  },
  { id: 'borrow',     labelKey: 'catBorrow'     as const, subKey: 'catBorrowSub'     as const, icon: Handshake,      color: 'text-purple-500', bg: 'bg-purple-50',  path: '/category/borrow'     },
  { id: 'offer-help', labelKey: 'catOfferHelp'  as const, subKey: 'catOfferHelpSub'  as const, icon: HeartHandshake, color: 'text-green-500',  bg: 'bg-green-50',   path: '/category/offer-help' },
  { id: 'ask-help',   labelKey: 'catAskHelp'    as const, subKey: 'catAskHelpSub'    as const, icon: HelpCircle,     color: 'text-rose-500',   bg: 'bg-rose-50',    path: '/category/ask-help'   },
  { id: 'exchange',   labelKey: 'catExchange'   as const, subKey: 'catExchangeSub'   as const, icon: ArrowLeftRight, color: 'text-teal-500',   bg: 'bg-teal-50',    path: '/category/exchange'   },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/home',       icon: Home,     label: t(language, 'home')       },
    { path: '/activities', icon: Activity, label: t(language, 'activities') },
    { path: '__fab__',     icon: Plus,     label: 'Add'                     },
    { path: '/store',      icon: Store,    label: t(language, 'store')      },
    { path: '/profile',    icon: User,     label: t(language, 'profile')    },
  ];

  return (
    <>
      {/* Action Bottom Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet panel */}
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)] animate-slide-up shadow-2xl">
            {/* Handle bar */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {/* Close button */}
            <button
              onClick={() => setSheetOpen(false)}
              className="absolute top-4 right-5 size-8 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
            >
              <X className="size-4 text-gray-500" />
            </button>

            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">{t(language, 'whatToDo')}</h3>

            <div className="grid grid-cols-3 gap-3">
              {sheetActionDefs.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    triggerHaptic();
                    setSheetOpen(false);
                    navigate(action.path);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-90 transition-all duration-150"
                >
                  <div className={`${action.bg} rounded-xl p-3`}>
                    <action.icon className={`size-6 ${action.color}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-gray-800 leading-tight">{t(language, action.labelKey)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t(language, action.subKey)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-[max(env(safe-area-inset-bottom),var(--sab,0px))]">
        <div className="flex items-center h-[64px] md:h-[72px] max-w-3xl mx-auto">
          {navItems.map((item) => {
            if (item.path === '__fab__') {
              return (
                <div key={item.path} className="flex-1 flex justify-center">
                  <button
                    onClick={() => {
                      triggerHaptic();
                      setSheetOpen(true);
                    }}
                    className="flex items-center justify-center bg-[#14ae5c] text-white rounded-full size-[52px] md:size-[60px] shadow-lg shadow-[#14ae5c]/30 active:scale-90 transition-all duration-150 animate-pulse-ring mt-[-22px]"
                    aria-label="Add"
                  >
                    <Plus className="size-6 md:size-7" strokeWidth={2.5} />
                  </button>
                </div>
              );
            }

            const active = isActive(item.path);
            return (
              <div key={item.path} className="flex-1 flex justify-center">
                <button
                  onClick={() => {
                    if (!active) {
                      triggerHaptic();
                      navigate(item.path);
                    }
                  }}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 active:scale-90 ${
                    active ? 'text-[#14ae5c]' : 'text-gray-400'
                  }`}
                  aria-label={item.label}
                >
                  <div className="relative">
                    <item.icon
                      className={`size-[22px] md:size-[26px] transition-all duration-200 ${active ? 'scale-110' : ''}`}
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    {active && (
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#14ae5c]" />
                    )}
                  </div>
                  <span className={`text-[10px] md:text-[12px] transition-all duration-200 ${active ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
