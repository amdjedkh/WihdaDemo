import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Menu,
  ShoppingBag,
  MapPin,
  ChevronDown,
  X,
  User,
  Package,
  Flame,
  Award,
  Bell,
  HelpCircle,
  FileText,
  Info,
  Home as HomeIcon,
  Leaf,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

export default function Header({
  showBack = false,
  title,
}: HeaderProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { language } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { label: t(language, 'home'),         path: '/home',            Icon: HomeIcon },
    { label: t(language, 'myListings'),   path: '/my-listings',     Icon: Package },
    { label: t(language, 'myImpact'),     path: '/my-impact',       Icon: Flame },
    { label: t(language, 'myBadges'),     path: '/my-badges',       Icon: Award },
    { label: t(language, 'cleanHistory'), path: '/cleanify-history', Icon: Leaf },
    { label: t(language, 'profile'),      path: '/profile',         Icon: User },
    { label: t(language, 'settings'),     path: '/settings',        Icon: Settings },
    { label: t(language, 'notifications'), path: '/notifications',  Icon: Bell },
  ];

  const userName = profile?.name?.split(' ')[0] || 'Neighbor';
  const neighborhood = profile?.location || 'Set location';
  const coinsBalance = profile?.coins ?? 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t(language, 'goodMorning');
    if (hour < 17) return t(language, 'goodAfternoon');
    return t(language, 'goodEvening');
  };

  if (title) {
    return (
      <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 h-14">
          {showBack && (
            <button onClick={() => navigate(-1)} className="text-gray-800 -ml-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">{title}</h1>
        </div>
        <div className="flex items-center gap-2 bg-[#fff9e6] px-3 py-1.5 rounded-full">
          <div className="size-[16px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
            <span className="text-[7px] font-bold text-[#f0a326]">$</span>
          </div>
          <span className="text-[13px] font-semibold text-[#f0a326]">{coinsBalance}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-5 md:px-8 pt-[env(safe-area-inset-top)] pb-4 bg-gradient-to-b from-[#f0faf4] to-white dark:from-gray-900 dark:to-gray-900">
        <div className="flex items-center justify-between h-12">
          {/* Left side — store icon + coins */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/store')} className="text-gray-700 active:scale-90 transition-transform" aria-label="Store">
              <ShoppingBag className="size-5" />
            </button>
            <div className="flex items-center gap-1.5 bg-[#fff9e6] px-2.5 py-1.5 rounded-full">
              <div className="size-[16px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                <span className="text-[7px] font-bold text-[#f0a326]">$</span>
              </div>
              <span className="text-[13px] md:text-[15px] font-semibold text-[#f0a326]">{coinsBalance}</span>
            </div>
          </div>

          {/* Right side — menu */}
          <button
            className="text-gray-800"
            aria-label="Menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-6" />
          </button>
        </div>
        <div className="mt-1">
          <h2 className="text-[20px] md:text-[24px] font-semibold text-gray-900 font-[Poppins,sans-serif]">
            {getGreeting()}, {userName}
          </h2>
          <button onClick={() => navigate('/choose-location')} className="flex items-center gap-1 mt-0.5">
            <MapPin className="size-3 text-[#14ae5c]" />
            <span className="text-[12px] text-gray-500">{neighborhood}</span>
            <ChevronDown className="size-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />

          {/* Sidebar panel */}
          <div className="relative bg-white dark:bg-gray-900 w-[280px] md:w-[340px] h-full flex flex-col overflow-y-auto shadow-2xl">
            {/* Close button */}
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400">
              <X className="size-6" />
            </button>

            {/* Profile section */}
            <div className="pt-[env(safe-area-inset-top)] px-5 pb-5 bg-gradient-to-b from-[#f0faf4] to-white dark:from-gray-800 dark:to-gray-900 mt-12">
              <div className="flex items-center gap-3">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Profile" className="size-12 rounded-full object-cover" />
                ) : (
                  <div className="size-12 rounded-full bg-[#14ae5c]/10 flex items-center justify-center">
                    <User className="size-6 text-[#14ae5c]" />
                  </div>
                )}
                <div>
                  <p className="text-[15px] md:text-[17px] font-semibold text-gray-900">{profile?.name || 'Guest'}</p>
                  <p className="text-[12px] text-gray-400">{profile?.neighborhood?.name || 'No neighborhood'}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 mx-5" />

            {/* Menu items */}
            <nav className="flex-1 px-3 py-4">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <item.Icon className="size-5 text-gray-500 shrink-0" />
                  <span className="text-[14px] md:text-[16px] text-gray-700 font-medium">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Bottom links */}
            <div className="px-3 pb-8 border-t border-gray-100 pt-3">
              <button
                onClick={() => { navigate('/help-center'); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50"
              >
                <HelpCircle className="size-5 text-gray-500" />
                <span className="text-[14px] text-gray-700">{t(language, 'helpCenter')}</span>
              </button>
              <button
                onClick={() => { navigate('/terms'); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50"
              >
                <FileText className="size-5 text-gray-500" />
                <span className="text-[14px] text-gray-700">{t(language, 'terms')}</span>
              </button>
              <button
                onClick={() => { navigate('/about'); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50"
              >
                <Info className="size-5 text-gray-500" />
                <span className="text-[14px] text-gray-700">{t(language, 'aboutUs')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
