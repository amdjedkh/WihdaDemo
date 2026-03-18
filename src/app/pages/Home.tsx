import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import MobileContainer from '../components/MobileContainer';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import PageTransition from '../components/PageTransition';
import PullToRefresh from '../components/PullToRefresh';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import babyClothesImg from 'figma:asset/6ca96903cfde7315c572f9598645ca9fc8a8e6ca.png';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import {
  Utensils,
  Package,
  Handshake,
  HeartHandshake,
  HelpCircle,
  ArrowLeftRight,
  Sparkles,
  Calendar,
  Users,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const categories = [
  {
    id: 'leftovers',
    titleKey: 'catLeftovers' as const,
    subKey: 'catLeftoversSub' as const,
    icon: Utensils,
    gradient: 'from-orange-400 to-orange-500',
    bg: 'bg-orange-50',
    iconColor: 'text-orange-500',
  },
  {
    id: 'old-items',
    titleKey: 'catOldItems' as const,
    subKey: 'catOldItemsSub' as const,
    icon: Package,
    gradient: 'from-blue-400 to-blue-500',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    id: 'borrow',
    titleKey: 'catBorrow' as const,
    subKey: 'catBorrowSub' as const,
    icon: Handshake,
    gradient: 'from-purple-400 to-purple-500',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-500',
  },
  {
    id: 'offer-help',
    titleKey: 'catOfferHelp' as const,
    subKey: 'catOfferHelpSub' as const,
    icon: HeartHandshake,
    gradient: 'from-green-400 to-green-500',
    bg: 'bg-green-50',
    iconColor: 'text-green-500',
  },
  {
    id: 'ask-help',
    titleKey: 'catAskHelp' as const,
    subKey: 'catAskHelpSub' as const,
    icon: HelpCircle,
    gradient: 'from-rose-400 to-rose-500',
    bg: 'bg-rose-50',
    iconColor: 'text-rose-500',
  },
  {
    id: 'exchange',
    titleKey: 'catExchange' as const,
    subKey: 'catExchangeSub' as const,
    icon: ArrowLeftRight,
    gradient: 'from-teal-400 to-teal-500',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-500',
  },
];

interface Campaign {
  id: string;
  title: string;
  event_date: string;
  participant_count: number;
  coin_reward: number;
  image_url: string | null;
}

interface LeftoverOffer {
  id: string;
  title: string;
  food_type: string;
  portions: number;
  created_at: string;
  user: { display_name: string };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'neighbor' | 'neighborhood'>('neighbor');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentOffers, setRecentOffers] = useState<LeftoverOffer[]>([]);
  const [showVerifyBanner, setShowVerifyBanner] = useState(false);
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { language } = useApp();
  const T = (key: Parameters<typeof t>[1]) => t(language, key);

  useEffect(() => {
    if (user && user.verificationStatus !== 'verified' && !sessionStorage.getItem('wihda_verify_skipped')) {
      setShowVerifyBanner(true);
    } else {
      setShowVerifyBanner(false);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    try {
      const [campaignData, offersData] = await Promise.allSettled([
        apiFetch('/v1/campaigns?limit=3'),
        apiFetch('/v1/leftovers/offers?limit=5'),
      ]);

      if (campaignData.status === 'fulfilled' && campaignData.value.success) {
        setCampaigns(campaignData.value.data.campaigns || []);
      }
      if (offersData.status === 'fulfilled' && offersData.value.success) {
        setRecentOffers(offersData.value.data.offers || []);
      }
    } catch {
      // Data loading errors are non-critical
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadData(), refreshProfile()]);
    toast('Feed refreshed!', { description: 'Latest posts loaded', duration: 2000 });
  }, [loadData, refreshProfile]);

  const formatEventDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <MobileContainer>
      <PageTransition type="fade">
        <div className="flex flex-col size-full bg-white">
          <Header />

          {/* Toggle */}
          <div className="px-5 md:px-8 mb-4">
            <div className="bg-gray-100 rounded-full p-1 flex">
              <button
                onClick={() => setActiveTab('neighbor')}
                className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-all duration-300 ${
                  activeTab === 'neighbor'
                    ? 'bg-[#14ae5c] text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {T('myNeighbor')}
              </button>
              <button
                onClick={() => setActiveTab('neighborhood')}
                className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-all duration-300 ${
                  activeTab === 'neighborhood'
                    ? 'bg-[#14ae5c] text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {T('myNeighborhood')}
              </button>
            </div>
          </div>

          {/* Content */}
          <PullToRefresh onRefresh={handleRefresh} className="pb-28 px-5 md:px-8">
            {showVerifyBanner && (
              <div className="mx-4 mb-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white text-[14px] font-semibold mb-0.5">{T('verifyProfile')}</p>
                    <p className="text-white/80 text-[12px]">{T('verifyProfileDesc')}</p>
                  </div>
                  <button onClick={() => { setShowVerifyBanner(false); sessionStorage.setItem('wihda_verify_skipped', '1'); }} className="text-white/60 ml-2 mt-0.5">✕</button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate('/verify-identity')}
                    className="flex-1 bg-white text-blue-600 py-2 rounded-xl text-[13px] font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="size-4" /> {T('verifyNow')}
                  </button>
                  <button
                    onClick={() => { setShowVerifyBanner(false); sessionStorage.setItem('wihda_verify_skipped', '1'); }}
                    className="flex-1 bg-white/20 text-white py-2 rounded-xl text-[13px] font-medium active:scale-95 transition-transform"
                  >
                    {T('skipForNow')}
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'neighbor' ? (
              <>
                <p className="text-[15px] font-semibold text-gray-800 mb-4 animate-slide-up">
                  {T('needSomething')}
                </p>

                {/* Category Grid */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 mb-6 stagger-children">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/category/${cat.id}`)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-90 transition-all duration-150"
                    >
                      <div className={`${cat.bg} rounded-xl p-3`}>
                        <cat.icon className={`size-6 ${cat.iconColor}`} />
                      </div>
                      <div className="text-center">
                        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{T(cat.titleKey)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{T(cat.subKey)}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Clean & Earn CTA */}
                <div className="relative rounded-2xl overflow-hidden mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <img
                    src="https://images.unsplash.com/photo-1758599667718-684569efe224?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHBlb3BsZSUyMGNsZWFuaW5nJTIwY29tbXVuaXR5JTIwdm9sdW50ZWVyfGVufDF8fHx8MTc3MjIwNTAxNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Happy people cleaning"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#14ae5c]/90 via-[#14ae5c]/75 to-transparent" />
                  <div className="relative p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="size-4 text-yellow-300" />
                      <span className="text-white/80 text-[12px] font-medium">{T('featured')}</span>
                    </div>
                    <h3 className="text-white text-[16px] md:text-[18px] font-semibold mb-1">{T('cleanAndEarn')}</h3>
                    <p className="text-white/70 text-[12px] mb-3">{T('cleanAndEarnDesc')}</p>
                    <button
                      onClick={() => navigate('/clean-earn')}
                      className="bg-white text-[#14ae5c] px-4 py-2 rounded-full text-[12px] font-semibold active:scale-95 transition-transform"
                    >
                      {T('startNow')}
                    </button>
                  </div>
                </div>

                {/* Recent Leftover Offers */}
                <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-semibold text-gray-800">{T('recentShares')}</h3>
                    <button
                      onClick={() => navigate('/category/leftovers')}
                      className="text-[#14ae5c] text-[12px] font-medium flex items-center gap-0.5"
                    >
                      {T('seeAll')} <ChevronRight className="size-3" />
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2">
                    {recentOffers.length > 0 ? (
                      recentOffers.map(offer => (
                        <RecentPostCard
                          key={offer.id}
                          name={offer.user?.display_name || 'Neighbor'}
                          item={offer.title || offer.food_type}
                          time={getRelativeTime(offer.created_at)}
                          coins={0}
                          image=""
                        />
                      ))
                    ) : (
                      <>
                        <RecentPostCard
                          name="Oualid L."
                          item="Fresh homemade bread"
                          time="1hr ago"
                          coins={100}
                          image="https://images.unsplash.com/photo-1661509833506-266e183dbe6c?w=200&h=200&fit=crop"
                        />
                        <RecentPostCard
                          name="Sara M."
                          item="Baby clothes (6mo)"
                          time="3hr ago"
                          coins={80}
                          image={babyClothesImg}
                        />
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-gray-800 mb-4 animate-slide-up">
                  What's happening in your neighborhood
                </p>

                {/* Clean & Earn CTA */}
                <button
                  onClick={() => navigate('/clean-earn')}
                  className="w-full bg-gradient-to-r from-[#14ae5c] to-[#0d9e4f] text-white rounded-2xl p-4 mb-5 flex items-center gap-3 active:scale-[0.97] transition-all duration-150 animate-slide-up"
                >
                  <div className="bg-white/20 rounded-full p-2.5">
                    <Sparkles className="size-5 text-yellow-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[14px] font-semibold">Clean & Earn Coins</p>
                    <p className="text-[11px] text-white/70">Make your neighborhood shine</p>
                  </div>
                  <ChevronRight className="size-5 text-white/60" />
                </button>

                {/* Upcoming Activities */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-semibold text-gray-800">Upcoming Activities</h3>
                  <button
                    onClick={() => navigate('/activities')}
                    className="text-[#14ae5c] text-[12px] font-medium flex items-center gap-0.5"
                  >
                    View all <ChevronRight className="size-3" />
                  </button>
                </div>

                {campaigns.length > 0 ? (
                  <div className="stagger-children">
                    {campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3 shadow-sm"
                      >
                        {campaign.image_url ? (
                          <ImageWithFallback
                            src={campaign.image_url}
                            alt={campaign.title}
                            className="w-full h-[130px] object-cover"
                          />
                        ) : (
                          <div className="w-full h-[130px] bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                            <Sparkles className="size-10 text-[#14ae5c]/40" />
                          </div>
                        )}
                        <div className="p-3">
                          <h4 className="text-[14px] font-semibold text-gray-800">{campaign.title}</h4>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                              <Calendar className="size-3" />
                              {formatEventDate(campaign.event_date)}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                              <Users className="size-3" />
                              {campaign.participant_count || 0} joined
                            </div>
                            {campaign.coin_reward > 0 && (
                              <div className="flex items-center gap-1 text-[#f0a326] text-[11px] font-semibold ml-auto">
                                <div className="size-[13px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                                  <span className="text-[5px] font-bold text-[#f0a326]">$</span>
                                </div>
                                {campaign.coin_reward}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => navigate('/activities')}
                            className="mt-3 w-full bg-[#14ae5c] text-white py-2.5 rounded-xl text-[13px] font-semibold active:scale-[0.97] transition-all duration-150"
                          >
                            Join Activity
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <Calendar className="size-10 text-gray-300 mb-2" />
                    <p className="text-gray-400 text-[13px]">No upcoming activities yet</p>
                    <p className="text-gray-400 text-[11px] mt-1">Check back soon!</p>
                  </div>
                )}
              </>
            )}
          </PullToRefresh>

          <BottomNav />
        </div>
      </PageTransition>
    </MobileContainer>
  );
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function RecentPostCard({ name, item, time, coins, image }: {
  name: string;
  item: string;
  time: string;
  coins: number;
  image: string;
}) {
  return (
    <div className="min-w-[200px] md:min-w-[240px] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:scale-95 transition-all duration-150">
      {image ? (
        <ImageWithFallback src={image} alt={item} className="w-full h-[100px] object-cover" />
      ) : (
        <div className="w-full h-[100px] bg-gray-100 flex items-center justify-center">
          <Utensils className="size-8 text-gray-300" />
        </div>
      )}
      <div className="p-3">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{item}</p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-gray-400">{name} &middot; {time}</p>
          {coins > 0 && (
            <div className="flex items-center gap-1 text-[#f0a326] text-[11px] font-semibold">
              <div className="size-[13px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                <span className="text-[5px] font-bold text-[#f0a326]">$</span>
              </div>
              {coins}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
