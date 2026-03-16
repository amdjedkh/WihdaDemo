import { useNavigate, useLocation } from 'react-router';
import { Home, Activity, Plus, Store, User } from 'lucide-react';

function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(5);
  }
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/activities', icon: Activity, label: 'Activities' },
    { path: '__fab__', icon: Plus, label: 'Add' },
    { path: '/store', icon: Store, label: 'Store' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 h-[64px] md:h-[72px] max-w-3xl mx-auto">
        {navItems.map((item) => {
          if (item.path === '__fab__') {
            return (
              <button
                key={item.path}
                onClick={() => {
                  triggerHaptic();
                  navigate('/home');
                }}
                className="flex items-center justify-center bg-[#14ae5c] text-white rounded-full size-[52px] md:size-[60px] shadow-lg shadow-[#14ae5c]/30 active:scale-90 transition-all duration-150 animate-pulse-ring mt-[-22px]"
                aria-label="Add"
              >
                <Plus className="size-6 md:size-7" strokeWidth={2.5} />
              </button>
            );
          }

          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => {
                if (!active) {
                  triggerHaptic();
                  navigate(item.path);
                }
              }}
              className={`flex flex-col items-center gap-0.5 px-3 md:px-5 py-1 rounded-xl transition-all duration-200 active:scale-90 ${
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
          );
        })}
      </div>
      <div className="mx-auto w-[134px] h-[4px] bg-black/80 rounded-full mb-1" />
    </div>
  );
}
