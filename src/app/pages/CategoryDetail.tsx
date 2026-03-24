import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import PageTransition from '../components/PageTransition';
import SwipeBack from '../components/SwipeBack';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Clock,
  MessageCircle,
  Loader2,
  Heart,
  Search,
  Utensils,
  Package,
  Handshake,
  HeartHandshake,
  HelpCircle,
  ArrowLeftRight,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type CatMeta = {
  title: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
};

const categoryMeta: Record<string, CatMeta> = {
  leftovers:    { title: 'Leftovers',   Icon: Utensils,       iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  'old-items':  { title: 'Old Items',   Icon: Package,        iconBg: 'bg-blue-100',   iconColor: 'text-blue-500'   },
  borrow:       { title: 'Borrow',      Icon: Handshake,      iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
  'offer-help': { title: 'Offer Help',  Icon: HeartHandshake, iconBg: 'bg-green-100',  iconColor: 'text-green-500'  },
  'ask-help':   { title: 'Ask Help',    Icon: HelpCircle,     iconBg: 'bg-rose-100',   iconColor: 'text-rose-500'   },
  exchange:     { title: 'Exchange',    Icon: ArrowLeftRight, iconBg: 'bg-teal-100',   iconColor: 'text-teal-500'   },
};

const defaultMeta: CatMeta = { title: 'Share', Icon: Package, iconBg: 'bg-gray-100', iconColor: 'text-gray-400' };

function getRelativeTime(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CategoryDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'give' | 'get'>('give');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const handlePostClick = () => navigate(`/post-item/${categoryId}`);

  const [offers, setOffers] = useState<any[]>([]);
  const [needs, setNeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const meta = categoryMeta[categoryId || ''] || defaultMeta;
  const isLeftovers = categoryId === 'leftovers';

  const loadData = () => {
    if (!isLeftovers) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      apiFetch('/v1/leftovers/offers?status=active&limit=30').catch(() => ({ data: { offers: [] } })),
      apiFetch('/v1/leftovers/needs?status=active&limit=30').catch(() => ({ data: { needs: [] } })),
    ]).then(([offersRes, needsRes]) => {
      setOffers(offersRes?.data?.offers || []);
      setNeeds(needsRes?.data?.needs || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isLeftovers]);

  useEffect(() => {
    if (isLeftovers && user) {
      apiFetch('/v1/leftovers/favorites')
        .then(data => {
          if (data.success) setFavorites(new Set((data.data.offers || []).map((o: any) => o.id)));
        })
        .catch(() => {});
    }
  }, [isLeftovers, user]);

  const toggleFavorite = async (offerId: string) => {
    try {
      const data = await apiFetch(`/v1/leftovers/offers/${offerId}/favorite`, { method: 'POST' });
      if (data.success) {
        setFavorites(prev => {
          const next = new Set(prev);
          if (data.data.favorited) next.add(offerId); else next.delete(offerId);
          return next;
        });
      }
    } catch {}
  };

  const handleRequest = async (offerId: string) => {
    try {
      const data = await apiFetch(`/v1/leftovers/offers/${offerId}/request`, { method: 'POST' });
      if (data.success) {
        navigate(`/chat/${data.data.thread_id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start chat');
    }
  };

  const handleOfferHelp = async (needId: string) => {
    try {
      const data = await apiFetch(`/v1/leftovers/needs/${needId}/request`, { method: 'POST' });
      if (data.success) {
        navigate(`/chat/${data.data.thread_id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start chat');
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      await apiFetch(`/v1/leftovers/offers/${offerId}`, { method: 'DELETE' });
      toast.success('Offer deleted');
      setOffers(prev => prev.filter(o => o.id !== offerId));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const handleModifyOffer = (offerId: string) => {
    navigate(`/post-item/${categoryId}?edit=${offerId}`);
  };

  const handleDeleteNeed = async (needId: string) => {
    try {
      await apiFetch(`/v1/leftovers/needs/${needId}`, { method: 'DELETE' });
      toast.success('Post deleted');
      setNeeds(prev => prev.filter(n => n.id !== needId));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const visibleOffers = showFavoritesOnly ? offers.filter(o => favorites.has(o.id)) : offers;
  const visibleNeeds  = showFavoritesOnly ? needs.filter(n => favorites.has(n.id))  : needs;

  return (
    <MobileContainer>
      <PageTransition>
      <Toaster position="top-center" />
      <SwipeBack>
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-5 md:px-8 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate('/home')} className="text-gray-800 dark:text-gray-200">
              <ArrowLeft className="size-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className={`${meta.iconBg} rounded-xl p-1.5`}>
                <meta.Icon className={`size-5 ${meta.iconColor}`} />
              </div>
              <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white font-[Poppins,sans-serif]">{meta.title}</h1>
            </div>
            <button
              onClick={handlePostClick}
              className="bg-[#14ae5c] text-white rounded-full size-9 flex items-center justify-center shadow-md active:scale-95 transition-transform"
              aria-label="Add post"
            >
              <Plus className="size-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Give / Get Toggle + Favorites pill */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-1">
              {(['give', 'get'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all capitalize ${
                    activeTab === tab ? 'bg-[#14ae5c] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab === 'give' ? 'Give' : 'Get'}
                </button>
              ))}
            </div>
            {isLeftovers && (
              <button
                onClick={() => setShowFavoritesOnly(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border ${
                  showFavoritesOnly
                    ? 'bg-red-50 border-red-200 text-red-500'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                }`}
              >
                <Heart className={`size-3.5 ${showFavoritesOnly ? 'fill-red-500 text-red-500' : ''}`} />
                <span>Saved</span>
              </button>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="flex-1 overflow-y-auto pb-28 px-5 md:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
            </div>
          ) : !isLeftovers ? (
            <EmptyState
              Icon={meta.Icon}
              iconBg={meta.iconBg}
              iconColor={meta.iconColor}
              title="Coming Soon"
              description="This category will be available in an upcoming update."
            />
          ) : activeTab === 'give' ? (
            visibleOffers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleOffers.map(offer => (
                  <PostCard
                    key={offer.id}
                    post={offer}
                    navigate={navigate}
                    isFavorited={favorites.has(offer.id)}
                    onFavorite={() => toggleFavorite(offer.id)}
                    isOwner={user?.id === offer.user_id}
                    onRequest={() => handleRequest(offer.id)}
                    onDelete={() => handleDeleteOffer(offer.id)}
                    onModify={() => handleModifyOffer(offer.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                Icon={showFavoritesOnly ? Heart : meta.Icon}
                iconBg={showFavoritesOnly ? 'bg-red-100' : meta.iconBg}
                iconColor={showFavoritesOnly ? 'text-red-400' : meta.iconColor}
                title={showFavoritesOnly ? 'No saved items' : 'No items shared yet'}
                description={showFavoritesOnly ? 'Tap the heart on a post to save it here' : 'Be the first to share something!'}
                onAction={showFavoritesOnly ? undefined : handlePostClick}
                actionLabel="Share Something"
              />
            )
          ) : visibleNeeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleNeeds.map(need => (
                <RequestCard
                  key={need.id}
                  post={need}
                  navigate={navigate}
                  isOwner={user?.id === need.user_id}
                  onDelete={() => handleDeleteNeed(need.id)}
                  onOfferHelp={() => handleOfferHelp(need.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              Icon={showFavoritesOnly ? Heart : Search}
              iconBg={showFavoritesOnly ? 'bg-red-100' : 'bg-gray-100'}
              iconColor={showFavoritesOnly ? 'text-red-400' : 'text-gray-400'}
              title={showFavoritesOnly ? 'No saved requests' : 'No requests available'}
              description={showFavoritesOnly ? 'Tap the heart on a post to save it here' : 'Check back later to see what your neighbors need'}
            />
          )}
        </div>

        <BottomNav />
      </div>
      </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}

function PostCard({ post, navigate, isFavorited, onFavorite, isOwner, onRequest, onDelete, onModify }: {
  post: any;
  navigate: any;
  isFavorited: boolean;
  onFavorite: () => void;
  isOwner: boolean;
  onRequest: () => void;
  onDelete: () => void;
  onModify: () => void;
}) {
  const userName = post.user?.display_name || 'Neighbor';
  const timeAgo = getRelativeTime(post.created_at);
  const portions = post.survey?.portions;
  const [imgIdx, setImgIdx] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Support both image_urls array and legacy image_url
  const imageUrls: string[] = post.image_urls?.length ? post.image_urls : (post.image_url ? [post.image_url] : []);

  return (
    <>
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-xs shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="bg-red-100 rounded-full p-3">
                <Trash2 className="size-6 text-red-500" />
              </div>
              <p className="text-[16px] font-semibold text-gray-800 dark:text-white">Delete Post?</p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                This will permanently remove your offer. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-[13px] font-medium text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm cursor-pointer"
        onClick={() => navigate(`/leftovers/${post.id}`)}
      >
        {/* Image carousel */}
        {imageUrls.length > 0 && (
          <div className="relative w-full h-[140px] overflow-hidden">
            <img src={imageUrls[imgIdx]} alt={post.title} className="w-full h-full object-cover" />
            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + imageUrls.length) % imageUrls.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % imageUrls.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5"
                >
                  <ChevronRight className="size-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {imageUrls.map((_, i) => (
                    <div key={i} className={`size-1.5 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 p-4 pb-2">
          <div className="size-10 rounded-full bg-[#14ae5c]/10 flex items-center justify-center">
            <span className="text-[16px] font-bold text-[#14ae5c]">{userName[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-800 dark:text-white">{userName}</p>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-0.5"><Clock className="size-3" />{timeAgo}</span>
            </div>
          </div>
          {!isOwner && (
            <button
              onClick={e => { e.stopPropagation(); onFavorite(); }}
              className="p-1.5 rounded-full transition-colors active:scale-90"
            >
              <Heart className={`size-4 transition-colors ${isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-300'}`} />
            </button>
          )}
        </div>

        <div className="px-4 pb-2">
          <h4 className="text-[14px] font-semibold text-gray-800 dark:text-white mb-1">{post.title}</h4>
          {post.description && (
            <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2">{post.description}</p>
          )}
          {portions && (
            <p className="text-[11px] text-[#14ae5c] mt-1 font-medium">{portions} portion{portions > 1 ? 's' : ''} available</p>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 flex items-center justify-between">
          {isOwner ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Your post</span>
              <button
                onClick={e => { e.stopPropagation(); onModify(); }}
                className="p-1.5 text-[#14ae5c] active:scale-90 transition-transform"
                title="Edit"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="p-1.5 text-red-400 active:scale-90 transition-transform"
                title="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onRequest(); }}
              className="bg-[#14ae5c] text-white px-4 py-2 rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <MessageCircle className="size-3.5" /> Request
            </button>
          )}
          {/* Coins only shown to the post owner (giver) */}
          {isOwner && (
            <div className="flex items-center gap-1.5 text-[#f0a326] font-semibold text-[13px]">
              <div className="size-[18px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                <span className="text-[7px] font-bold">$</span>
              </div>
              200
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RequestCard({ post, navigate, isOwner, onDelete, onOfferHelp }: {
  post: any;
  navigate: any;
  isOwner: boolean;
  onDelete: () => void;
  onOfferHelp: () => void;
}) {
  const userName = post.user?.display_name || 'Neighbor';
  const timeAgo = getRelativeTime(post.created_at);
  const urgencyColors: Record<string, string> = {
    urgent: 'text-red-500', high: 'text-orange-500', normal: 'text-gray-500', low: 'text-gray-400',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-full bg-[#52ADE5]/10 flex items-center justify-center">
          <span className="text-[16px] font-bold text-[#52ADE5]">{userName[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-800 dark:text-white">{userName}</p>
          <p className={`text-[11px] ${urgencyColors[post.urgency] || 'text-gray-400'}`}>
            {timeAgo} &middot; {post.urgency || 'normal'} urgency
          </p>
        </div>
      </div>
      {post.title && <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1">{post.title}</p>}
      {post.description && <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3">{post.description}</p>}
      <div className="flex items-center justify-between">
        {isOwner ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">Your request</span>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 active:scale-90 transition-transform"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOfferHelp}
            className="bg-[#14ae5c] text-white px-4 py-2 rounded-full text-[12px] font-semibold active:scale-95 transition-transform"
          >
            Offer to Help
          </button>
        )}
        {/* Coins only shown to the request owner (receiver earns on completion) */}
        {isOwner && (
          <div className="flex items-center gap-1 text-[#f0a326] font-semibold text-[12px]">
            <div className="size-[16px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
              <span className="text-[7px] font-bold">$</span>
            </div>
            50
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ Icon, iconBg, iconColor, title, description, onAction, actionLabel }: {
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className={`${iconBg} rounded-3xl p-6 mb-4`}>
        <Icon className={`size-12 ${iconColor}`} />
      </div>
      <p className="text-[16px] font-semibold text-gray-700 dark:text-gray-200 mb-1">{title}</p>
      <p className="text-[13px] text-gray-400 text-center px-8 mb-4">{description}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="bg-[#14ae5c] text-white px-6 py-2.5 rounded-full text-[13px] font-semibold active:scale-95 transition-transform"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
