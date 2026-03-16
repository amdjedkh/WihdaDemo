import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import BottomNav from '../components/BottomNav';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import PageTransition from '../components/PageTransition';
import SwipeBack from '../components/SwipeBack';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Clock,
  MapPin,
  MessageCircle,
  Loader2,
  Heart,
} from 'lucide-react';

const categoryMeta: Record<string, { title: string; emoji: string; color: string }> = {
  leftovers: { title: 'Leftovers', emoji: '🍞', color: 'bg-orange-50' },
  'old-items': { title: 'Old Items', emoji: '📦', color: 'bg-blue-50' },
  borrow: { title: 'Borrow', emoji: '🤝', color: 'bg-purple-50' },
  'offer-help': { title: 'Offer Help', emoji: '💪', color: 'bg-green-50' },
  'ask-help': { title: 'Ask Help', emoji: '🆘', color: 'bg-rose-50' },
  exchange: { title: 'Exchange', emoji: '🔄', color: 'bg-teal-50' },
};

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

  const handlePostClick = () => {
    navigate(`/post-item/${categoryId}`);
  };

  const [offers, setOffers] = useState<any[]>([]);
  const [needs, setNeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const meta = categoryMeta[categoryId || ''] || { title: 'Share', emoji: '📋', color: 'bg-gray-50' };
  const isLeftovers = categoryId === 'leftovers';

  useEffect(() => {
    if (!isLeftovers) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiFetch('/v1/leftovers/offers?status=active&limit=30').catch(() => ({ data: { offers: [] } })),
      apiFetch('/v1/leftovers/needs?status=active&limit=30').catch(() => ({ data: { needs: [] } })),
    ]).then(([offersRes, needsRes]) => {
      setOffers(offersRes?.data?.offers || []);
      setNeeds(needsRes?.data?.needs || []);
    }).finally(() => setLoading(false));
  }, [isLeftovers]);

  // Load user's existing favorites on mount
  useEffect(() => {
    if (isLeftovers && user) {
      apiFetch('/v1/leftovers/favorites')
        .then(data => {
          if (data.success) {
            setFavorites(new Set((data.data.offers || []).map((o: any) => o.id)));
          }
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

  // Filter offers/needs when showFavoritesOnly is active
  const visibleOffers = showFavoritesOnly
    ? offers.filter((o) => favorites.has(o.id))
    : offers;

  const visibleNeeds = showFavoritesOnly
    ? needs.filter((n) => favorites.has(n.id))
    : needs;

  return (
    <MobileContainer>
      <PageTransition>
      <Toaster position="top-center" />
      <SwipeBack>
      <div className="flex flex-col size-full bg-white">
        {/* Header */}
        <div className="px-5 md:px-8 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate('/home')} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[18px]">{meta.emoji}</span>
              <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">{meta.title}</h1>
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
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-1">
              <button
                onClick={() => setActiveTab('give')}
                className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === 'give'
                    ? 'bg-[#14ae5c] text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Give
              </button>
              <button
                onClick={() => setActiveTab('get')}
                className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === 'get'
                    ? 'bg-[#14ae5c] text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Get
              </button>
            </div>
            {isLeftovers && (
              <button
                onClick={() => setShowFavoritesOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border ${
                  showFavoritesOnly
                    ? 'bg-red-50 border-red-200 text-red-500'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
                aria-label="Toggle favorites only"
              >
                <Heart className={`size-3.5 ${showFavoritesOnly ? 'fill-red-500 text-red-500' : ''}`} />
                <span>Saved</span>
              </button>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-28 px-5 md:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
            </div>
          ) : !isLeftovers ? (
            <EmptyState
              emoji={meta.emoji}
              title="Coming Soon"
              description="This category will be available in an upcoming update."
            />
          ) : activeTab === 'give' ? (
            visibleOffers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleOffers.map((offer) => (
                  <PostCard
                    key={offer.id}
                    post={offer}
                    navigate={navigate}
                    isFavorited={favorites.has(offer.id)}
                    onFavorite={() => toggleFavorite(offer.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                emoji={showFavoritesOnly ? '❤️' : '📦'}
                title={showFavoritesOnly ? 'No saved items' : 'No items shared yet'}
                description={showFavoritesOnly ? 'Tap the heart on a post to save it here' : 'Be the first to share something!'}
                onAction={showFavoritesOnly ? undefined : handlePostClick}
                actionLabel="Share Something"
              />
            )
          ) : visibleNeeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleNeeds.map((need) => (
                <RequestCard key={need.id} post={need} navigate={navigate} />
              ))}
            </div>
          ) : (
            <EmptyState
              emoji={showFavoritesOnly ? '❤️' : '🔍'}
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

function PostCard({
  post,
  navigate,
  isFavorited,
  onFavorite,
}: {
  post: any;
  navigate: any;
  isFavorited: boolean;
  onFavorite: () => void;
}) {
  const userName = post.user?.display_name || 'Neighbor';
  const timeAgo = getRelativeTime(post.created_at);
  const portions = post.survey?.portions;
  const coins = 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* User header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className="size-10 rounded-full bg-[#14ae5c]/10 flex items-center justify-center">
          <span className="text-[16px] font-bold text-[#14ae5c]">{userName[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-800">{userName}</p>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-0.5"><Clock className="size-3" />{timeAgo}</span>
          </div>
        </div>
        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className="p-1.5 rounded-full transition-colors active:scale-90"
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={`size-4 transition-colors ${
              isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-300'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <h4 className="text-[14px] md:text-[16px] font-semibold text-gray-800 mb-1">{post.title}</h4>
        {post.description && (
          <p className="text-[12px] text-gray-500 line-clamp-2">{post.description}</p>
        )}
        {portions && (
          <p className="text-[11px] text-[#14ae5c] mt-1 font-medium">{portions} portion{portions > 1 ? 's' : ''} available</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 flex items-center justify-between">
        <button
          onClick={() => navigate(`/chat/${post.id}`)}
          className="bg-[#14ae5c] text-white px-4 py-2 rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <MessageCircle className="size-3.5" /> Request
        </button>
        <div className="flex items-center gap-1.5 text-[#f0a326] font-semibold text-[13px]">
          <div className="size-[18px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
            <span className="text-[7px] font-bold">$</span>
          </div>
          {coins}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ post, navigate }: { post: any; navigate: any }) {
  const userName = post.user?.display_name || 'Neighbor';
  const timeAgo = getRelativeTime(post.created_at);
  const portions = post.survey?.portions;
  const urgencyColors: Record<string, string> = {
    urgent: 'text-red-500',
    high: 'text-orange-500',
    normal: 'text-gray-500',
    low: 'text-gray-400',
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-full bg-[#52ADE5]/10 flex items-center justify-center">
          <span className="text-[16px] font-bold text-[#52ADE5]">{userName[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-800">{userName}</p>
          <p className={`text-[11px] ${urgencyColors[post.urgency] || 'text-gray-400'}`}>
            {timeAgo} &middot; {post.urgency || 'normal'} urgency
          </p>
        </div>
      </div>
      {portions && (
        <p className="text-[13px] font-medium text-gray-700 mb-1">Needs {portions} portion{portions > 1 ? 's' : ''}</p>
      )}
      {post.survey?.notes && (
        <p className="text-[12px] text-gray-500 mb-3">{post.survey.notes}</p>
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/chat/${post.id}`)}
          className="bg-[#14ae5c] text-white px-4 py-2 rounded-full text-[12px] font-semibold active:scale-95 transition-transform"
        >
          Offer to Help
        </button>
        <div className="flex items-center gap-1 text-[#f0a326] font-semibold text-[12px]">
          <div className="size-[16px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
            <span className="text-[7px] font-bold">$</span>
          </div>
          50
        </div>
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, description, onAction, actionLabel }: {
  emoji: string;
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <span className="text-[48px] mb-3">{emoji}</span>
      <p className="text-[16px] font-semibold text-gray-700 mb-1">{title}</p>
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
