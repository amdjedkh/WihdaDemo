import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import {
  ArrowLeft, Bell, Search, Sparkles, ChevronRight,
  Heart, Users, Coins, ChevronLeft, Loader2, MapPin, Calendar,
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  organizer: string | null;
  organizer_logo: string | null;
  location: string | null;
  event_date: string;
  start_dt: string;
  end_dt: string | null;
  url: string | null;
  image_url: string | null;
  images: string[];
  contact_phone: string | null;
  contact_email: string | null;
  coin_reward: number;
  participant_count: number;
  is_joined: boolean;
}

// ─── Image Carousel ───────────────────────────────────────────────────────────

function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-[200px] bg-gradient-to-br from-[#14ae5c]/20 to-emerald-100 flex items-center justify-center">
        <Sparkles className="size-14 text-[#14ae5c]/30" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[200px] overflow-hidden">
      <img
        src={images[idx]}
        alt={title}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).className = 'hidden'; }}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/40 flex items-center justify-center"
          >
            <ChevronLeft className="size-4 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/40 flex items-center justify-center"
          >
            <ChevronRight className="size-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Organizer Avatar ─────────────────────────────────────────────────────────

function OrgAvatar({ logo, name }: { logo: string | null; name: string | null }) {
  const initial = (name || 'C').charAt(0).toUpperCase();
  if (logo) {
    return (
      <img
        src={logo}
        alt={name || 'Organizer'}
        className="size-10 rounded-full object-cover border-2 border-white shadow-sm"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="size-10 rounded-full bg-[#14ae5c]/10 border-2 border-[#14ae5c]/20 flex items-center justify-center">
      <span className="text-[16px] font-bold text-[#14ae5c]">{initial}</span>
    </div>
  );
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({ campaign, onToggleFavorite, favorites }: {
  campaign: Campaign;
  onToggleFavorite: (id: string) => void;
  favorites: Set<string>;
}) {
  const navigate   = useNavigate();
  const isFav      = favorites.has(campaign.id);
  const dateStr    = new Date(campaign.event_date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div
      className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 active:scale-[0.99] transition-transform"
      onClick={() => navigate(`/activity/${campaign.id}`)}
    >
      {/* Image carousel */}
      <div className="relative">
        <ImageCarousel images={campaign.images} title={campaign.title} />
        {/* Coin badge */}
        {campaign.coin_reward > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-400 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow">
            <Coins className="size-3" />
            {campaign.coin_reward}
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Organizer row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <OrgAvatar logo={campaign.organizer_logo} name={campaign.organizer} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 truncate">{campaign.organizer || 'Community'}</p>
              <div className="flex items-center gap-1 text-gray-400">
                <Calendar className="size-3" />
                <p className="text-[11px]">{dateStr}</p>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(campaign.id); }}
            className="size-9 flex items-center justify-center rounded-full bg-gray-50 active:scale-90 transition-all"
          >
            <Heart className={`size-4 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        </div>

        {/* Title + subtitle */}
        <h3 className="text-[16px] font-bold text-gray-900 leading-tight">{campaign.title}</h3>
        {campaign.subtitle && (
          <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-1">{campaign.subtitle}</p>
        )}

        {/* Location */}
        {campaign.location && (
          <div className="flex items-center gap-1 mt-2">
            <MapPin className="size-3.5 text-gray-400 shrink-0" />
            <p className="text-[12px] text-gray-400 truncate">{campaign.location}</p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1 text-gray-400">
            <Users className="size-4" />
            <span className="text-[12px]">{campaign.participant_count} joined</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/activity/${campaign.id}`); }}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
              campaign.is_joined
                ? 'bg-gray-100 text-gray-600'
                : 'bg-[#14ae5c] text-white shadow-sm shadow-[#14ae5c]/30'
            }`}
          >
            {campaign.is_joined ? 'Joined ✓' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Activities() {
  const navigate  = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/v1/campaigns');
      if (data.success) {
        const list: Campaign[] = (data.data.campaigns || []).map((c: any) => ({
          ...c,
          images: Array.isArray(c.images) ? c.images : (c.image_url ? [c.image_url] : []),
        }));
        setCampaigns(list);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = campaigns.filter(c =>
    !search ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.organizer || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MobileContainer>
      <PageTransition>
        <div className="flex flex-col size-full bg-gray-50">

          {/* Header */}
          <div className="px-5 pt-[env(safe-area-inset-top)] bg-white border-b border-gray-100">
            <div className="flex items-center justify-between h-14">
              <button onClick={() => navigate('/home')} className="text-gray-800">
                <ArrowLeft className="size-6" />
              </button>
              <h1 className="text-[18px] font-bold text-gray-900 font-[Poppins,sans-serif]">Activities</h1>
              <button onClick={() => navigate('/notifications')} className="relative">
                <Bell className="size-5 text-gray-800" />
                <div className="absolute -top-0.5 -right-0.5 size-2 bg-red-500 rounded-full" />
              </button>
            </div>

            {/* Search */}
            <div className="relative pb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-[13px] placeholder:text-gray-400 border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4">

            {/* Clean & Earn Banner */}
            <button
              onClick={() => navigate('/clean-earn')}
              className="w-full bg-gradient-to-r from-[#14ae5c] to-emerald-500 rounded-2xl p-4 mb-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform shadow-sm shadow-[#14ae5c]/30"
            >
              <div className="bg-white/20 rounded-full p-2.5">
                <Sparkles className="size-5 text-yellow-300" />
              </div>
              <div className="flex-1">
                <p className="text-white text-[14px] font-bold">Clean & Earn Coins</p>
                <p className="text-white/70 text-[12px]">Up to 150 coins per verified cleanup</p>
              </div>
              <ChevronRight className="size-5 text-white/60" />
            </button>

            {loading ? (
              <div className="flex flex-col items-center py-16">
                <Loader2 className="size-8 text-[#14ae5c] animate-spin mb-3" />
                <p className="text-gray-400 text-[13px]">Loading activities...</p>
              </div>
            ) : filtered.length > 0 ? (
              filtered.map(c => (
                <ActivityCard key={c.id} campaign={c} onToggleFavorite={toggleFavorite} favorites={favorites} />
              ))
            ) : (
              <div className="flex flex-col items-center py-16">
                <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Sparkles className="size-8 text-gray-300" />
                </div>
                <p className="text-gray-500 text-[14px] font-medium">
                  {search ? 'No activities found' : 'No activities yet'}
                </p>
                <p className="text-gray-400 text-[12px] mt-1">Check back soon!</p>
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </PageTransition>
    </MobileContainer>
  );
}
