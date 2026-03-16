import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  Search,
  Heart,
  Loader2,
  Check,
} from 'lucide-react';

const storeCategories = ['All', 'Popular', 'New', 'Top'];

interface StoreItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  price_coins: number;
  redeemed: boolean;
  can_afford: boolean;
}

export default function Store() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const loadStore = async () => {
    try {
      const data = await apiFetch('/v1/store');
      if (data.success) {
        setItems(data.data.items || []);
        setUserCoins(data.data.coin_balance ?? 0);
      }
    } catch {
      toast.error('Failed to load store');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleClaim = async (itemId: string) => {
    if (redeemingId) return;
    setRedeemingId(itemId);
    try {
      const data = await apiFetch(`/v1/store/${itemId}/redeem`, { method: 'POST' });
      if (data.success) {
        const item = items.find((i) => i.id === itemId);
        toast(`${item?.name ?? 'Item'} redeemed!`, {
          description: `${(item?.price_coins ?? 0).toLocaleString()} coins deducted`,
          duration: 2500,
        });
        // Reload store to get updated balance and redeemed state
        setLoading(true);
        await loadStore();
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === 'INSUFFICIENT_COINS') {
        const item = items.find((i) => i.id === itemId);
        toast.error('Not enough coins', {
          description: `You need ${(item?.price_coins ?? 0).toLocaleString()} coins to redeem this`,
        });
      } else if (code === 'ALREADY_REDEEMED') {
        toast.error('Already redeemed', { description: 'You have already claimed this item' });
      } else {
        toast.error(err?.message || 'Could not redeem item');
      }
    } finally {
      setRedeemingId(null);
    }
  };

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
            <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">Rewards Store</h1>
            <div className="flex items-center gap-1.5 bg-[#fff9e6] px-3 py-1.5 rounded-full">
              <div className="size-[16px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                <span className="text-[7px] font-bold text-[#f0a326]">$</span>
              </div>
              <span className="text-[13px] font-semibold text-[#f0a326]">{userCoins.toLocaleString()}</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for rewards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-[13px] placeholder:text-gray-400 border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {storeCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-[#14ae5c] text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto pb-24 px-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="text-[48px] mb-3">🏪</span>
              <p className="text-[16px] font-semibold text-gray-700 mb-1">No items found</p>
              <p className="text-[13px] text-gray-400 text-center px-8">
                {searchQuery ? 'Try a different search term' : 'Check back later for new rewards'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const isRedeeming = redeemingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`${item.color || 'bg-gray-50'} rounded-2xl p-4 flex flex-col items-center relative overflow-hidden`}
                  >
                    {/* Favorite placeholder (visual only) */}
                    <button className="absolute top-3 right-3">
                      <Heart className="size-4 text-gray-300" />
                    </button>

                    {/* Icon */}
                    <div className="text-[40px] mb-3 mt-2">{item.icon}</div>

                    {/* Name */}
                    <p className="text-[13px] font-semibold text-gray-800 text-center mb-2 leading-tight">
                      {item.name}
                    </p>

                    {/* Price */}
                    <div className="flex items-center gap-1 text-[#f0a326] mb-3">
                      <div className="size-[16px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                        <span className="text-[7px] font-bold">$</span>
                      </div>
                      <span className="text-[13px] font-bold">{item.price_coins.toLocaleString()}</span>
                    </div>

                    {/* Claim Button */}
                    <button
                      onClick={() => handleClaim(item.id)}
                      disabled={item.redeemed || !item.can_afford || isRedeeming || redeemingId !== null}
                      className={`w-full py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${
                        item.redeemed
                          ? 'bg-gray-200 text-gray-500'
                          : item.can_afford
                          ? 'bg-[#14ae5c] text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isRedeeming ? (
                        <span className="flex items-center justify-center gap-1">
                          <Loader2 className="size-3 animate-spin" /> Redeeming...
                        </span>
                      ) : item.redeemed ? (
                        <span className="flex items-center justify-center gap-1">
                          <Check className="size-3" /> Claimed
                        </span>
                      ) : item.can_afford ? (
                        'Redeem'
                      ) : (
                        'Not enough coins'
                      )}
                    </button>
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
