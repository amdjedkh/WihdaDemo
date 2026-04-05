import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import { toast, Toaster } from 'sonner';
import imgCats       from '../../assets/cats.png';
import imgPlant      from '../../assets/plant.png';
import imgEvent      from '../../assets/event.png';
import imgEco        from '../../assets/eco-friendly.png';
import imgBadges     from '../../assets/badges.png';
import imgDonation   from '../../assets/donation.png';
import imgFlexy      from '../../assets/flexy.png';

const ITEM_IMAGES: Record<string, string> = {
  'item-1':    imgCats,
  'item-2':    imgPlant,
  'item-3':    imgEvent,
  'item-4':    imgEco,
  'item-5':    imgBadges,
  'item-6':    imgDonation,
  'item-flexy': imgFlexy,
};
import {
  ArrowLeft,
  Search,
  Loader2,
  Check,
  X,
  Phone,
  User as UserIcon,
} from 'lucide-react';


interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  price_coins: number;
  is_active: number;
  redeemed: boolean;
  can_afford: boolean;
  redemption: {
    delivery_status: string;
    redeemed_at: string;
  } | null;
}

interface FlexyForm {
  full_name: string;
  phone_number: string;
}

export default function Store() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // Flexy form modal state
  const [flexyItem, setFlexyItem] = useState<StoreItem | null>(null);
  const [flexyForm, setFlexyForm] = useState<FlexyForm>({ full_name: '', phone_number: '' });
  const [flexySubmitting, setFlexySubmitting] = useState(false);
  const { language } = useApp();
  const storeCategories = [
    { key: 'All', label: t(language, 'catAll') },
    { key: 'Popular', label: t(language, 'catPopular') },
    { key: 'New', label: t(language, 'catNew') },
    { key: 'Top', label: t(language, 'catTop') },
  ];

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

  // For the Flexy item — open form modal
  const handleItemClick = (item: StoreItem) => {
    if (item.redeemed || !item.can_afford || !item.is_active) return;
    if (item.id === 'item-flexy') {
      setFlexyItem(item);
      setFlexyForm({ full_name: '', phone_number: '' });
      return;
    }
    // For other items: direct redeem
    handleDirectRedeem(item.id);
  };

  const handleDirectRedeem = async (itemId: string) => {
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
        setLoading(true);
        await loadStore();
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === 'INSUFFICIENT_COINS') {
        toast.error('Not enough coins');
      } else if (code === 'ALREADY_REDEEMED') {
        toast.error('Already redeemed');
      } else {
        toast.error(err?.message || 'Could not redeem item');
      }
    } finally {
      setRedeemingId(null);
    }
  };

  const handleFlexySubmit = async () => {
    if (!flexyItem) return;
    if (!flexyForm.full_name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!flexyForm.phone_number.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    setFlexySubmitting(true);
    try {
      const data = await apiFetch(`/v1/store/${flexyItem.id}/redeem`, {
        method: 'POST',
        body: JSON.stringify({
          full_name: flexyForm.full_name.trim(),
          phone_number: flexyForm.phone_number.trim(),
        }),
      });
      if (data.success) {
        setFlexyItem(null);
        toast.success('Flexy redeemed! 🎉', {
          description: data.data?.message || 'Your Flexy will be sent within 48 hours',
          duration: 4000,
        });
        setLoading(true);
        await loadStore();
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === 'INSUFFICIENT_COINS') {
        toast.error('Not enough coins', {
          description: `You need ${(flexyItem?.price_coins ?? 0).toLocaleString()} coins`,
        });
      } else if (code === 'ALREADY_REDEEMED') {
        toast.error('Already redeemed');
        setFlexyItem(null);
        setLoading(true);
        await loadStore();
      } else {
        toast.error(err?.message || 'Could not redeem');
      }
    } finally {
      setFlexySubmitting(false);
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
            <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">{t(language, 'storeTitle')}</h1>
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
              placeholder={t(language, 'searchRewards')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-[13px] placeholder:text-gray-400 border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {storeCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.key ? 'bg-[#14ae5c] text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto pb-28 px-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="text-[48px] mb-3">🏪</span>
              <p className="text-[16px] font-semibold text-gray-700 mb-1">{t(language, 'noItemsFound')}</p>
              <p className="text-[13px] text-gray-400 text-center px-8">
                {searchQuery ? t(language, 'tryDifferentSearch') : t(language, 'checkBackForRewards')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const isRedeeming = redeemingId === item.id;
                const isComingSoon = !item.is_active;

                return (
                  <div
                    key={item.id}
                    className={`${item.color || 'bg-gray-50'} rounded-2xl p-4 flex flex-col items-center relative overflow-hidden ${isComingSoon ? 'opacity-60' : ''}`}
                  >
                    {isComingSoon && (
                      <div className="absolute top-2 right-2 bg-gray-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        {t(language, 'comingSoon')}
                      </div>
                    )}

                    {/* Icon */}
                    <div className="mb-3 mt-2 size-16 flex items-center justify-center">
                      {ITEM_IMAGES[item.id] ? (
                        <img src={ITEM_IMAGES[item.id]} alt={item.name} className="size-16 object-contain" />
                      ) : (
                        <span className="text-[40px]">{item.icon || '🎁'}</span>
                      )}
                    </div>

                    {/* Name */}
                    <p className="text-[13px] font-semibold text-gray-800 text-center mb-1 leading-tight">
                      {item.name}
                    </p>

                    {/* Description */}
                    {item.description && (
                      <p className="text-[10px] text-gray-400 text-center mb-2 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-1 text-[#f0a326] mb-3">
                      <div className="size-[16px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                        <span className="text-[7px] font-bold">$</span>
                      </div>
                      <span className="text-[13px] font-bold">{item.price_coins.toLocaleString()}</span>
                    </div>

                    {/* Claim Button */}
                    {isComingSoon ? (
                      <div className="w-full py-2 rounded-xl text-[12px] font-semibold bg-gray-200 text-gray-400 text-center">
                        {t(language, 'comingSoon')}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleItemClick(item)}
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
                            <Loader2 className="size-3 animate-spin" /> {t(language, 'redeemingBtn')}
                          </span>
                        ) : item.redeemed ? (
                          <span className="flex items-center justify-center gap-1">
                            <Check className="size-3" /> {t(language, 'claimedBtn')}
                          </span>
                        ) : item.can_afford ? (
                          t(language, 'redeemBtn')
                        ) : (
                          t(language, 'notEnoughCoins')
                        )}
                      </button>
                    )}

                    {/* Delivery status badge for redeemed Flexy */}
                    {item.redeemed && item.redemption?.delivery_status && (
                      <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                        {item.redemption.delivery_status === 'pending'
                          ? t(language, 'deliveryPending')
                          : item.redemption.delivery_status === 'delivered'
                          ? t(language, 'deliveredStatus')
                          : item.redemption.delivery_status}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav />
      </div>

      {/* ── Flexy Redemption Form Modal ──────────────────────────────────── */}
      {flexyItem && (
        <div className="fixed inset-0 z-[70] flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !flexySubmitting && setFlexyItem(null)}
          />

          {/* Sheet */}
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] animate-slide-up shadow-2xl">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {/* Close */}
            <button
              onClick={() => !flexySubmitting && setFlexyItem(null)}
              className="absolute top-4 right-5 size-8 bg-gray-100 rounded-full flex items-center justify-center"
              disabled={flexySubmitting}
            >
              <X className="size-4 text-gray-500" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-green-50 rounded-2xl p-3 flex items-center justify-center size-16">
                {ITEM_IMAGES[flexyItem.id] ? (
                  <img src={ITEM_IMAGES[flexyItem.id]} alt={flexyItem.name} className="size-10 object-contain" />
                ) : (
                  <span className="text-[32px] leading-none">{flexyItem.icon || '🎁'}</span>
                )}
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-gray-900">{flexyItem.name}</h3>
                <div className="flex items-center gap-1 text-[#f0a326] mt-0.5">
                  <div className="size-[14px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                    <span className="text-[6px] font-bold">$</span>
                  </div>
                  <span className="text-[13px] font-semibold">{flexyItem.price_coins.toLocaleString()} coins</span>
                </div>
              </div>
            </div>

            <p className="text-[13px] text-gray-500 mb-5">
              {t(language, 'flexyFormDesc')}
            </p>

            {/* Full Name */}
            <div className="mb-4">
              <label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">{t(language, 'fullNameLabel')}</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Ahmed Benali"
                  value={flexyForm.full_name}
                  onChange={(e) => setFlexyForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none"
                  disabled={flexySubmitting}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="mb-6">
              <label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">{t(language, 'mobileNumberLabel')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="e.g. 0770 000 000"
                  value={flexyForm.phone_number}
                  onChange={(e) => setFlexyForm((f) => ({ ...f, phone_number: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none"
                  disabled={flexySubmitting}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleFlexySubmit}
              disabled={flexySubmitting || !flexyForm.full_name.trim() || !flexyForm.phone_number.trim()}
              className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {flexySubmitting ? (
                <><Loader2 className="size-5 animate-spin" /> {t(language, 'processingBtn')}</>
              ) : (
                <><Check className="size-5" /> {t(language, 'confirmRedemption')}</>
              )}
            </button>
          </div>
        </div>
      )}
      </PageTransition>
    </MobileContainer>
  );
}
