import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
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
  { value: 'raw_ingredients', label: 'Raw Ingredients' },
  { value: 'bread', label: 'Bread' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'packaged', label: 'Packaged' },
  { value: 'dry_goods', label: 'Dry Goods' },
  { value: 'other', label: 'Other' },
];

const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'used', label: 'Used' },
];

export default function PostItem() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [foodType, setFoodType] = useState('cooked_meal');
  const [portions, setPortions] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pageTitle = categoryTitles[categoryId || ''] || 'Share';
  const isFood = categoryId === 'leftovers';
  const isHelp = categoryId === 'offer-help' || categoryId === 'ask-help';

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
        // Leftovers: use the /v1/leftovers/offers endpoint
        const body: any = {
          title: title.trim(),
          description: description.trim() || undefined,
          survey: {
            schema_version: 1,
            food_type: foodType,
            portions: portions,
            pickup_time_preference: 'flexible',
            distance_willing_km: 2,
          },
          quantity: quantity,
        };

        if (expiryDate) {
          // Convert date to hours from now
          const expiryMs = new Date(expiryDate).getTime() - Date.now();
          const expiryHours = Math.max(1, Math.min(72, Math.round(expiryMs / 3600000)));
          body.expiry_hours = expiryHours;
        }

        await apiFetch('/v1/leftovers/offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        // Other categories: not yet supported in backend
        toast.error('This category is not yet available. Coming soon!');
        setSubmitting(false);
        return;
      }

      toast.success('Post created! You earned coins for sharing.', { duration: 2000 });
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
      <div className="flex flex-col size-full bg-white">
        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)] border-b border-gray-50">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate(`/category/${categoryId}`)} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">{pageTitle}</h1>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-8 px-5 pt-4">
          <div className="space-y-5">
            {/* Photos */}
            <div>
              <label className="text-[13px] font-semibold text-gray-800 mb-2 block">Photos</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 size-[80px] border-2 border-dashed border-[#14ae5c]/30 rounded-xl flex flex-col items-center justify-center bg-green-50/30 active:bg-green-50 transition-colors"
                >
                  <Camera className="size-5 text-[#14ae5c] mb-0.5" />
                  <span className="text-[9px] text-[#14ae5c] font-medium">Add</span>
                </button>
                {images.map((img, idx) => (
                  <div key={idx} className="relative shrink-0 size-[80px] rounded-xl overflow-hidden">
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

            {/* Title */}
            <div>
              <label className="text-[13px] font-semibold text-gray-800 mb-1.5 block">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you sharing?"
                required
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[13px] font-semibold text-gray-800 mb-1.5 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details..."
                rows={3}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Food Type (leftovers only) */}
            {isFood && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 mb-1.5 block">Food Type</label>
                <div className="flex gap-2 flex-wrap">
                  {foodTypes.map((ft) => (
                    <button
                      key={ft.value}
                      type="button"
                      onClick={() => setFoodType(ft.value)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                        foodType === ft.value
                          ? 'bg-[#14ae5c] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Condition (non-help, non-food) */}
            {!isHelp && !isFood && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 mb-1.5 block">Condition</label>
                <div className="flex gap-2 flex-wrap">
                  {conditions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCondition(c.value)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                        condition === c.value
                          ? 'bg-[#14ae5c] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Portions (food only) */}
            {isFood && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 mb-1.5 block">Portions</label>
                <input
                  type="number"
                  value={portions}
                  onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="50"
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Quantity (non-food) */}
            {!isFood && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 mb-1.5 block">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Expiry (food only) */}
            {isFood && (
              <div>
                <label className="text-[13px] font-semibold text-gray-800 mb-1.5 block">Best Before</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Location */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
              <div className="bg-[#14ae5c]/10 rounded-full p-2">
                <MapPin className="size-4 text-[#14ae5c]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-gray-800">Pickup Location</p>
                <p className="text-[11px] text-gray-400">
                  {profile?.neighborhood?.name || profile?.location || 'Your neighborhood'}
                </p>
              </div>
            </div>

            {/* Coins Info */}
            <div className="bg-[#fff9e6] border border-[#f0a326]/20 rounded-xl p-4 flex items-center gap-3">
              <div className="size-[32px] rounded-full border-2 border-[#f0a326] flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-[#f0a326]">$</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Earn up to 200 coins</p>
                <p className="text-[11px] text-gray-500">When someone accepts your offer</p>
              </div>
            </div>

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
                  <Check className="size-5" /> Publish Post
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
