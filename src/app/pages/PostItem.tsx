import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { apiFetch, uploadToPresignedUrl } from '../lib/api';
import {
  ArrowLeft,
  Camera,
  MapPin,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import SwipeBack from '../components/SwipeBack';

const categoryTitles: Record<string, string> = {
  leftovers: 'Share Food',
  'old-items': 'Share Items',
  borrow: 'Lend Item',
  'offer-help': 'Offer Help',
  'ask-help': 'Ask for Help',
  exchange: 'Exchange Item',
};

const foodTypes = [
  { value: 'cooked_meal', label: 'Cooked Meal' },
  { value: 'bread', label: 'Bread' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'dry_goods', label: 'Dry Goods' },
  { value: 'other', label: 'Other' },
];

export default function PostItem() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams] = useSearchParams();
  const editOfferId = searchParams.get('edit');
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'give' | 'get'>('give');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [foodType, setFoodType] = useState('cooked_meal');
  const [portions, setPortions] = useState(1);
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing offer data when editing
  useEffect(() => {
    if (!editOfferId) return;
    apiFetch(`/v1/leftovers/offers/${editOfferId}`)
      .then((res) => {
        const o = res.data ?? res;
        setTitle(o.title || '');
        setDescription(o.description || '');
        setQuantity(o.quantity || 1);
        if (o.survey) {
          setFoodType(o.survey.food_type || 'cooked_meal');
          setPortions(o.survey.portions || 1);
        }
        if (o.image_urls?.length) setExistingImageUrls(o.image_urls);
        else if (o.image_url) setExistingImageUrls([o.image_url]);
      })
      .catch(() => {});
  }, [editOfferId]);

  const pageTitle = editOfferId ? 'Edit Offer' : (categoryTitles[categoryId || ''] || 'Share');
  const isFood = categoryId === 'leftovers';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, reader.result as string].slice(0, 5));
        setImageFiles((prev) => [...prev, file].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadAllImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    const urls: string[] = [];
    for (const file of imageFiles) {
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
        const presigned = await apiFetch('/v1/uploads/presigned-url', {
          method: 'POST',
          body: JSON.stringify({ content_type: 'leftover_image', file_extension: safeExt }),
        });
        await uploadToPresignedUrl(presigned.data.upload_url, file);
        urls.push(presigned.data.file_url as string);
      } catch (err) {
        console.warn('Image upload failed, skipping:', err);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to create a post');
      navigate('/login');
      return;
    }

    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }

    setSubmitting(true);

    try {
      if (isFood) {
        if (tab === 'give') {
          // Upload any new images; combine with kept existing images
          const newUrls = await uploadAllImages();
          const allImageUrls = [...existingImageUrls, ...newUrls];

          const body: any = {
            title: title.trim(),
            description: description.trim() || undefined,
            image_urls: allImageUrls.length > 0 ? allImageUrls : undefined,
            survey: {
              schema_version: 1,
              food_type: foodType,
              portions,
              pickup_time_preference: 'flexible',
              distance_willing_km: 2,
            },
            quantity,
          };

          if (!editOfferId && expiryDate) {
            const expiryMs = new Date(expiryDate).getTime() - Date.now();
            const expiryHours = Math.max(1, Math.min(72, Math.round(expiryMs / 3600000)));
            body.expiry_hours = expiryHours;
          }

          if (editOfferId) {
            await apiFetch(`/v1/leftovers/offers/${editOfferId}`, {
              method: 'PATCH',
              body: JSON.stringify(body),
            });
          } else {
            await apiFetch('/v1/leftovers/offers', {
              method: 'POST',
              body: JSON.stringify(body),
            });
          }
        } else {
          // GET (need) post — title + description only
          await apiFetch('/v1/leftovers/needs', {
            method: 'POST',
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim() || undefined,
              urgency,
            }),
          });
        }
      } else {
        toast.error('This category is not yet available. Coming soon!');
        setSubmitting(false);
        return;
      }

      toast.success(editOfferId ? 'Post updated!' : 'Post created!', { duration: 2000 });
      setTimeout(() => navigate(`/category/${categoryId}`), 1500);
    } catch (err: any) {
      console.error('Post creation error:', err);
      toast.error(err?.message || 'Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileContainer>
      <PageTransition>
      <SwipeBack>
      <Toaster position="top-center" />
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)] border-b border-gray-50 dark:border-gray-800">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate(`/category/${categoryId}`)} className="text-gray-800 dark:text-gray-200">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white font-[Poppins,sans-serif]">{pageTitle}</h1>
            <div className="size-6" />
          </div>
        </div>

        {/* Not supported categories banner */}
        {!isFood && (
          <div className="mx-5 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
            <span className="text-[20px]">🚧</span>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-800">Coming Soon</p>
              <p className="text-[11px] text-gray-500">This category will be available in an upcoming update</p>
            </div>
          </div>
        )}

        {/* Not logged in prompt */}
        {!user && (
          <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
            <span className="text-[20px]">🔒</span>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-800">Sign in required</p>
              <p className="text-[11px] text-gray-500">You need an account to post items</p>
            </div>
            <button onClick={() => navigate('/login')} className="bg-[#14ae5c] text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold">
              Sign In
            </button>
          </div>
        )}

        {/* Give / Get tabs (food only) */}
        {isFood && (
          <div className="px-5 pt-4 pb-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {(['give', 'get'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all capitalize ${
                    tab === t ? 'bg-[#14ae5c] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t === 'give' ? 'Give (Share Food)' : 'Get (Request Food)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-8 px-5 pt-4">
          <div className="space-y-5">
            {/* Photos (GIVE only) */}
            {isFood && tab === 'give' && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-2 block">Photos</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 size-[80px] border-2 border-dashed border-[#14ae5c]/30 rounded-xl flex flex-col items-center justify-center bg-green-50/30 active:bg-green-50 transition-colors"
                  >
                    <Camera className="size-5 text-[#14ae5c] mb-0.5" />
                    <span className="text-[9px] text-[#14ae5c] font-medium">Add</span>
                  </button>
                  {/* Existing images (edit mode) */}
                  {existingImageUrls.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative shrink-0 size-[80px] rounded-xl overflow-hidden">
                      <img src={url} alt={`Existing ${idx + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExistingImageUrls(existingImageUrls.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full size-5 flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {/* New images */}
                  {images.map((img, idx) => (
                    <div key={`new-${idx}`} className="relative shrink-0 size-[80px] rounded-xl overflow-hidden">
                      <img src={img} alt={`Upload ${idx + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImages(images.filter((_, i) => i !== idx));
                          setImageFiles(imageFiles.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full size-5 flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-[11px] text-gray-400 mt-1">Add up to 5 photos</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1.5 block">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tab === 'give' ? 'What are you sharing?' : 'What do you need?'}
                required
                className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 border border-gray-100 dark:border-gray-700 focus:border-[#14ae5c] focus:outline-none transition-colors dark:text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1.5 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tab === 'give' ? 'Provide details about the food...' : 'Describe what you need...'}
                rows={3}
                className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 border border-gray-100 dark:border-gray-700 focus:border-[#14ae5c] focus:outline-none transition-colors resize-none dark:text-white"
              />
            </div>

            {/* Food Type (GIVE only) */}
            {isFood && tab === 'give' && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1.5 block">Food Type</label>
                <div className="flex gap-2 flex-wrap">
                  {foodTypes.map((ft) => (
                    <button
                      key={ft.value}
                      type="button"
                      onClick={() => setFoodType(ft.value)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                        foodType === ft.value
                          ? 'bg-[#14ae5c] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Urgency (GET only) */}
            {isFood && tab === 'get' && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1.5 block">Urgency</label>
                <div className="flex gap-2 flex-wrap">
                  {(['low', 'normal', 'high', 'urgent'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all capitalize ${
                        urgency === u
                          ? 'bg-[#14ae5c] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Portions (GIVE only) */}
            {isFood && tab === 'give' && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1.5 block">Portions</label>
                <input
                  type="number"
                  value={portions}
                  onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="50"
                  className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-[14px] border border-gray-100 dark:border-gray-700 focus:border-[#14ae5c] focus:outline-none transition-colors dark:text-white"
                />
              </div>
            )}

            {/* Expiry (GIVE only) */}
            {isFood && tab === 'give' && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1.5 block">Best Before</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-[14px] border border-gray-100 dark:border-gray-700 focus:border-[#14ae5c] focus:outline-none transition-colors dark:text-white"
                />
              </div>
            )}

            {/* Location */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3">
              <div className="bg-[#14ae5c]/10 rounded-full p-2">
                <MapPin className="size-4 text-[#14ae5c]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">Pickup Location</p>
                <p className="text-[11px] text-gray-400">
                  {profile?.neighborhood?.name || profile?.location || 'Your neighborhood'}
                </p>
              </div>
            </div>

            {/* Coins Info (GIVE only) */}
            {tab === 'give' && (
              <div className="bg-[#fff9e6] border border-[#f0a326]/20 rounded-xl p-4 flex items-center gap-3">
                <div className="size-[32px] rounded-full border-2 border-[#f0a326] flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#f0a326]">$</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">Earn up to 200 coins</p>
                  <p className="text-[11px] text-gray-500">When someone accepts your offer</p>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !user || !isFood}
              className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Check className="size-5" /> {editOfferId ? 'Update Offer' : tab === 'give' ? 'Publish Offer' : 'Post Request'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}
