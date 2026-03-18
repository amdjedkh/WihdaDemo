import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import {
  ArrowLeft, Bell, Sparkles, ChevronRight, ChevronLeft,
  Heart, Users, Coins, Loader2, MapPin, Calendar,
  Phone, Mail, ExternalLink, Share2,
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
      <div className="w-full h-[280px] bg-gradient-to-br from-[#14ae5c]/20 to-emerald-100 flex items-center justify-center">
        <Sparkles className="size-20 text-[#14ae5c]/30" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[280px] overflow-hidden">
      <img
        src={images[idx]}
        alt={title}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '';
          (e.target as HTMLImageElement).className = 'hidden';
        }}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + images.length) % images.length); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/40 flex items-center justify-center"
          >
            <ChevronLeft className="size-5 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % images.length); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/40 flex items-center justify-center"
          >
            <ChevronRight className="size-5 text-white" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
      {/* Image count badge */}
      {images.length > 1 && (
        <div className="absolute top-3 left-3 bg-black/50 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
          {idx + 1} / {images.length}
        </div>
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
        className="size-12 rounded-full object-cover border-2 border-white shadow"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="size-12 rounded-full bg-[#14ae5c]/10 border-2 border-[#14ae5c]/20 flex items-center justify-center">
      <span className="text-[18px] font-bold text-[#14ae5c]">{initial}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ActivityDetail() {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();

  const [campaign, setCampaign]     = useState<Campaign | null>(null);
  const [loading, setLoading]       = useState(true);
  const [joining, setJoining]       = useState(false);
  const [isFav, setIsFav]           = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/v1/campaigns/${id}`);
      if (data.success) {
        const c = data.data;
        setCampaign({
          ...c,
          images: Array.isArray(c.images) ? c.images : (c.image_url ? [c.image_url] : []),
        });
      }
    } catch (err) {
      console.error('Failed to load campaign:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async () => {
    if (!campaign) return;
    setJoining(true);
    try {
      if (campaign.is_joined) {
        // Cancel participation
        const data = await apiFetch(`/v1/campaigns/${campaign.id}/join`, { method: 'DELETE' });
        if (data.success) {
          setCampaign(prev => prev ? {
            ...prev,
            is_joined: false,
            participant_count: data.data?.participant_count ?? Math.max(0, prev.participant_count - 1),
          } : prev);
        }
      } else {
        // Join — navigate to join confirmation page
        navigate(`/activity/${campaign.id}/join`);
      }
    } catch (err) {
      console.error('Join/cancel error:', err);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <MobileContainer>
        <div className="flex flex-col size-full bg-gray-50 items-center justify-center">
          <Loader2 className="size-10 text-[#14ae5c] animate-spin" />
        </div>
      </MobileContainer>
    );
  }

  if (!campaign) {
    return (
      <MobileContainer>
        <div className="flex flex-col size-full bg-gray-50 items-center justify-center px-8 text-center">
          <Sparkles className="size-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Activity not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2.5 bg-[#14ae5c] text-white rounded-full text-[14px] font-semibold"
          >
            Go back
          </button>
        </div>
      </MobileContainer>
    );
  }

  const startDate = new Date(campaign.start_dt).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const startTime = new Date(campaign.start_dt).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <MobileContainer>
      <PageTransition>
        <div className="flex flex-col size-full bg-gray-50">

          {/* Floating header over image */}
          <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between h-14">
              <button
                onClick={() => navigate(-1)}
                className="size-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <ArrowLeft className="size-5 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFav(f => !f)}
                  className="size-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
                >
                  <Heart className={`size-4 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </button>
                <button
                  onClick={() => navigate('/notifications')}
                  className="size-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center relative"
                >
                  <Bell className="size-4 text-white" />
                  <div className="absolute top-1.5 right-1.5 size-1.5 bg-red-500 rounded-full" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pb-36">

            {/* Image */}
            <div className="relative">
              <ImageCarousel images={campaign.images} title={campaign.title} />
              {/* Coin badge */}
              {campaign.coin_reward > 0 && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-amber-400 text-white px-3 py-1.5 rounded-full text-[12px] font-bold shadow-lg">
                  <Coins className="size-3.5" />
                  +{campaign.coin_reward} coins
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="bg-white rounded-t-3xl -mt-5 relative z-[1] px-5 pt-6 pb-4">

              {/* Organizer row */}
              <div className="flex items-center gap-3 mb-4">
                <OrgAvatar logo={campaign.organizer_logo} name={campaign.organizer} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-800 truncate">
                    {campaign.organizer || 'Community Initiative'}
                  </p>
                  <p className="text-[12px] text-gray-400">Organizer</p>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Users className="size-4" />
                  <span className="text-[13px] font-medium text-gray-600">{campaign.participant_count}</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-[22px] font-bold text-gray-900 leading-snug mb-1">
                {campaign.title}
              </h1>
              {campaign.subtitle && (
                <p className="text-[14px] text-gray-500 mb-4">{campaign.subtitle}</p>
              )}

              {/* Info pills */}
              <div className="flex flex-col gap-2.5 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-[#14ae5c]/10 flex items-center justify-center shrink-0">
                    <Calendar className="size-4 text-[#14ae5c]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800">{startDate}</p>
                    <p className="text-[11px] text-gray-400">{startTime}</p>
                  </div>
                </div>

                {campaign.location && (
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <MapPin className="size-4 text-blue-500" />
                    </div>
                    <p className="text-[13px] font-semibold text-gray-800">{campaign.location}</p>
                  </div>
                )}

                {campaign.coin_reward > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <Coins className="size-4 text-amber-500" />
                    </div>
                    <p className="text-[13px] font-semibold text-gray-800">
                      Earn {campaign.coin_reward} coins for participating
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mb-5" />

              {/* Description */}
              {campaign.description && (
                <div className="mb-5">
                  <h2 className="text-[15px] font-bold text-gray-900 mb-2">About this activity</h2>
                  <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-line">
                    {campaign.description}
                  </p>
                </div>
              )}

              {/* Contact */}
              {(campaign.contact_phone || campaign.contact_email || campaign.url) && (
                <>
                  <div className="h-px bg-gray-100 mb-5" />
                  <div className="mb-5">
                    <h2 className="text-[15px] font-bold text-gray-900 mb-3">Contact</h2>
                    <div className="space-y-2.5">
                      {campaign.contact_phone && (
                        <a
                          href={`tel:${campaign.contact_phone}`}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors"
                        >
                          <div className="size-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                            <Phone className="size-4 text-green-500" />
                          </div>
                          <span className="text-[13px] font-medium text-gray-700">{campaign.contact_phone}</span>
                        </a>
                      )}
                      {campaign.contact_email && (
                        <a
                          href={`mailto:${campaign.contact_email}`}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors"
                        >
                          <div className="size-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Mail className="size-4 text-blue-500" />
                          </div>
                          <span className="text-[13px] font-medium text-gray-700">{campaign.contact_email}</span>
                        </a>
                      )}
                      {campaign.url && (
                        <a
                          href={campaign.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors"
                        >
                          <div className="size-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                            <ExternalLink className="size-4 text-purple-500" />
                          </div>
                          <span className="text-[13px] font-medium text-gray-700 flex-1 truncate">Visit website</span>
                          <ChevronRight className="size-4 text-gray-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sticky bottom CTA */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
            <div className="flex items-center gap-3">
              <button
                className="size-12 rounded-2xl border border-gray-200 flex items-center justify-center shrink-0 active:scale-95 transition-all"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: campaign.title, url: campaign.url || window.location.href });
                  }
                }}
              >
                <Share2 className="size-5 text-gray-600" />
              </button>
              <button
                onClick={handleJoin}
                disabled={joining}
                className={`flex-1 py-3.5 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 ${
                  campaign.is_joined
                    ? 'bg-gray-100 text-gray-600 border border-gray-200'
                    : 'bg-[#14ae5c] text-white shadow-lg shadow-[#14ae5c]/30'
                }`}
              >
                {joining
                  ? <Loader2 className="size-5 animate-spin" />
                  : campaign.is_joined
                    ? 'Cancel Participation'
                    : `Join Activity${campaign.coin_reward > 0 ? ` · +${campaign.coin_reward} coins` : ''}`
                }
              </button>
            </div>
          </div>

        </div>
      </PageTransition>
    </MobileContainer>
  );
}
