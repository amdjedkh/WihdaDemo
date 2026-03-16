import { useState } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  User,
  Save,
  Loader2,
} from 'lucide-react';

export default function EditProfile() {
  const navigate = useNavigate();
  const { profile, updateProfile, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);

    try {
      const result = await updateProfile({ name: name.trim() });

      if (result.error) {
        toast.error(result.error);
      } else {
        await refreshProfile();
        toast.success('Profile updated!');
        navigate('/profile');
      }
    } catch (err: any) {
      console.error('Save profile error:', err);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileContainer>
      <PageTransition>
        <div className="flex flex-col size-full bg-white">
          {/* Header */}
          <div className="px-5 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between h-14">
              <button onClick={() => navigate('/profile')} className="text-gray-800">
                <ArrowLeft className="size-6" />
              </button>
              <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif]">Edit Profile</h1>
              <div className="size-6" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-10">
            {/* Avatar placeholder */}
            <div className="flex flex-col items-center py-6">
              <div className="size-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-50">
                {profile?.photoUrl ? (
                  <ImageWithFallback
                    src={profile.photoUrl}
                    alt="Profile"
                    className="size-24 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <User className="size-10 text-gray-400" />
                )}
              </div>
              <p className="text-[12px] text-gray-400 mt-2">Profile photo update coming soon</p>
            </div>

            {/* Fields */}
            <div className="space-y-5">
              <div>
                <label className="text-[13px] font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <User className="size-4 text-gray-400" /> Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none transition-colors"
                />
              </div>

              {/* Read-only info */}
              {profile?.email && (
                <div>
                  <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
                    Email
                  </label>
                  <div className="w-full bg-gray-100 rounded-xl px-4 py-3 text-[14px] text-gray-500">
                    {profile.email}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed</p>
                </div>
              )}

              {profile?.neighborhood && (
                <div>
                  <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
                    Neighborhood
                  </label>
                  <div className="w-full bg-gray-100 rounded-xl px-4 py-3 text-[14px] text-gray-500">
                    {profile.neighborhood.name}, {profile.neighborhood.city}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Change via the location picker</p>
                </div>
              )}

              {profile?.role && profile.role !== 'user' && (
                <div>
                  <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
                    Role
                  </label>
                  <div className="w-full bg-gray-100 rounded-xl px-4 py-3 text-[14px] text-gray-500 capitalize">
                    {profile.role}
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-8 bg-[#14ae5c] text-white py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Save className="size-5" /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </PageTransition>
    </MobileContainer>
  );
}
