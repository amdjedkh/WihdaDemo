import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import {
  ArrowLeft, Sparkles, Coins, Users, Calendar,
  MapPin, CheckCircle2, Loader2,
} from 'lucide-react';

interface CampaignSummary {
  id: string;
  title: string;
  subtitle: string | null;
  organizer: string | null;
  organizer_logo: string | null;
  location: string | null;
  start_dt: string;
  coin_reward: number;
  participant_count: number;
  is_joined: boolean;
  image_url: string | null;
  images: string[];
}

export default function ActivityJoin() {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState(false);
  const [joined, setJoined]     = useState(false);

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
        if (c.is_joined) setJoined(true);
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
      const data = await apiFetch(`/v1/campaigns/${campaign.id}/join`, { method: 'POST' });
      if (data.success) {
        setJoined(true);
        setCampaign(prev => prev ? {
          ...prev,
          is_joined: true,
          participant_count: data.data?.participant_count ?? prev.participant_count + 1,
        } : prev);
      }
    } catch (err) {
      console.error('Join error:', err);
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

  const dateStr = new Date(campaign.start_dt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const coverImg = campaign.images[0] ?? campaign.image_url ?? null;

  // ── Success state ──────────────────────────────────────────────────────────
  if (joined) {
    return (
      <MobileContainer>
        <PageTransition>
          <div className="flex flex-col size-full bg-gray-50">
            <div className="px-5 pt-[env(safe-area-inset-top)] bg-white border-b border-gray-100">
              <div className="flex items-center h-14">
                <button onClick={() => navigate(`/activity/${campaign.id}`)} className="text-gray-800">
                  <ArrowLeft className="size-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
              <div className="size-24 rounded-full bg-[#14ae5c]/10 flex items-center justify-center mb-5">
                <CheckCircle2 className="size-12 text-[#14ae5c]" />
              </div>

              <h1 className="text-[24px] font-bold text-gray-900 mb-2">You're in!</h1>
              <p className="text-[15px] text-gray-500 mb-6 leading-relaxed">
                You have successfully joined<br />
                <span className="font-semibold text-gray-700">{campaign.title}</span>
              </p>

              {campaign.coin_reward > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-center gap-3 mb-8 w-full max-w-xs">
                  <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Coins className="size-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-amber-700 text-[13px] font-semibold">
                      +{campaign.coin_reward} coins awaiting you
                    </p>
                    <p className="text-amber-500 text-[11px]">Earned upon verified participation</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={() => navigate(`/activity/${campaign.id}`)}
                  className="w-full bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[15px] font-bold shadow-lg shadow-[#14ae5c]/30 active:scale-[0.98] transition-all"
                >
                  View Activity
                </button>
                <button
                  onClick={() => navigate('/activities')}
                  className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-all"
                >
                  Browse More
                </button>
              </div>
            </div>
          </div>
        </PageTransition>
      </MobileContainer>
    );
  }

  // ── Confirmation state ─────────────────────────────────────────────────────
  return (
    <MobileContainer>
      <PageTransition>
        <div className="flex flex-col size-full bg-gray-50">

          {/* Header */}
          <div className="px-5 pt-[env(safe-area-inset-top)] bg-white border-b border-gray-100">
            <div className="flex items-center justify-between h-14">
              <button onClick={() => navigate(-1)} className="text-gray-800">
                <ArrowLeft className="size-6" />
              </button>
              <h1 className="text-[18px] font-bold text-gray-900">Join Activity</h1>
              <div className="w-6" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-36 px-5 pt-5">

            {/* Activity preview card */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mb-5">
              {coverImg && (
                <img
                  src={coverImg}
                  alt={campaign.title}
                  className="w-full h-[160px] object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="p-4">
                <p className="text-[11px] font-semibold text-[#14ae5c] uppercase tracking-wide mb-1">
                  {campaign.organizer || 'Community'}
                </p>
                <h2 className="text-[17px] font-bold text-gray-900 leading-snug mb-3">
                  {campaign.title}
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="size-3.5 shrink-0" />
                    <span className="text-[12px]">{dateStr}</span>
                  </div>
                  {campaign.location && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="text-[12px]">{campaign.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500">
                    <Users className="size-3.5 shrink-0" />
                    <span className="text-[12px]">{campaign.participant_count} people joined</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coins card */}
            {campaign.coin_reward > 0 && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-3xl p-5 mb-5 flex items-center gap-4">
                <div className="bg-white/20 rounded-full p-3">
                  <Coins className="size-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-[16px] font-bold">+{campaign.coin_reward} coins</p>
                  <p className="text-white/80 text-[12px] mt-0.5">Awarded after verified participation</p>
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100">
              <h3 className="text-[14px] font-bold text-gray-900 mb-3">What happens when you join?</h3>
              {[
                { icon: '✅', text: "You'll be counted as a participant" },
                { icon: '📍', text: 'Attend the activity on the scheduled date' },
                campaign.coin_reward > 0
                  ? { icon: '🪙', text: `Earn ${campaign.coin_reward} coins upon verified participation` }
                  : null,
                { icon: '❌', text: 'You can cancel anytime from the activity page' },
              ].filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-start gap-3 mb-2.5 last:mb-0">
                  <span className="text-[16px] shrink-0 mt-0.5">{item!.icon}</span>
                  <p className="text-[13px] text-gray-600">{item!.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky bottom CTA */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 space-y-2.5">
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[15px] font-bold shadow-lg shadow-[#14ae5c]/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {joining
                ? <Loader2 className="size-5 animate-spin" />
                : `Confirm Participation${campaign.coin_reward > 0 ? ` · +${campaign.coin_reward} coins` : ''}`
              }
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>

        </div>
      </PageTransition>
    </MobileContainer>
  );
}
