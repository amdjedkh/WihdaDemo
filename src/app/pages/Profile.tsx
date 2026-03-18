import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { apiFetch, apiUpload, API_BASE } from '../lib/api';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  Settings,
  Edit3,
  Award,
  Flame,
  Clock,
  Package,
  Users,
  ChevronRight,
  Crown,
  BadgeCheck,
  MapPin,
  LogOut,
  User,
  Bell,
  Camera,
  Loader2,
  Leaf,
  ShieldAlert,
} from 'lucide-react';


interface CoinEntry {
  id: string;
  amount: number;
  category: string;
  description: string;
  created_at: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { profile, user, signOut, loading: authLoading, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'activity' | 'coins'>('activity');
  const [coinEntries, setCoinEntries] = useState<CoinEntry[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [stats, setStats] = useState({ cleanify_count: 0, shared_count: 0, volunteer_count: 0 });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isGuest = !user;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await apiUpload('/v1/me/photo', formData);
      await refreshProfile();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      // Reset input so same file can be re-selected
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (user && activeTab === 'coins') {
      setLoadingCoins(true);
      apiFetch('/v1/me/coins')
        .then(data => {
          if (data.success) {
            setCoinEntries(data.data.entries || []);
          }
        })
        .catch(err => console.error('Failed to load coin history:', err))
        .finally(() => setLoadingCoins(false));
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      setLoadingBadges(true);
      apiFetch('/v1/me/badges')
        .then(data => {
          if (data.success) {
            setUserBadges(data.data.badges || []);
            if (data.data.stats) setStats(data.data.stats);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingBadges(false));
    }
  }, [user]);

  const handleSignOut = async () => {
    signOut();
    navigate('/login');
  };

  const displayName = profile?.name || 'Guest User';
  const displayLocation = profile?.location || 'Set your location';
  const displayBio = profile?.bio || (isGuest ? 'Sign in to set up your profile' : 'Tap Edit Profile to add a bio');
  const displayCoins = profile?.coins ?? 0;
  const displayPhoto = profile?.photoUrl || '';

  return (
    <MobileContainer>
      <PageTransition>
      <Toaster position="top-center" />
      <div className="flex flex-col size-full bg-white">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate('/home')} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">My Profile</h1>
            {!isGuest ? (
              <button onClick={handleSignOut} className="text-gray-400" aria-label="Sign Out">
                <LogOut className="size-5" />
              </button>
            ) : (
              <button className="text-gray-800" aria-label="Settings">
                <Settings className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Guest prompt */}
          {isGuest && (
            <div className="mx-5 md:mx-8 mb-4 bg-gradient-to-r from-[#14ae5c] to-emerald-600 rounded-2xl p-4">
              <p className="text-white text-[15px] font-semibold mb-1">Join the community!</p>
              <p className="text-white/70 text-[12px] mb-3">Create an account to share items, earn coins, and connect with neighbors.</p>
              <div className="flex gap-2">
                <button onClick={() => navigate('/signup')} className="bg-white text-[#14ae5c] px-4 py-2 rounded-xl text-[13px] font-semibold active:scale-95 transition-transform">
                  Sign Up
                </button>
                <button onClick={() => navigate('/login')} className="bg-white/20 text-white px-4 py-2 rounded-xl text-[13px] font-semibold active:scale-95 transition-transform">
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* Profile Card */}
          <div className="px-5 md:px-8 pb-5">
            <div className="flex items-start gap-4">
              <div className="relative" onClick={() => !isGuest && photoInputRef.current?.click()}>
                {displayPhoto ? (
                  <ImageWithFallback src={displayPhoto} alt="Profile" className="size-[68px] rounded-2xl object-cover" />
                ) : (
                  <div className="size-[68px] rounded-2xl bg-gray-100 flex items-center justify-center">
                    <User className="size-8 text-gray-400" />
                  </div>
                )}
                {!isGuest && (
                  <div className="absolute inset-0 rounded-2xl bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                    {uploadingPhoto ? <Loader2 className="size-5 text-white animate-spin" /> : <Camera className="size-5 text-white" />}
                  </div>
                )}
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-semibold text-gray-900">{displayName}</h2>
                  {!isGuest && <Crown className="size-4 text-[#f0a326]" />}
                  {!isGuest && user?.verificationStatus !== 'verified' && (
                    <button
                      onClick={() => navigate('/verify-identity')}
                      className="flex items-center gap-1 text-[10px] bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium"
                    >
                      <ShieldAlert className="size-3" /> Unverified
                    </button>
                  )}
                </div>
                {profile?.neighborhood && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-gray-400" />
                    <p className="text-[12px] text-gray-500">{profile.neighborhood.name}, {profile.neighborhood.city}</p>
                  </div>
                )}
                {!profile?.neighborhood && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-gray-400" />
                    <p className="text-[12px] text-gray-500">{displayLocation}</p>
                  </div>
                )}
                <p className="text-[12px] text-gray-400 mt-2 leading-relaxed">
                  {displayBio}
                </p>
              </div>
            </div>

            {!isGuest && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate('/edit-profile')}
                  className="flex-1 bg-[#14ae5c] text-white py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Edit3 className="size-4" /> Edit Profile
                </button>
                {!profile?.neighborhood && (
                  <button
                    onClick={() => navigate('/choose-location')}
                    className="flex-1 border border-[#14ae5c] text-[#14ae5c] py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <MapPin className="size-4" /> Set Location
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="px-5 md:px-8 mb-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Flame}   label="Cleanify"  value={String(stats.cleanify_count)}  color="text-orange-500" bg="bg-orange-50" />
              <StatCard icon={Package} label="Shared"    value={String(stats.shared_count)}    color="text-blue-500"   bg="bg-blue-50" />
              <StatCard icon={Users}   label="Volunteer" value={String(stats.volunteer_count)} color="text-purple-500" bg="bg-purple-50" />
            </div>
          </div>

          {/* Quick Links */}
          {!isGuest && (
            <div className="px-5 md:px-8 mb-5">
              <button
                onClick={() => navigate('/cleanify-history')}
                className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3.5 active:bg-gray-100 transition-colors"
              >
                <div className="bg-green-50 rounded-xl p-2 shrink-0">
                  <Leaf className="size-5 text-[#14ae5c]" />
                </div>
                <span className="flex-1 text-[14px] font-medium text-gray-800 text-left">Clean & Earn History</span>
                <ChevronRight className="size-4 text-gray-400 shrink-0" />
              </button>
            </div>
          )}

          {/* Coins Balance */}
          <div className="px-5 md:px-8 mb-5">
            <div className="bg-gradient-to-r from-[#f0a326] to-[#e8932a] rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white/80 text-[12px] font-medium">Total Balance</p>
                <p className="text-white text-[28px] font-bold">{displayCoins}</p>
                <p className="text-white/60 text-[11px]">coins available</p>
              </div>
              <div className="bg-white/20 rounded-2xl p-3">
                <Award className="size-8 text-white" />
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="px-5 md:px-8 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-gray-800">Badges</h3>
              <button
                onClick={() => navigate('/my-badges')}
                className="flex items-center gap-1 text-[12px] text-[#14ae5c] font-medium"
              >
                {userBadges.filter(b => b.earned).length}/{userBadges.length}
                <ChevronRight className="size-3.5" />
              </button>
            </div>
            {loadingBadges ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-6 text-gray-300 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {userBadges.slice(0, 6).map((badge: any) => (
                  <BadgeCard key={badge.key} badge={badge} onClick={() => navigate('/my-badges')} />
                ))}
              </div>
            )}
          </div>

          {/* Activity / Coins Tabs */}
          <div className="px-5 md:px-8">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === 'activity' ? 'bg-white text-[#14ae5c] shadow-sm' : 'text-gray-500'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab('coins')}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === 'coins' ? 'bg-white text-[#14ae5c] shadow-sm' : 'text-gray-500'
                }`}
              >
                Coin History
              </button>
            </div>

            {activeTab === 'activity' ? (
              <div className="space-y-2">
                <div className="flex flex-col items-center py-8">
                  <Flame className="size-10 text-gray-300 mb-2" />
                  <p className="text-gray-400 text-[13px]">
                    {isGuest ? 'Sign in to see your activity' : 'No activity yet — start sharing!'}
                  </p>
                  {!isGuest && (
                    <button
                      onClick={() => navigate('/clean-earn')}
                      className="mt-3 text-[#14ae5c] text-[13px] font-semibold"
                    >
                      Try Clean & Earn
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {loadingCoins ? (
                  <div className="flex flex-col items-center py-8">
                    <div className="size-8 border-2 border-gray-200 border-t-[#14ae5c] rounded-full animate-spin mb-2" />
                    <p className="text-gray-400 text-[13px]">Loading coin history...</p>
                  </div>
                ) : coinEntries.length > 0 ? (
                  <div className="space-y-2">
                    {coinEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="size-9 rounded-full bg-yellow-50 flex items-center justify-center">
                          <Award className="size-4 text-[#f0a326]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-800 truncate">{entry.description || entry.category}</p>
                          <p className="text-[11px] text-gray-400">{new Date(entry.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className={`text-[12px] font-semibold shrink-0 ${entry.amount >= 0 ? 'text-[#14ae5c]' : 'text-red-500'}`}>
                          {entry.amount >= 0 ? '+' : ''}{entry.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <Award className="size-10 text-gray-300 mb-2" />
                    <p className="text-gray-400 text-[13px]">
                      {isGuest ? 'Sign in to see your coins' : 'No coin history yet'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <BottomNav />
      </div>
      </PageTransition>
    </MobileContainer>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col items-center gap-1.5">
      <div className={`${bg} rounded-full p-2`}>
        <Icon className={`size-4 ${color}`} />
      </div>
      <span className="text-[16px] font-bold text-gray-800">{value}</span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}

import imgFoodSaver        from '../../assets/foodsaver.png';
import imgLocalGiver       from '../../assets/localgiver.png';
import imgActiveMember     from '../../assets/activemember.png';
import imgCleanifyChampion from '../../assets/cleanifychampion.png';
import imgCitizenOfMonth   from '../../assets/citizenofthemonth.png';
import imgTopHelper        from '../../assets/tophelper.png';

export const BADGE_IMAGES: Record<string, string | null> = {
  food_saver:        imgFoodSaver,
  local_giver:       imgLocalGiver,
  active_member:     imgActiveMember,
  cleanify_champion: imgCleanifyChampion,
  citizen_of_month:  imgCitizenOfMonth,
  top_helper:        imgTopHelper,
};

const BADGE_BG: Record<string, string> = {
  food_saver:        'bg-orange-100',
  local_giver:       'bg-green-100',
  active_member:     'bg-blue-100',
  cleanify_champion: 'bg-emerald-100',
  citizen_of_month:  'bg-yellow-100',
  top_helper:        'bg-purple-100',
};

const BADGE_EMOJI: Record<string, string> = {
  food_saver:        '🍞',
  local_giver:       '🤝',
  active_member:     '⚡',
  cleanify_champion: '🌿',
  citizen_of_month:  '🏆',
  top_helper:        '💪',
};

function BadgeCard({ badge, onClick }: { badge: any; onClick?: () => void }) {
  const progress = badge.progress ?? 0;
  const total    = badge.requirement_value ?? 1;
  const pct      = Math.min(100, Math.round((progress / total) * 100));
  const img      = BADGE_IMAGES[badge.key];
  const bg       = BADGE_BG[badge.key]    || 'bg-gray-100';
  const emoji    = BADGE_EMOJI[badge.key] || '🏅';

  return (
    <button
      onClick={onClick}
      className={`${bg} rounded-2xl p-3 flex flex-col items-center gap-1.5 w-full active:scale-95 transition-transform ${!badge.earned ? 'opacity-50' : ''}`}
    >
      <div className="size-16 flex items-center justify-center">
        {img
          ? <img src={img} alt={badge.name} className={`size-16 object-contain ${!badge.earned ? 'grayscale' : ''}`} />
          : <span className="text-[36px]">{emoji}</span>
        }
      </div>
      <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">{badge.name}</span>
      {!badge.earned && (
        <>
          <div className="w-full bg-black/10 rounded-full h-1 mt-0.5">
            <div className="bg-[#14ae5c] h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[9px] text-gray-500">{progress}/{total}</span>
        </>
      )}
      {badge.earned && (
        <span className="text-[9px] text-[#14ae5c] font-semibold">Earned ✓</span>
      )}
    </button>
  );
}
