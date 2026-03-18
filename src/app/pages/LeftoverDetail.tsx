import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import SwipeBack from '../components/SwipeBack';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  Loader2,
  Utensils,
  Trash2,
  Heart,
  User,
} from 'lucide-react';

function getRelativeTime(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LeftoverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/v1/leftovers/offers/${id}`)
      .then(res => {
        if (res.success) setOffer(res.data);
      })
      .catch(() => toast.error('Failed to load offer'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    apiFetch('/v1/leftovers/favorites')
      .then(res => {
        if (res.success) {
          const favIds = new Set((res.data.offers || []).map((o: any) => o.id));
          setIsFavorited(favIds.has(id));
        }
      })
      .catch(() => {});
  }, [id, user]);

  const handleRequest = async () => {
    if (!user) { navigate('/login'); return; }
    setRequesting(true);
    try {
      const data = await apiFetch(`/v1/leftovers/offers/${id}/request`, { method: 'POST' });
      if (data.success) {
        navigate(`/chat/${data.data.thread_id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start chat');
    } finally {
      setRequesting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      const data = await apiFetch(`/v1/leftovers/offers/${id}/favorite`, { method: 'POST' });
      if (data.success) setIsFavorited(data.data.favorited);
    } catch {}
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await apiFetch(`/v1/leftovers/offers/${id}`, { method: 'DELETE' });
      toast.success('Offer deleted');
      navigate('/category/leftovers');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const isOwner = user?.id === offer?.user_id;

  return (
    <MobileContainer>
      <PageTransition>
      <Toaster position="top-center" />
      <SwipeBack>
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate(-1)} className="text-gray-800 dark:text-gray-200">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white font-[Poppins,sans-serif]">Offer Details</h1>
            {!loading && offer && !isOwner && (
              <button onClick={handleToggleFavorite} className="p-1 active:scale-90 transition-transform">
                <Heart className={`size-5 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
              </button>
            )}
            {!loading && offer && isOwner && (
              <button onClick={handleDelete} className="p-1 text-red-400 active:scale-90 transition-transform">
                <Trash2 className="size-5" />
              </button>
            )}
            {(loading || !offer) && <div className="size-6" />}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
          </div>
        ) : !offer ? (
          <div className="flex items-center justify-center flex-1">
            <p className="text-gray-400">Offer not found</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Image */}
            {offer.image_url ? (
              <div className="w-full h-[220px] overflow-hidden">
                <img src={offer.image_url} alt={offer.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-[160px] bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <Utensils className="size-16 text-orange-300" />
              </div>
            )}

            {/* Content */}
            <div className="px-5 py-4 space-y-4">
              {/* Title + Meta */}
              <div>
                <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-1">{offer.title}</h2>
                <div className="flex items-center gap-3 text-[12px] text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="size-3" />{getRelativeTime(offer.created_at)}</span>
                  {offer.survey?.portions && (
                    <span className="text-[#14ae5c] font-medium">{offer.survey.portions} portion{offer.survey.portions > 1 ? 's' : ''}</span>
                  )}
                  {offer.expiry_at && (
                    <span>Expires {getRelativeTime(offer.expiry_at)} from now</span>
                  )}
                </div>
              </div>

              {/* Description */}
              {offer.description && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                  <p className="text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed">{offer.description}</p>
                </div>
              )}

              {/* Survey info */}
              {offer.survey && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4">
                  <p className="text-[13px] font-semibold text-orange-700 dark:text-orange-300 mb-2">Food Details</p>
                  <div className="flex flex-wrap gap-2">
                    {offer.survey.food_type && (
                      <span className="bg-orange-100 dark:bg-orange-800/40 text-orange-600 dark:text-orange-300 px-3 py-1 rounded-full text-[11px] font-medium capitalize">
                        {offer.survey.food_type.replace('_', ' ')}
                      </span>
                    )}
                    {offer.survey.pickup_time_preference && (
                      <span className="bg-orange-100 dark:bg-orange-800/40 text-orange-600 dark:text-orange-300 px-3 py-1 rounded-full text-[11px] font-medium capitalize">
                        {offer.survey.pickup_time_preference} pickup
                      </span>
                    )}
                    {offer.survey.diet_constraints?.length > 0 && offer.survey.diet_constraints.map((d: string) => (
                      <span key={d} className="bg-green-100 dark:bg-green-800/40 text-green-600 dark:text-green-300 px-3 py-1 rounded-full text-[11px] font-medium">{d}</span>
                    ))}
                  </div>
                  {offer.survey.notes && (
                    <p className="text-[12px] text-orange-600 dark:text-orange-300 mt-2">{offer.survey.notes}</p>
                  )}
                </div>
              )}

              {/* Poster info */}
              <div className="flex items-center gap-3 py-3 border-t border-gray-100 dark:border-gray-800">
                <div className="size-10 rounded-full bg-[#14ae5c]/10 flex items-center justify-center">
                  <User className="size-5 text-[#14ae5c]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-gray-800 dark:text-white">{offer.user?.display_name || 'Neighbor'}</p>
                  <p className="text-[11px] text-gray-400">Posted this offer</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom action */}
        {!loading && offer && !isOwner && (
          <div className="px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleRequest}
              disabled={requesting || offer.status !== 'active'}
              className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {requesting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="size-5" />
                  {offer.status === 'active' ? 'Request this Offer' : 'No longer available'}
                </>
              )}
            </button>
          </div>
        )}

        {!loading && offer && isOwner && (
          <div className="px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-center text-[13px] text-gray-400">This is your offer</p>
          </div>
        )}
      </div>
      </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}
