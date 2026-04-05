import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  MessageCircle,
  Award,
  Sparkles,
  Package,
  Calendar,
  Loader2,
  BellOff,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

function localizeNotif(n: { type: string; title: string; body: string }, language: string): { title: string; body: string } {
  if (language !== 'ar') return { title: n.title, body: n.body };
  const ar: Record<string, { title: string; body?: string }> = {
    cleanify_approved: { title: 'تمت الموافقة على التقديم! 🎉' },
    cleanify_rejected: { title: 'لم تتم الموافقة على التقديم' },
    leftover_request: { title: 'طلب جديد على عرضك!' },
    match_closed: { title: 'اكتمل التبادل' },
    new_message: { title: 'رسالة جديدة' },
    new_activity: { title: 'نشاط جديد في حيّك! 🎉' },
  };
  const override = ar[n.type];
  if (!override) return { title: n.title, body: n.body };
  return { title: override.title, body: override.body ?? n.body };
}

const notifIcon = (type: string) => {
  if (type === 'new_message') return <MessageCircle className="size-5 text-blue-500" />;
  if (type === 'cleanify_approved') return <Sparkles className="size-5 text-[#14ae5c]" />;
  if (type === 'cleanify_rejected') return <Sparkles className="size-5 text-red-500" />;
  if (type === 'match_closed') return <CheckCircle2 className="size-5 text-[#14ae5c]" />;
  if (type.includes('coin')) return <Award className="size-5 text-[#f0a326]" />;
  if (type === 'new_activity') return <Calendar className="size-5 text-purple-500" />;
  return <Bell className="size-5 text-gray-400" />;
};

const notifBg = (type: string) => {
  if (type === 'new_message') return 'bg-blue-50';
  if (type === 'cleanify_approved') return 'bg-green-50';
  if (type === 'cleanify_rejected') return 'bg-red-50';
  if (type === 'match_closed') return 'bg-green-50';
  if (type.includes('coin')) return 'bg-yellow-50';
  if (type === 'new_activity') return 'bg-purple-50';
  return 'bg-gray-50';
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/v1/notifications');
      if (data.success) {
        setNotifications(data.data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;

    try {
      await apiFetch('/v1/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ notification_ids: unreadIds }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifTap = async (notif: Notification) => {
    // Mark as read
    if (!notif.read) {
      try {
        await apiFetch('/v1/notifications/read', {
          method: 'POST',
          body: JSON.stringify({ notification_ids: [notif.id] }),
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch {}
    }
    // Navigate based on type and data
    const data = notif.data as any;
    if (data?.thread_id) {
      navigate(`/chat/${data.thread_id}`);
    } else if (notif.type === 'cleanify_approved' || notif.type === 'cleanify_rejected') {
      navigate('/clean-and-earn');
    } else if (notif.type === 'new_activity') {
      navigate('/activities');
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate(-1)} className="text-gray-800 dark:text-gray-200">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white font-[Poppins,sans-serif]">
              {t(language, 'notificationsTitle')}
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </h1>
            {unreadCount > 0 ? (
              <button
                onClick={markAllRead}
                className="text-[#14ae5c] text-[12px] font-medium"
              >
                {t(language, 'markAllRead')}
              </button>
            ) : (
              <div className="w-16" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-28">
          {!user ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <BellOff className="size-12 text-gray-300 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-[14px] font-medium">{t(language, 'signInForNotifs')}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 bg-[#14ae5c] text-white px-6 py-2.5 rounded-xl text-[13px] font-semibold"
              >
                {t(language, 'signIn')}
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="size-8 text-[#14ae5c] animate-spin mb-2" />
              <p className="text-gray-400 text-[13px]">{t(language, 'loadingNotifs')}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Bell className="size-12 text-gray-300 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-[14px] font-medium">{t(language, 'noNotifs')}</p>
              <p className="text-gray-400 text-[12px] mt-1 text-center">
                {t(language, 'noNotifsDesc')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notif) => {
                const { title: localTitle, body: localBody } = localizeNotif(notif, language);
                return (
                <div
                  key={notif.id}
                  onClick={() => handleNotifTap(notif)}
                  className={`flex items-start gap-3 px-5 py-4 active:bg-gray-100 cursor-pointer ${!notif.read ? 'bg-green-50/30' : ''}`}
                >
                  <div className={`${notifBg(notif.type)} rounded-full p-2.5 shrink-0 mt-0.5`}>
                    {notifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[14px] font-semibold text-gray-800 ${!notif.read ? 'text-gray-900' : ''}`}>
                        {localTitle}
                      </p>
                      {!notif.read && (
                        <div className="size-2 rounded-full bg-[#14ae5c] shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-[13px] text-gray-500 mt-0.5 leading-snug">{localBody}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
