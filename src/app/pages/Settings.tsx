import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { apiFetch, apiUpload } from '../lib/api';
import { t } from '../lib/i18n';
import {
  ArrowLeft,
  User,
  Camera,
  Loader2,
  Sun,
  Moon,
  Globe,
  Trash2,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  LogOut,
  Mail,
} from 'lucide-react';

function randomCode(len = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-[#14ae5c]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-5 mb-2 mt-5">
      {label}
    </p>
  );
}

function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white mx-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { profile, user, updateProfile, signOut, refreshProfile } = useAuth();
  const { theme, language, setTheme, setLanguage } = useApp();

  const [editingName, setEditingName]   = useState(false);
  const [nameValue, setNameValue]       = useState(profile?.name || '');
  const [savingName, setSavingName]     = useState(false);

  const [editingBio, setEditingBio]     = useState(false);
  const [bioValue, setBioValue]         = useState(profile?.bio || '');
  const [savingBio, setSavingBio]       = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [deleteSheet, setDeleteSheet]   = useState(false);
  const [deleteCode]                    = useState(() => randomCode());
  const [deleteInput, setDeleteInput]   = useState('');
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  const displayPhoto = profile?.photoUrl || '';
  const isDark       = theme === 'dark';
  const isArabic     = language === 'ar';
  const T = (key: Parameters<typeof t>[1]) => t(language, key);

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim().length < 2) return;
    setSavingName(true);
    const { error } = await updateProfile({ name: nameValue.trim() });
    setSavingName(false);
    if (!error) setEditingName(false);
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    const { error } = await updateProfile({ bio: bioValue.trim() });
    setSavingBio(false);
    if (!error) setEditingBio(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiUpload('/v1/me/photo', formData);
      await refreshProfile();
    } catch { /* silent */ } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleLanguageToggle = async (toArabic: boolean) => {
    const lang = toArabic ? 'ar' : 'en';
    setLanguage(lang);
    apiFetch('/v1/me', { method: 'PATCH', body: JSON.stringify({ language_preference: lang }) }).catch(() => {});
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== deleteCode) {
      setDeleteError('Code does not match. Please try again.');
      return;
    }
    setDeleting(true);
    try {
      await apiFetch('/v1/me', { method: 'DELETE' });
      signOut();
      navigate('/login');
    } catch {
      setDeleteError('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-gray-50">

        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)] bg-white border-b border-gray-100">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 flex-1 font-[Poppins,Tajawal,sans-serif]">
              {T('settingsTitle')}
            </h1>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-10">

          {/* Profile section */}
          <SectionHeader label={T('sectionProfile')} />
          <Row>
            {/* Avatar */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-100">
              <div className="relative cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                {displayPhoto ? (
                  <img src={displayPhoto} alt="avatar" className="size-16 rounded-2xl object-cover" />
                ) : (
                  <div className="size-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <User className="size-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                  {uploadingPhoto
                    ? <Loader2 className="size-5 text-white animate-spin" />
                    : <Camera className="size-5 text-white" />}
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-900">{profile?.name}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">{profile?.email || profile?.phone || ''}</p>
                <button onClick={() => photoInputRef.current?.click()} className="text-[12px] text-[#14ae5c] font-medium mt-1">
                  {T('changePhoto')}
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] text-gray-500 font-medium">{T('labelName')}</p>
                {!editingName && (
                  <button onClick={() => { setEditingName(true); setNameValue(profile?.name || ''); }} className="text-[12px] text-[#14ae5c] font-medium">
                    {T('editBtn')}
                  </button>
                )}
              </div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-[14px] text-gray-900 outline-none"
                    autoFocus maxLength={50}
                  />
                  <button onClick={handleSaveName} disabled={savingName} className="size-9 bg-[#14ae5c] rounded-xl flex items-center justify-center shrink-0">
                    {savingName ? <Loader2 className="size-4 text-white animate-spin" /> : <Check className="size-4 text-white" />}
                  </button>
                  <button onClick={() => setEditingName(false)} className="size-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <X className="size-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <p className="text-[15px] text-gray-900 font-medium">{profile?.name || '—'}</p>
              )}
            </div>

            {/* Bio */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] text-gray-500 font-medium">{T('labelBio')}</p>
                {!editingBio && (
                  <button onClick={() => { setEditingBio(true); setBioValue(profile?.bio || ''); }} className="text-[12px] text-[#14ae5c] font-medium">
                    {T('editBtn')}
                  </button>
                )}
              </div>
              {editingBio ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={bioValue}
                    onChange={e => setBioValue(e.target.value)}
                    className="w-full bg-gray-100 rounded-xl px-3 py-2 text-[14px] text-gray-900 outline-none resize-none"
                    rows={3} maxLength={200} autoFocus
                    placeholder={T('bioPlaceholder')}
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={handleSaveBio} disabled={savingBio} className="flex-1 bg-[#14ae5c] rounded-xl py-2 text-[13px] font-semibold text-white flex items-center justify-center gap-1">
                      {savingBio ? <Loader2 className="size-4 animate-spin" /> : null}
                      {T('saveBtn')}
                    </button>
                    <button onClick={() => setEditingBio(false)} className="flex-1 bg-gray-100 rounded-xl py-2 text-[13px] font-semibold text-gray-600">
                      {T('cancelBtn')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  {profile?.bio || T('noBio')}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="text-[12px] text-gray-500 font-medium mb-0.5">{T('labelEmail')}</p>
                <p className="text-[14px] text-gray-900 font-medium">{profile?.email || '—'}</p>
              </div>
              <button
                onClick={() => navigate('/change-email')}
                className="text-[12px] text-[#14ae5c] font-medium flex items-center gap-1"
              >
                <Mail className="size-3" /> {T('changeEmail')}
              </button>
            </div>
          </Row>

          {/* Appearance */}
          <SectionHeader label={T('sectionAppearance')} />
          <Row>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="size-5 text-gray-500" /> : <Sun className="size-5 text-gray-500" />}
                <div>
                  <p className="text-[14px] font-medium text-gray-900">{T('darkMode')}</p>
                  <p className="text-[12px] text-gray-400">{isDark ? T('darkModeOn') : T('darkModeOff')}</p>
                </div>
              </div>
              <Toggle checked={isDark} onChange={v => setTheme(v ? 'dark' : 'light')} />
            </div>
          </Row>

          {/* Language */}
          <SectionHeader label={T('sectionLanguage')} />
          <Row>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Globe className="size-5 text-gray-500" />
                <div>
                  <p className="text-[14px] font-medium text-gray-900">{T('arabicLabel')}</p>
                  <p className="text-[12px] text-gray-400">{isArabic ? T('arabicActive') : T('arabicDesc')}</p>
                </div>
              </div>
              <Toggle checked={isArabic} onChange={handleLanguageToggle} />
            </div>
          </Row>

          {/* Account */}
          <SectionHeader label={T('sectionAccount')} />
          <Row>
            <button
              onClick={() => { signOut(); navigate('/login'); }}
              className="w-full flex items-center gap-3 p-4 border-b border-gray-100 active:bg-gray-50 transition-colors"
            >
              <LogOut className="size-5 text-gray-500" />
              <span className="flex-1 text-[14px] font-medium text-gray-800 text-left">{T('signOut')}</span>
              <ChevronRight className="size-4 text-gray-300" />
            </button>
            <button
              onClick={() => { setDeleteSheet(true); setDeleteInput(''); setDeleteError(''); }}
              className="w-full flex items-center gap-3 p-4 active:bg-red-50 transition-colors"
            >
              <Trash2 className="size-5 text-red-500" />
              <span className="flex-1 text-[14px] font-medium text-red-500 text-left">{T('deleteAccount')}</span>
              <ChevronRight className="size-4 text-red-300" />
            </button>
          </Row>

        </div>

        {/* Delete Account Bottom Sheet */}
        {deleteSheet && (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteSheet(false)} />
            <div className="relative bg-white rounded-t-3xl w-full px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-2xl">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <button onClick={() => setDeleteSheet(false)} className="absolute top-4 right-5 size-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="size-4 text-gray-500" />
              </button>
              <div className="flex flex-col items-center text-center mb-5">
                <div className="size-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <AlertTriangle className="size-7 text-red-500" />
                </div>
                <h2 className="text-[18px] font-bold text-gray-900">{T('deleteTitle')}</h2>
                <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{T('deleteDesc')}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <p className="text-[12px] text-gray-500 mb-2">{T('deleteCodePrompt')}</p>
                <p className="text-[22px] font-bold tracking-[0.2em] text-gray-900 text-center py-1">{deleteCode}</p>
              </div>
              <input
                value={deleteInput}
                onChange={e => { setDeleteInput(e.target.value.toUpperCase()); setDeleteError(''); }}
                placeholder={T('deleteCodePlaceholder')}
                className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-[16px] text-center font-bold tracking-[0.2em] text-gray-900 outline-none mb-2"
                maxLength={6}
              />
              {deleteError && <p className="text-[12px] text-red-500 text-center mb-2">{deleteError}</p>}
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteInput.length < 6}
                className={`w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all ${
                  deleteInput === deleteCode ? 'bg-red-500 text-white active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {T('deleteBtn')}
              </button>
            </div>
          </div>
        )}

      </div>
      </PageTransition>
    </MobileContainer>
  );
}
