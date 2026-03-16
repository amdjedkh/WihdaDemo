import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import PageTransition from '../components/PageTransition';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  ArrowLeft,
  Plus,
  Utensils,
  Clock,
  Users,
  MapPin,
  X,
  Loader2,
  ChevronRight,
  Package,
} from 'lucide-react';

interface LeftoverOffer {
  id: string;
  title: string;
  food_type: string;
  description: string;
  portions: number;
  pickup_type: 'pickup' | 'delivery';
  status: 'active' | 'matched' | 'closed';
  created_at: string;
  user: { id: string; display_name: string };
}

interface CreateOfferForm {
  food_type: string;
  description: string;
  portions: number;
  pickup_type: 'pickup' | 'delivery';
}

const FOOD_TYPES = ['Cooked meal', 'Bread & pastries', 'Fruits & vegetables', 'Dairy', 'Sweets', 'Other'];

export default function Leftovers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'offers' | 'needs' | 'matches'>('offers');
  const [offers, setOffers] = useState<LeftoverOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateOfferForm>({
    food_type: '',
    description: '',
    portions: 1,
    pickup_type: 'pickup',
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/v1/leftovers/offers');
      if (data.success) {
        setOffers(data.data.offers || []);
      }
    } catch (err) {
      console.error('Failed to load offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!user) {
      toast('Sign in required', { description: 'Please sign in to post an offer' });
      navigate('/login');
      return;
    }
    if (!form.food_type) {
      toast.error('Please select a food type');
      return;
    }

    setCreating(true);
    try {
      const data = await apiFetch('/v1/leftovers/offers', {
        method: 'POST',
        body: JSON.stringify({
          food_type: form.food_type,
          description: form.description,
          portions: form.portions,
          pickup_type: form.pickup_type,
        }),
      });

      if (data.success) {
        toast('Offer posted!', { description: 'Your leftover offer is now live' });
        setShowCreateForm(false);
        setForm({ food_type: '', description: '', portions: 1, pickup_type: 'pickup' });
        loadOffers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create offer');
    } finally {
      setCreating(false);
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
      <div className="flex flex-col size-full bg-white">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate('/home')} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">Leftovers</h1>
            <button
              onClick={() => {
                if (!user) {
                  navigate('/login');
                  return;
                }
                setShowCreateForm(true);
              }}
              className="bg-[#14ae5c] text-white rounded-full p-1.5 active:scale-90 transition-transform"
              aria-label="Post offer"
            >
              <Plus className="size-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
            {(['offers', 'needs', 'matches'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all capitalize ${
                  activeTab === tab ? 'bg-white text-[#14ae5c] shadow-sm' : 'text-gray-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-24 px-5">
          {activeTab === 'offers' && (
            <>
              {loading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="size-8 text-[#14ae5c] animate-spin mb-2" />
                  <p className="text-gray-400 text-[13px]">Loading offers...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <Utensils className="size-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-[14px] font-medium">No offers yet</p>
                  <p className="text-gray-400 text-[12px] mt-1 text-center">
                    Be the first to share leftover food in your neighborhood!
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-4 bg-[#14ae5c] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold"
                  >
                    Post an Offer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map(offer => (
                    <div key={offer.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-50 rounded-xl p-2.5 shrink-0">
                          <Utensils className="size-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[14px] font-semibold text-gray-800 truncate">
                              {offer.food_type}
                            </h3>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              offer.status === 'active' ? 'bg-green-100 text-green-700' :
                              offer.status === 'matched' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {offer.status}
                            </span>
                          </div>
                          {offer.description && (
                            <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{offer.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                              <Users className="size-3" />
                              {offer.portions} portion{offer.portions !== 1 ? 's' : ''}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                              <MapPin className="size-3" />
                              {offer.pickup_type === 'pickup' ? 'Pickup' : 'Delivery'}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                              <Clock className="size-3" />
                              {formatTime(offer.created_at)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-[11px] text-gray-400">{offer.user?.display_name}</p>
                            {offer.status === 'active' && user && offer.user?.id !== user.id && (
                              <button className="bg-[#14ae5c] text-white px-3 py-1.5 rounded-xl text-[12px] font-semibold active:scale-95 transition-transform">
                                Request
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'needs' && (
            <div className="flex flex-col items-center py-12">
              <Package className="size-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-[14px] font-medium">Food Needs</p>
              <p className="text-gray-400 text-[12px] mt-1 text-center">
                Post a food need and neighbors can help you out
              </p>
              <button
                onClick={() => !user ? navigate('/login') : toast('Coming soon', { description: 'Post a food need — coming soon!' })}
                className="mt-4 bg-[#14ae5c] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold"
              >
                Post a Need
              </button>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="flex flex-col items-center py-12">
              {!user ? (
                <>
                  <Utensils className="size-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-[14px] font-medium">Sign in to see matches</p>
                  <button onClick={() => navigate('/login')} className="mt-4 bg-[#14ae5c] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold">
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  <Users className="size-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-[14px] font-medium">No matches yet</p>
                  <p className="text-gray-400 text-[12px] mt-1 text-center">
                    Matches appear when your offers or needs are paired with neighbors
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <BottomNav />
      </div>

      {/* Create Offer Modal */}
      {showCreateForm && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowCreateForm(false)}>
          <div
            className="bg-white w-full rounded-t-3xl p-6 pb-[env(safe-area-inset-bottom)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-semibold text-gray-900">Share Food</h2>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Food Type */}
              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-2 block">Food Type *</label>
                <div className="flex flex-wrap gap-2">
                  {FOOD_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setForm(f => ({ ...f, food_type: type }))}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                        form.food_type === type
                          ? 'bg-[#14ae5c] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what you're sharing..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Portions */}
              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Portions</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setForm(f => ({ ...f, portions: Math.max(1, f.portions - 1) }))}
                    className="size-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold active:scale-90 transition-transform"
                  >
                    -
                  </button>
                  <span className="text-[18px] font-bold text-gray-800 w-8 text-center">{form.portions}</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, portions: f.portions + 1 }))}
                    className="size-9 rounded-full bg-[#14ae5c] text-white flex items-center justify-center font-bold active:scale-90 transition-transform"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Pickup Type */}
              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Handoff</label>
                <div className="flex gap-2">
                  {(['pickup', 'delivery'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setForm(f => ({ ...f, pickup_type: type }))}
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium capitalize transition-all ${
                        form.pickup_type === type
                          ? 'bg-[#14ae5c] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateOffer}
              disabled={creating || !form.food_type}
              className="w-full mt-5 bg-[#14ae5c] text-white py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {creating ? <Loader2 className="size-5 animate-spin" /> : 'Post Offer'}
            </button>
          </div>
        </div>
      )}
      </PageTransition>
    </MobileContainer>
  );
}
