import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import { ArrowLeft, X, Loader2, ArrowRight } from 'lucide-react';

const BADGE_ACTIVITIES: Record<string, { label: string; path: string }> = {
  food_saver: { label: 'Share Food', path: '/category/leftovers' },
  active_member: { label: 'Browse & Interact', path: '/home' },
  citizen_of_month: { label: 'Join Activities', path: '/activities' },
  local_giver: { label: 'Help Neighbors', path: '/home' },
  cleanify_champion: { label: 'Start Cleaning', path: '/clean-earn' },
  top_helper: { label: 'Complete Exchanges', path: '/home' },
};

export default function MyBadges() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  useEffect(() => {
    apiFetch('/v1/me/badges')
      .then(data => { if (data.success) setBadges(data.data.badges || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const earned = badges.filter(b => b.earned).length;

  const bgColors: Record<string, string> = {
    food_saver: 'bg-orange-50', active_member: 'bg-blue-50',
    citizen_of_month: 'bg-yellow-50', local_giver: 'bg-green-50',
    cleanify_champion: 'bg-emerald-50', top_helper: 'bg-purple-50',
  };

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-white">
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-800"><ArrowLeft className="size-6" /></button>
            <h1 className="text-[18px] font-semibold text-gray-900 flex-1 font-[Poppins,sans-serif]">My Badges</h1>
            <span className="text-[13px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{earned}/{badges.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-8 text-[#14ae5c] animate-spin" /></div>
          ) : (
            <>
              {/* Progress overview */}
              <div className="bg-gradient-to-r from-[#14ae5c] to-emerald-500 rounded-2xl p-4 mb-5">
                <p className="text-white font-semibold text-[15px] mb-2">Your Progress</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ width: `${badges.length ? (earned / badges.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-white text-[13px] font-medium">{earned}/{badges.length}</span>
                </div>
              </div>

              {/* Badge grid */}
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge: any) => {
                  const bg = badge.color || bgColors[badge.key] || 'bg-gray-50';
                  const pct = badge.requirement_value ? Math.min(100, Math.round(((badge.progress ?? 0) / badge.requirement_value) * 100)) : 0;
                  return (
                    <button
                      key={badge.key}
                      onClick={() => setSelectedBadge(badge)}
                      className={`${bg} rounded-2xl p-4 flex flex-col items-center gap-2 ${!badge.earned ? 'opacity-60' : ''} active:scale-95 transition-transform text-center`}
                    >
                      <span className="text-[32px]">{badge.icon}</span>
                      <span className="text-[12px] font-semibold text-gray-800 leading-tight">{badge.name}</span>
                      {badge.earned ? (
                        <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Earned ✓</span>
                      ) : (
                        <>
                          <div className="w-full bg-black/10 rounded-full h-1.5">
                            <div className="bg-current h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500">{badge.progress ?? 0}/{badge.requirement_value}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Badge Detail Bottom Sheet */}
        {selectedBadge && (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedBadge(null)} />
            <div className="relative bg-white rounded-t-3xl w-full max-w-[430px] mx-auto p-6 pb-10">
              <button onClick={() => setSelectedBadge(null)} className="absolute top-4 right-4 text-gray-400">
                <X className="size-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-5">
                <span className="text-[48px] mb-3">{selectedBadge.icon}</span>
                <h2 className="text-[20px] font-bold text-gray-900">{selectedBadge.name}</h2>
                {selectedBadge.earned && (
                  <span className="text-[12px] bg-green-50 text-green-600 px-3 py-1 rounded-full mt-1 font-medium">Earned ✓</span>
                )}
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <p className="text-[13px] text-gray-600 leading-relaxed">{selectedBadge.description || 'Complete community activities to earn this badge.'}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-semibold text-gray-700">Progress</p>
                  <p className="text-[13px] text-gray-500">{selectedBadge.progress ?? 0} / {selectedBadge.requirement_value}</p>
                </div>
                <div className="bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-[#14ae5c] h-3 rounded-full transition-all"
                    style={{ width: `${selectedBadge.requirement_value ? Math.min(100, Math.round(((selectedBadge.progress ?? 0) / selectedBadge.requirement_value) * 100)) : 0}%` }}
                  />
                </div>
                {!selectedBadge.earned && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {(selectedBadge.requirement_value - (selectedBadge.progress ?? 0))} more to go!
                  </p>
                )}
              </div>

              {!selectedBadge.earned && BADGE_ACTIVITIES[selectedBadge.key] && (
                <button
                  onClick={() => { setSelectedBadge(null); navigate(BADGE_ACTIVITIES[selectedBadge.key].path); }}
                  className="w-full bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  {BADGE_ACTIVITIES[selectedBadge.key].label}
                  <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
