import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import { ArrowLeft, X, Loader2, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { BADGE_IMAGES } from './Profile';

// ─── Badge metadata ───────────────────────────────────────────────────────────

const BADGE_BG: Record<string, string> = {
  food_saver:        'bg-orange-100',
  local_giver:       'bg-green-100',
  active_member:     'bg-blue-100',
  cleanify_champion: 'bg-emerald-100',
  citizen_of_month:  'bg-yellow-100',
  top_helper:        'bg-purple-100',
};

const BADGE_COLOR: Record<string, string> = {
  food_saver:        '#f97316',
  local_giver:       '#14ae5c',
  active_member:     '#3b82f6',
  cleanify_champion: '#10b981',
  citizen_of_month:  '#f0a326',
  top_helper:        '#8b5cf6',
};

const BADGE_EMOJI: Record<string, string> = {
  food_saver:        '🍞',
  local_giver:       '🤝',
  active_member:     '⚡',
  cleanify_champion: '🌿',
  citizen_of_month:  '🏆',
  top_helper:        '💪',
};

const BADGE_ACTION: Record<string, { label: string; path: string }> = {
  food_saver:        { label: 'Browse Activities', path: '/activities' },
  local_giver:       { label: 'Share with Neighbors', path: '/home' },
  active_member:     { label: 'Browse Activities', path: '/activities' },
  cleanify_champion: { label: 'Start Cleaning', path: '/clean-earn' },
  citizen_of_month:  { label: 'Browse Activities', path: '/activities' },
  top_helper:        { label: 'Browse Activities', path: '/activities' },
};

// ─── Badge icon component ─────────────────────────────────────────────────────

function BadgeIcon({
  badgeKey, size = 'md', locked = false,
}: {
  badgeKey: string; size?: 'sm' | 'md' | 'lg'; locked?: boolean;
}) {
  const img   = BADGE_IMAGES[badgeKey];
  const emoji = BADGE_EMOJI[badgeKey] || '🏅';
  const sizeClass = size === 'lg' ? 'size-24' : size === 'md' ? 'size-16' : 'size-10';
  const textSize  = size === 'lg' ? 'text-[56px]' : size === 'md' ? 'text-[36px]' : 'text-[22px]';

  if (img) {
    return (
      <img
        src={img}
        alt={badgeKey}
        className={`${sizeClass} object-contain ${locked ? 'grayscale opacity-50' : ''}`}
      />
    );
  }
  return <span className={`${textSize} ${locked ? 'grayscale opacity-50' : ''}`}>{emoji}</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyBadges() {
  const navigate = useNavigate();
  const [badges, setBadges]               = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  useEffect(() => {
    apiFetch('/v1/me/badges')
      .then(data => { if (data.success) setBadges(data.data.badges || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const earned = badges.filter(b => b.earned).length;

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-gray-50">

        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)] bg-white border-b border-gray-100">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 flex-1 font-[Poppins,sans-serif]">My Badges</h1>
            <span className="text-[13px] text-[#14ae5c] font-semibold bg-green-50 px-3 py-1 rounded-full">
              {earned}/{badges.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10 pt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
            </div>
          ) : (
            <>
              {/* Overall progress */}
              <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[16px] font-bold text-gray-900">Your Progress</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      {earned === badges.length && badges.length > 0
                        ? 'All badges earned! 🎉'
                        : `${badges.length - earned} badge${badges.length - earned !== 1 ? 's' : ''} remaining`}
                    </p>
                  </div>
                  <div className="size-14 rounded-full bg-[#14ae5c]/10 flex items-center justify-center">
                    <p className="text-[#14ae5c] text-[15px] font-bold">{earned}/{badges.length}</p>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#14ae5c] h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${badges.length ? (earned / badges.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Badge grid */}
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge: any) => {
                  const pct = badge.requirement_value
                    ? Math.min(100, Math.round(((badge.progress ?? 0) / badge.requirement_value) * 100))
                    : 0;
                  const bg    = BADGE_BG[badge.key]    || 'bg-gray-100';
                  const color = BADGE_COLOR[badge.key] || '#14ae5c';

                  return (
                    <button
                      key={badge.key}
                      onClick={() => setSelectedBadge(badge)}
                      className={`${badge.earned ? bg : 'bg-white border border-gray-100'} rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform text-center shadow-sm`}
                    >
                      {/* Badge icon */}
                      <div className="relative">
                        <BadgeIcon badgeKey={badge.key} size="md" locked={!badge.earned} />
                        {badge.earned && (
                          <div className="absolute -bottom-1 -right-1 size-5 bg-[#14ae5c] rounded-full flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="size-3 text-white" />
                          </div>
                        )}
                        {!badge.earned && (
                          <div className="absolute -bottom-1 -right-1 size-5 bg-gray-300 rounded-full flex items-center justify-center shadow-sm">
                            <Lock className="size-3 text-white" />
                          </div>
                        )}
                      </div>

                      <span className={`text-[12px] font-semibold leading-tight ${badge.earned ? 'text-gray-800' : 'text-gray-400'}`}>
                        {badge.name}
                      </span>

                      {badge.earned ? (
                        <span className="text-[10px] bg-white/60 text-[#14ae5c] px-2.5 py-0.5 rounded-full font-semibold">
                          Earned ✓
                        </span>
                      ) : (
                        <>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {badge.progress ?? 0} / {badge.requirement_value}
                          </span>
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
            <div className="relative bg-white rounded-t-3xl w-full px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-2xl">

              {/* Handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-5 size-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="size-4 text-gray-500" />
              </button>

              {/* Badge hero */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className={`${selectedBadge.earned ? (BADGE_BG[selectedBadge.key] || 'bg-gray-100') : 'bg-gray-100'} rounded-3xl p-5 mb-3`}>
                  <BadgeIcon badgeKey={selectedBadge.key} size="lg" locked={!selectedBadge.earned} />
                </div>
                <h2 className="text-[20px] font-bold text-gray-900">{selectedBadge.name}</h2>
                {selectedBadge.earned ? (
                  <span className="text-[12px] bg-green-50 text-[#14ae5c] px-3 py-1 rounded-full mt-1.5 font-semibold">
                    Earned ✓
                  </span>
                ) : (
                  <span className="text-[12px] bg-gray-100 text-gray-400 px-3 py-1 rounded-full mt-1.5 font-medium flex items-center gap-1">
                    <Lock className="size-3" /> Locked
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <p className="text-[13px] text-gray-600 leading-relaxed text-center">
                  {selectedBadge.description || 'Complete community activities to earn this badge.'}
                </p>
              </div>

              {/* Progress */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-semibold text-gray-700">Progress</p>
                  <p className="text-[13px] font-semibold" style={{ color: BADGE_COLOR[selectedBadge.key] || '#14ae5c' }}>
                    {selectedBadge.progress ?? 0} / {selectedBadge.requirement_value}
                  </p>
                </div>
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{
                      width: `${selectedBadge.requirement_value
                        ? Math.min(100, Math.round(((selectedBadge.progress ?? 0) / selectedBadge.requirement_value) * 100))
                        : 0}%`,
                      backgroundColor: BADGE_COLOR[selectedBadge.key] || '#14ae5c',
                    }}
                  />
                </div>
                {!selectedBadge.earned && (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {selectedBadge.requirement_value - (selectedBadge.progress ?? 0)} more to go!
                  </p>
                )}
                {selectedBadge.earned && selectedBadge.earned_at && (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Earned on {new Date(selectedBadge.earned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* CTA */}
              {!selectedBadge.earned && BADGE_ACTION[selectedBadge.key] && (
                <button
                  onClick={() => { setSelectedBadge(null); navigate(BADGE_ACTION[selectedBadge.key].path); }}
                  className="w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-white"
                  style={{ backgroundColor: BADGE_COLOR[selectedBadge.key] || '#14ae5c' }}
                >
                  {BADGE_ACTION[selectedBadge.key].label}
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
