import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import {
  ArrowLeft,
  Search,
  Bell,
  Calendar,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Loader2,
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  organization_name: string;
  event_date: string;
  image_url: string | null;
  coin_reward: number;
  participant_count: number;
  created_at: string;
}

export default function Activities() {
  const [activeTab, setActiveTab] = useState<'activities' | 'news'>('activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'activities') {
      loadCampaigns();
    }
  }, [activeTab]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/v1/campaigns');
      if (data.success) {
        setCampaigns(data.data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = campaigns.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.organization_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      full: d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      day: d.getDate().toString().padStart(2, '0'),
      month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    };
  };

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-white">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate('/home')} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">Activities</h1>
            <button onClick={() => navigate('/notifications')} className="relative" aria-label="Notifications">
              <Bell className="size-5 text-gray-800" />
              <div className="absolute -top-0.5 -right-0.5 size-2 bg-red-500 rounded-full" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-[13px] placeholder:text-gray-400 border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === 'activities'
                  ? 'bg-white text-[#14ae5c] shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              Activities
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === 'news'
                  ? 'bg-white text-[#14ae5c] shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              News
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-28 px-5">
          {activeTab === 'activities' ? (
            <>
              {/* Clean & Earn Banner */}
              <button
                onClick={() => navigate('/clean-earn')}
                className="w-full bg-gradient-to-r from-[#14ae5c] to-emerald-600 rounded-2xl p-4 mb-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="bg-white/20 rounded-full p-2">
                  <Sparkles className="size-5 text-yellow-300" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-[14px] font-semibold">Clean & Earn Coins</p>
                  <p className="text-white/70 text-[11px]">Earn up to 150 coins per verified cleanup</p>
                </div>
                <ChevronRight className="size-5 text-white/60" />
              </button>

              {loading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="size-8 text-[#14ae5c] animate-spin mb-2" />
                  <p className="text-gray-400 text-[13px]">Loading activities...</p>
                </div>
              ) : filtered.length > 0 ? (
                <div>
                  {filtered.map((campaign) => {
                    const dateInfo = formatDate(campaign.event_date);
                    return (
                      <div key={campaign.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4 shadow-sm">
                        {/* Org Header */}
                        <div className="flex items-center gap-3 p-4 pb-2">
                          <div className="size-10 rounded-full bg-green-50 flex items-center justify-center text-[16px]">
                            🌿
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800 truncate">
                              {campaign.organization_name || 'Community'}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {new Date(campaign.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button className="text-gray-400">
                            <MoreVertical className="size-4" />
                          </button>
                        </div>

                        {/* Image */}
                        <div className="relative mx-4 rounded-xl overflow-hidden">
                          {campaign.image_url ? (
                            <ImageWithFallback
                              src={campaign.image_url}
                              alt={campaign.title}
                              className="w-full h-[160px] object-cover"
                            />
                          ) : (
                            <div className="w-full h-[160px] bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                              <Sparkles className="size-12 text-[#14ae5c]/40" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 bg-white rounded-lg px-2.5 py-1.5 shadow-sm">
                            <p className="text-[16px] font-bold text-gray-800 leading-tight">{dateInfo.day}</p>
                            <p className="text-[10px] font-semibold text-red-500">{dateInfo.month}</p>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4 pt-3">
                          <h3 className="text-[15px] font-semibold text-gray-800 mb-1">{campaign.title}</h3>
                          {campaign.description && (
                            <p className="text-[12px] text-gray-500 line-clamp-2 mb-2">{campaign.description}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mb-3">
                            Deadline: {dateInfo.full}
                          </p>

                          <div className="flex items-center gap-2 mb-3">
                            <button className="px-4 py-2 rounded-full text-[12px] font-semibold bg-[#14ae5c] text-white active:scale-95 transition-all">
                              Join Activity
                            </button>
                            {campaign.coin_reward > 0 && (
                              <div className="flex items-center gap-1 text-[#f0a326] font-semibold text-[12px]">
                                <span className="text-[14px] leading-none">🪙</span>
                                {campaign.coin_reward}
                              </div>
                            )}
                          </div>

                          <div className="border-t border-gray-50 pt-3 flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Users className="size-4" />
                              <span className="text-[12px]">{campaign.participant_count || 0}</span>
                            </div>
                            <button className="ml-auto text-gray-400">
                              <Share2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12">
                  <Sparkles className="size-10 text-gray-300 mb-2" />
                  <p className="text-gray-400 text-[13px]">
                    {searchQuery ? 'No activities found' : 'No activities yet in your neighborhood'}
                  </p>
                  <p className="text-gray-400 text-[11px] mt-1">Check back soon!</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-12">
              <p className="text-gray-400 text-[13px]">Community news coming soon</p>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
