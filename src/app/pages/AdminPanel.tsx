import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import { apiFetch, clearTokens, getStoredToken } from '../lib/api';
import {
  LayoutDashboard, Zap, LogOut, Plus, Trash2, Pencil,
  Users, ClipboardList, CheckCircle, XCircle, Coins,
  X, Loader2, RefreshCw, Mail, MapPin, Calendar,
  AlertTriangle, CheckCircle2, Building2, Sparkles, Globe,
  ChevronDown, Minus,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PALETTE = ['#14ae5c', '#52ADE5', '#f0a326', '#e74c3c', '#8e44ad', '#1abc9c', '#e67e22', '#2980b9'];
const DEFAULT_LAT = 36.7538;
const DEFAULT_LNG = 3.0588;

function distMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  return Math.sqrt(
    Math.pow((lat1 - lat2) * 111000, 2) +
    Math.pow((lng1 - lng2) * 111000 * Math.cos((lat1 * Math.PI) / 180), 2),
  );
}

// ─── Admin guard ──────────────────────────────────────────────────────────────

function useAdminGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = getStoredToken();
    if (!token) { navigate('/admin-login', { replace: true }); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin' || payload.exp * 1000 <= Date.now()) {
        clearTokens();
        navigate('/admin-login', { replace: true });
      }
    } catch {
      clearTokens();
      navigate('/admin-login', { replace: true });
    }
  }, []);
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number | string; color: string;
}) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-[11px] truncate">{label}</p>
        <p className="text-white text-[20px] font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Dashboard tab ────────────────────────────────────────────────────────────

interface ScrapeSourceResult { name: string; url: string; count: number; error?: string; }
interface ScrapeJobResult {
  status: 'running' | 'done' | 'error';
  started_at: string;
  finished_at?: string;
  sources: ScrapeSourceResult[];
  total_events: number;
  used_fallback: boolean;
  upserted: number;
  neighborhoods: number;
  error?: string;
}

function DashboardTab({ onGenerateAI }: { onGenerateAI: () => void }) {
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scrapeJob, setScrapeJob] = useState<ScrapeJobResult | null>(null);
  const [scraping, setScraping]   = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/v1/admin/stats');
      if (data.success) setStats(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const pollJob = useCallback((jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const data = await apiFetch(`/v1/admin/campaigns/ingest/status?id=${jobId}`);
        if (data.success && data.data) {
          setScrapeJob(data.data);
          if (data.data.status !== 'running') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setScraping(false);
          }
        }
      } catch { /* keep polling */ }
    }, 2000);
  }, []);

  const triggerScrape = async () => {
    setScraping(true);
    setScrapeJob(null);
    try {
      const data = await apiFetch('/v1/admin/campaigns/ingest', { method: 'POST' });
      if (data.success && data.job_id) {
        setScrapeJob({ status: 'running', started_at: new Date().toISOString(), sources: [], total_events: 0, used_fallback: false, upserted: 0, neighborhoods: 0 });
        pollJob(data.job_id);
      }
    } catch {
      setScraping(false);
      setScrapeJob({ status: 'error', started_at: new Date().toISOString(), sources: [], total_events: 0, used_fallback: false, upserted: 0, neighborhoods: 0, error: 'Failed to start scrape' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
      </div>
    );
  }

  const approvalRate = stats?.submissions > 0
    ? Math.round((stats.approved / stats.submissions) * 100)
    : 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="size-5 text-white" />}            label="Total Users"    value={stats?.users ?? 0}            color="bg-blue-600" />
        <StatCard icon={<ClipboardList className="size-5 text-white" />}    label="Submissions"    value={stats?.submissions ?? 0}      color="bg-purple-600" />
        <StatCard icon={<CheckCircle className="size-5 text-white" />}      label="Approved"       value={stats?.approved ?? 0}         color="bg-[#14ae5c]" />
        <StatCard icon={<XCircle className="size-5 text-white" />}          label="Rejected"       value={stats?.rejected ?? 0}         color="bg-red-600" />
        <StatCard icon={<Zap className="size-5 text-white" />}              label="Activities"     value={stats?.active_campaigns ?? 0} color="bg-amber-600" />
        <StatCard icon={<Coins className="size-5 text-white" />}            label="Coins Awarded"  value={stats?.coins_awarded ?? 0}    color="bg-yellow-600" />
      </div>

      {/* Approval rate */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-400 text-[12px]">Approval Rate</p>
          <p className="text-white text-[13px] font-semibold">{approvalRate}%</p>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#14ae5c] rounded-full transition-all duration-700" style={{ width: `${approvalRate}%` }} />
        </div>
      </div>

      {/* Scraper */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-[13px] font-semibold">Activity Scraper</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Fetch from cra.dz, algerian-human.org, youth-ambassadors</p>
          </div>
          <button
            onClick={triggerScrape}
            disabled={scraping}
            className="flex items-center gap-1.5 bg-gray-800 text-white px-3 py-2 rounded-xl text-[12px] font-medium active:scale-[0.98] transition-all disabled:opacity-50 shrink-0"
          >
            {scraping ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {scraping ? 'Running…' : 'Run Now'}
          </button>
        </div>

        {scrapeJob && (
          <div className={`rounded-xl p-3 space-y-2 ${
            scrapeJob.status === 'running' ? 'bg-blue-950/50 border border-blue-800/40' :
            scrapeJob.status === 'done'    ? 'bg-emerald-950/50 border border-emerald-800/40' :
                                             'bg-red-950/50 border border-red-800/40'
          }`}>
            {/* Status header */}
            <div className="flex items-center gap-2">
              {scrapeJob.status === 'running' && <Loader2 className="size-3.5 text-blue-400 animate-spin shrink-0" />}
              {scrapeJob.status === 'done'    && <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />}
              {scrapeJob.status === 'error'   && <AlertTriangle className="size-3.5 text-red-400 shrink-0" />}
              <p className="text-[12px] font-semibold text-white">
                {scrapeJob.status === 'running' ? 'Scraping in progress…' :
                 scrapeJob.status === 'done'    ? `Done — ${scrapeJob.total_events} events, ${scrapeJob.upserted} upserted` :
                 `Error: ${scrapeJob.error || 'Unknown error'}`}
              </p>
            </div>

            {/* Source results */}
            {scrapeJob.sources.length > 0 && (
              <div className="space-y-1">
                {scrapeJob.sources.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    {s.error
                      ? <XCircle className="size-3 text-red-400 shrink-0" />
                      : <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />}
                    <p className="text-[11px] text-gray-400 truncate flex-1">{s.name}</p>
                    <p className="text-[11px] text-white font-medium shrink-0">{s.error ? 'failed' : `${s.count} events`}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Summary row */}
            {scrapeJob.status === 'done' && (
              <div className="flex items-center gap-3 pt-1 border-t border-white/5 text-[11px] text-gray-400">
                <span>{scrapeJob.neighborhoods} neighborhoods</span>
                {scrapeJob.used_fallback && <span className="text-amber-400">· Used fallback events</span>}
                {scrapeJob.finished_at && (
                  <span className="ml-auto">
                    {Math.round((new Date(scrapeJob.finished_at).getTime() - new Date(scrapeJob.started_at).getTime()) / 1000)}s
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Generator */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-[13px] font-semibold">AI Activity Generator</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Describe an activity → AI creates it</p>
          </div>
          <button
            onClick={onGenerateAI}
            className="flex items-center gap-1.5 bg-purple-700 text-white px-3 py-2 rounded-xl text-[12px] font-medium active:scale-[0.98] transition-all shrink-0"
          >
            <Sparkles className="size-3.5" /> Generate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Generator Page ────────────────────────────────────────────────────────

function AIGeneratorPage({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt]           = useState('');
  const [generating, setGenerating]   = useState(false);
  const [generated, setGenerated]     = useState<any>(null);
  const [publishing, setPublishing]   = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
  const [selectedNHs, setSelectedNHs] = useState<string[]>([]);

  useEffect(() => {
    apiFetch('/v1/admin/neighborhoods')
      .then(d => { if (d.success) setNeighborhoods(d.data); })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenerated(null);
    try {
      const data = await apiFetch('/v1/admin/campaigns/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (data.success) {
        const ev = data.data;
        setGenerated({
          title:          ev.title          || '',
          subtitle:       ev.subtitle       || '',
          description:    ev.description    || '',
          organizer:      ev.organizer      || '',
          organizer_logo: ev.organizer_logo || '',
          location:       ev.location       || '',
          start_dt:       ev.start_dt       ? ev.start_dt.slice(0, 16) : '',
          end_dt:         ev.end_dt         ? ev.end_dt.slice(0, 16)   : '',
          url:            ev.url            || '',
          image1:         (ev.images?.[0])  || ev.image_url || '',
          image2:         (ev.images?.[1])  || '',
          image3:         (ev.images?.[2])  || '',
          contact_phone:  ev.contact_phone  || '',
          contact_email:  ev.contact_email  || '',
          coin_reward:    String(ev.coin_reward ?? 50),
        });
      } else {
        alert('Generation failed. Try again.');
      }
    } catch (err: any) {
      alert(err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generated) return;
    setPublishing(true);
    try {
      const images = [generated.image1, generated.image2, generated.image3].filter(Boolean);
      await apiFetch('/v1/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title:          generated.title,
          subtitle:       generated.subtitle      || null,
          description:    generated.description   || null,
          organizer:      generated.organizer      || null,
          organizer_logo: generated.organizer_logo || null,
          location:       generated.location       || null,
          start_dt:       generated.start_dt,
          end_dt:         generated.end_dt         || null,
          url:            generated.url            || null,
          images:         images.length > 0 ? images : undefined,
          contact_phone:  generated.contact_phone  || null,
          contact_email:  generated.contact_email  || null,
          coin_reward:    parseInt(generated.coin_reward) || 50,
          neighborhood_ids: selectedNHs.length > 0 ? selectedNHs : undefined,
        }),
      });
      alert('Activity published!');
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const f = (key: string, label: string, type = 'text') => (
    <div>
      <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-1 block">{label}</label>
      <input
        type={type}
        value={generated?.[key] ?? ''}
        onChange={e => setGenerated((g: any) => ({ ...g, [key]: e.target.value }))}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] h-14 mt-2 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-purple-400" />
          <h2 className="text-white text-[17px] font-bold">AI Generator</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 active:text-white">
          <X className="size-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-8 pt-2">

        {/* Prompt */}
        <div>
          <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-2 block">
            Describe the activity you want to create
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. A tree planting event in Algiers for youth scouts, weekend morning, organized by local municipality…"
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-2xl px-4 py-3 text-[14px] placeholder:text-gray-600 focus:border-purple-500 focus:outline-none transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full bg-purple-700 text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {generating ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Generating… (this may take ~20s)
            </>
          ) : (
            <>
              <Sparkles className="size-5" />
              Generate Activity
            </>
          )}
        </button>

        {/* Preview/Edit form */}
        {generated && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-t border-gray-800 pt-4">
              <CheckCircle2 className="size-4 text-purple-400" />
              <p className="text-purple-300 text-[13px] font-semibold">Review & Edit Before Publishing</p>
            </div>

            {/* Image previews */}
            {[generated.image1, generated.image2, generated.image3].some(Boolean) && (
              <div className="flex gap-2 overflow-x-auto">
                {[generated.image1, generated.image2, generated.image3].filter(Boolean).map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="size-20 rounded-xl object-cover shrink-0 border border-gray-700" />
                ))}
              </div>
            )}

            {f('title',          'Title')}
            {f('subtitle',       'Subtitle')}
            <div>
              <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-1 block">Description</label>
              <textarea
                value={generated.description}
                onChange={e => setGenerated((g: any) => ({ ...g, description: e.target.value }))}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-600 focus:border-purple-500 focus:outline-none transition-colors resize-none"
              />
            </div>
            {f('organizer',      'Organizer')}
            {f('location',       'Location')}
            {f('start_dt',       'Start Date & Time', 'datetime-local')}
            {f('end_dt',         'End Date & Time',   'datetime-local')}
            <div className="space-y-2">
              <label className="text-gray-400 text-[11px] uppercase tracking-wider block">Images (up to 3 URLs)</label>
              {f('image1', 'Image 1 URL')}
              {f('image2', 'Image 2 URL')}
              {f('image3', 'Image 3 URL')}
            </div>
            {f('contact_email', 'Contact Email', 'email')}
            {f('coin_reward',   'Coin Reward',   'number')}

            {/* Neighborhood targeting */}
            {neighborhoods.length > 0 && (
              <div>
                <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-2 block">
                  Target Neighborhoods <span className="text-gray-600 normal-case">(none = all)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {neighborhoods.map(n => {
                    const sel = selectedNHs.includes(n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedNHs(prev => sel ? prev.filter(x => x !== n.id) : [...prev, n.id])}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${
                          sel ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        <Building2 className="size-3" />
                        {n.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handlePublish}
              disabled={publishing || !generated.title || !generated.start_dt}
              className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {publishing ? <Loader2 className="size-5 animate-spin" /> : <><CheckCircle2 className="size-5" /> Publish Activity</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin activity card (dark theme version) ─────────────────────────────────

function AdminActivityCard({ campaign, onEdit, onDelete }: {
  campaign: any;
  onEdit: (c: any) => void;
  onDelete: (id: string) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  let images: string[] = [];
  try { images = campaign.images_json ? JSON.parse(campaign.images_json) : []; } catch { /* ignore */ }
  if (images.length === 0 && campaign.image_url) images = [campaign.image_url];

  const dateStr = campaign.start_dt
    ? new Date(campaign.start_dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const initial = (campaign.organizer || 'C').charAt(0).toUpperCase();

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Image */}
      <div className="relative w-full h-[150px]">
        {images.length > 0 && !imgFailed ? (
          <img
            src={images[0]}
            alt={campaign.title}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
            <Zap className="size-10 text-gray-600" />
          </div>
        )}
        {/* Coin badge */}
        {campaign.coin_reward > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-400/90 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Coins className="size-2.5" /> {campaign.coin_reward}
          </div>
        )}
        {/* Source badge */}
        <div className="absolute top-2 left-2 bg-black/50 text-gray-300 px-2 py-0.5 rounded-full text-[10px]">
          {campaign.source || 'manual'}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Organizer row */}
        <div className="flex items-center gap-2">
          {campaign.organizer_logo ? (
            <img src={campaign.organizer_logo} alt="" className="size-7 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="size-7 rounded-full bg-[#14ae5c]/20 flex items-center justify-center shrink-0">
              <span className="text-[12px] font-bold text-[#14ae5c]">{initial}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-gray-300 text-[12px] font-medium truncate">{campaign.organizer || 'Community'}</p>
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar className="size-3" />
              <p className="text-[10px]">{dateStr}</p>
            </div>
          </div>
          <p className="text-gray-600 text-[10px] shrink-0">{campaign.participant_count ?? 0} joined</p>
        </div>

        {/* Title */}
        <p className="text-white text-[14px] font-semibold leading-snug line-clamp-2">{campaign.title}</p>

        {/* Location */}
        {campaign.location && (
          <div className="flex items-center gap-1">
            <MapPin className="size-3 text-gray-500 shrink-0" />
            <p className="text-[11px] text-gray-500 truncate">{campaign.location}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onEdit(campaign)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 text-blue-400 py-2 rounded-xl text-[12px] font-medium active:scale-95 transition-all"
          >
            <Pencil className="size-3.5" /> Edit
          </button>
          <button
            onClick={() => onDelete(campaign.id)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 text-red-400 py-2 rounded-xl text-[12px] font-medium active:scale-95 transition-all"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activities tab ───────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '', subtitle: '', description: '', organizer: '',
  organizer_logo: '', location: '',
  start_dt: '', end_dt: '', url: '',
  image1: '', image2: '', image3: '',
  contact_phone: '', contact_email: '', coin_reward: '50',
  neighborhood_ids: [] as string[],
};

function ActivitiesTab() {
  const [campaigns, setCampaigns]       = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campsData, nhData] = await Promise.all([
        apiFetch('/v1/admin/campaigns'),
        apiFetch('/v1/admin/neighborhoods'),
      ]);
      if (campsData.success)  setCampaigns(campsData.data);
      if (nhData.success)     setNeighborhoods(nhData.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (c: any) => {
    let images: string[] = [];
    try { images = c.images_json ? JSON.parse(c.images_json) : []; } catch { /* ignore */ }
    setEditId(c.id);
    setForm({
      title:            c.title          || '',
      subtitle:         c.subtitle       || '',
      description:      c.description    || '',
      organizer:        c.organizer      || '',
      organizer_logo:   c.organizer_logo || '',
      location:         c.location       || '',
      start_dt:         c.start_dt       ? c.start_dt.slice(0, 16) : '',
      end_dt:           c.end_dt         ? c.end_dt.slice(0, 16)   : '',
      url:              c.url            || '',
      image1:           images[0]        || '',
      image2:           images[1]        || '',
      image3:           images[2]        || '',
      contact_phone:    c.contact_phone  || '',
      contact_email:    c.contact_email  || '',
      coin_reward:      String(c.coin_reward ?? 50),
      neighborhood_ids: [],
    });
    setShowForm(true);
  };

  const buildBody = () => {
    const images = [form.image1, form.image2, form.image3].filter(Boolean);
    return {
      title:            form.title,
      subtitle:         form.subtitle        || null,
      description:      form.description     || null,
      organizer:        form.organizer        || null,
      organizer_logo:   form.organizer_logo   || null,
      location:         form.location         || null,
      start_dt:         form.start_dt,
      end_dt:           form.end_dt           || null,
      url:              form.url              || null,
      images:           images.length > 0 ? images : undefined,
      contact_phone:    form.contact_phone    || null,
      contact_email:    form.contact_email    || null,
      coin_reward:      parseInt(form.coin_reward) || 50,
      neighborhood_ids: form.neighborhood_ids.length > 0 ? form.neighborhood_ids : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start_dt) return;
    setSubmitting(true);
    try {
      if (editId) {
        await apiFetch(`/v1/admin/campaigns/${editId}`, { method: 'PUT', body: JSON.stringify(buildBody()) });
        setCampaigns(prev => prev.map(c => c.id === editId ? { ...c, ...buildBody(), id: editId } : c));
      } else {
        await apiFetch('/v1/admin/campaigns', { method: 'POST', body: JSON.stringify(buildBody()) });
        load();
      }
      setShowForm(false);
      setEditId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/v1/admin/campaigns/${id}`, { method: 'DELETE' });
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const toggleNeighborhood = (id: string) => {
    setForm(f => ({
      ...f,
      neighborhood_ids: f.neighborhood_ids.includes(id)
        ? f.neighborhood_ids.filter(n => n !== id)
        : [...f.neighborhood_ids, id],
    }));
  };

  const field = (key: keyof typeof EMPTY_FORM, label: string, type = 'text', required = false) => (
    <div>
      <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-1 block">{label}{required && ' *'}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={required}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-600 focus:border-[#14ae5c] focus:outline-none transition-colors"
      />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-gray-400 text-[13px]">{campaigns.length} activities</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-[#14ae5c] text-white px-4 py-2 rounded-xl text-[13px] font-semibold active:scale-[0.98] transition-all"
        >
          <Plus className="size-4" /> Add Activity
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center pt-12">
          <Loader2 className="size-7 text-[#14ae5c] animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center pt-16 text-gray-600 text-[14px]">No activities yet</div>
      ) : (
        <div className="px-4 grid grid-cols-1 gap-3 pb-6">
          {campaigns.map(c => (
            <AdminActivityCard key={c.id} campaign={c} onEdit={openEdit} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      {/* Create/Edit form overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] h-14 mt-2 shrink-0">
            <h2 className="text-white text-[17px] font-bold">{editId ? 'Edit Activity' : 'New Activity'}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-gray-400 active:text-white">
              <X className="size-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 space-y-4 pb-6 pt-2">
            {field('title', 'Title', 'text', true)}
            {field('subtitle', 'Subtitle')}
            <div>
              <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-600 focus:border-[#14ae5c] focus:outline-none transition-colors resize-none"
              />
            </div>
            {field('organizer', 'Organizer')}
            {field('organizer_logo', 'Organizer Logo URL')}
            {field('location', 'Location')}
            {field('start_dt', 'Start Date & Time', 'datetime-local', true)}
            {field('end_dt', 'End Date & Time', 'datetime-local')}
            <div className="space-y-2">
              <label className="text-gray-400 text-[11px] uppercase tracking-wider block">Images (up to 3)</label>
              {field('image1', 'Image 1 URL')}
              {field('image2', 'Image 2 URL')}
              {field('image3', 'Image 3 URL')}
            </div>
            {field('url', 'Event URL')}
            {field('contact_phone', 'Contact Phone')}
            {field('contact_email', 'Contact Email', 'email')}
            {field('coin_reward', 'Coin Reward', 'number')}

            {/* Neighborhood targeting (only for create) */}
            {!editId && neighborhoods.length > 0 && (
              <div>
                <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-2 block">
                  Target Neighborhoods
                  <span className="text-gray-600 normal-case ml-1">(none = all)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {neighborhoods.map(n => {
                    const selected = form.neighborhood_ids.includes(n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => toggleNeighborhood(n.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${
                          selected
                            ? 'bg-[#14ae5c] text-white border-[#14ae5c]'
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        <Building2 className="size-3" />
                        {n.name}
                      </button>
                    );
                  })}
                </div>
                {form.neighborhood_ids.length > 0 && (
                  <p className="text-[11px] text-[#14ae5c] mt-1.5">
                    Will be sent to {form.neighborhood_ids.length} neighborhood{form.neighborhood_ids.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all mt-2"
            >
              {submitting ? <Loader2 className="size-5 animate-spin" /> : editId ? 'Save Changes' : 'Create Activity'}
            </button>
          </form>
        </div>
      )}

      {/* Delete confirm sheet */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setDeleteId(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full bg-gray-900 rounded-t-3xl px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)] space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white text-[16px] font-bold text-center">Delete Activity?</p>
            <p className="text-gray-500 text-[13px] text-center">This cannot be undone.</p>
            <button
              onClick={() => handleDelete(deleteId)}
              className="w-full bg-red-500 text-white py-3.5 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-all"
            >
              Delete
            </button>
            <button
              onClick={() => setDeleteId(null)}
              className="w-full bg-gray-800 text-gray-300 py-3.5 rounded-2xl text-[15px] font-medium active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/v1/admin/users');
      if (data.success) setUsers(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    !search ||
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.neighborhood_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-4 py-3 shrink-0">
        <input
          type="text"
          placeholder="Search by name, email, neighborhood…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-[13px] placeholder:text-gray-600 focus:border-[#14ae5c] focus:outline-none transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-7 text-[#14ae5c] animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
          <p className="text-gray-600 text-[11px] mb-1">{filtered.length} users</p>
          {filtered.map(u => (
            <div key={u.id} className="bg-gray-900 rounded-2xl p-3.5 flex items-center gap-3">
              {/* Avatar */}
              <div className="size-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                <span className="text-[16px] font-bold text-gray-400">
                  {(u.display_name || u.email || '?').charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-white text-[13px] font-semibold truncate">{u.display_name || '—'}</p>
                <div className="flex items-center gap-1 text-gray-500">
                  <Mail className="size-3 shrink-0" />
                  <p className="text-[11px] truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {u.neighborhood_name && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="size-3 shrink-0" />
                      <p className="text-[10px] truncate">{u.neighborhood_name}</p>
                    </div>
                  )}
                  {u.coins_earned > 0 && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Coins className="size-3 shrink-0" />
                      <p className="text-[10px]">{u.coins_earned}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Role badge */}
              {u.role === 'admin' && (
                <span className="shrink-0 bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  admin
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Neighborhoods tab ────────────────────────────────────────────────────────

interface AdminNeighborhood {
  id: string; name: string; description: string | null; color: string;
  city: string; country: string; center_lat: number; center_lng: number;
  radius_meters: number; member_count: number;
}

const NH_EMPTY = {
  name: '', description: '', color: '#14ae5c', city: '', country: 'DZ',
  center_lat: DEFAULT_LAT, center_lng: DEFAULT_LNG, radius_meters: 500,
};

function NeighborhoodsTab() {
  const [hoods, setHoods]     = useState<AdminNeighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminNeighborhood | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/v1/admin/neighborhoods');
      if (d.success) setHoods(d.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/v1/admin/neighborhoods/${id}`, { method: 'DELETE' });
      setHoods(prev => prev.filter(n => n.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const openCreate = () => { setEditTarget(null); setShowMap(true); };
  const openEdit   = (n: AdminNeighborhood) => { setEditTarget(n); setShowMap(true); };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <p className="text-gray-400 text-[13px]">{hoods.length} neighborhoods</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-[#14ae5c] text-white px-4 py-2 rounded-xl text-[13px] font-semibold active:scale-[0.98] transition-all"
        >
          <Plus className="size-4" /> Add
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-7 text-[#14ae5c] animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
          {hoods.map(n => (
            <div key={n.id} className="bg-gray-900 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="size-10 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: (n.color || '#14ae5c') + '33' }}>
                <Globe className="size-5" style={{ color: n.color || '#14ae5c' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-[13px] font-semibold truncate">{n.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="size-3" />
                    <p className="text-[11px]">{n.city}</p>
                  </div>
                  <p className="text-[11px] text-gray-600">r={Math.round(n.radius_meters)}m</p>
                  <p className="text-[11px] text-gray-500">{n.member_count} members</p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => openEdit(n)} className="p-2 rounded-xl bg-gray-800 text-blue-400 active:scale-95 transition-all">
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={() => setDeleteId(n.id)} className="p-2 rounded-xl bg-gray-800 text-red-400 active:scale-95 transition-all">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
          {hoods.length === 0 && <div className="text-center pt-16 text-gray-600 text-[14px]">No neighborhoods yet</div>}
        </div>
      )}

      {/* Map overlay for create/edit */}
      {showMap && (
        <NeighborhoodMapOverlay
          initial={editTarget ?? undefined}
          onClose={() => setShowMap(false)}
          onSaved={() => { setShowMap(false); load(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setDeleteId(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-gray-900 rounded-t-3xl px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)] space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-white text-[16px] font-bold text-center">Delete Neighborhood?</p>
            <p className="text-gray-500 text-[13px] text-center">Members will no longer see it. This cannot be undone easily.</p>
            <button onClick={() => handleDelete(deleteId)} className="w-full bg-red-500 text-white py-3.5 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-all">Delete</button>
            <button onClick={() => setDeleteId(null)} className="w-full bg-gray-800 text-gray-300 py-3.5 rounded-2xl text-[15px] font-medium active:scale-[0.98] transition-all">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Neighborhood map overlay ─────────────────────────────────────────────────

function NeighborhoodMapOverlay({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AdminNeighborhood;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mapContainerRef      = useRef<HTMLDivElement>(null);
  const mapRef               = useRef<L.Map | null>(null);
  const nhLayersRef          = useRef<L.Circle[]>([]);
  const previewMarkerRef     = useRef<L.CircleMarker | null>(null);
  const previewCircleRef     = useRef<L.Circle | null>(null);

  const [form, setForm]      = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    color:       initial?.color       ?? '#14ae5c',
    city:        initial?.city        ?? '',
    country:     initial?.country     ?? 'DZ',
  });
  const [drawCenter, setDrawCenter] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.center_lat, lng: initial.center_lng } : null,
  );
  const [drawRadius, setDrawRadius] = useState(initial?.radius_meters ?? 500);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [allHoods, setAllHoods]       = useState<AdminNeighborhood[]>([]);

  // Load all neighborhoods to display on map
  useEffect(() => {
    apiFetch('/v1/admin/neighborhoods')
      .then(d => { if (d.success) setAllHoods(d.data); })
      .catch(() => {});
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const startLat = drawCenter?.lat ?? DEFAULT_LAT;
    const startLng = drawCenter?.lng ?? DEFAULT_LNG;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      setDrawCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
      setShowDetails(true);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Draw existing neighborhoods
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    nhLayersRef.current.forEach(l => l.remove());
    nhLayersRef.current = [];
    allHoods.forEach(n => {
      if (initial && n.id === initial.id) return; // skip the one being edited
      const c = L.circle([n.center_lat, n.center_lng], {
        radius: n.radius_meters,
        color: n.color || '#14ae5c',
        fillColor: n.color || '#14ae5c',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '8 5',
      }).addTo(map);
      c.bindTooltip(n.name, { permanent: n.radius_meters > 300, direction: 'center', className: 'leaflet-neighborhood-label' });
      nhLayersRef.current.push(c);
    });
  }, [allHoods, initial]);

  // Draw preview circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    previewMarkerRef.current?.remove(); previewMarkerRef.current = null;
    previewCircleRef.current?.remove(); previewCircleRef.current = null;
    if (drawCenter) {
      const m = L.circleMarker([drawCenter.lat, drawCenter.lng], {
        radius: 8, color: '#fff', fillColor: form.color, fillOpacity: 1, weight: 2.5,
      }).addTo(map);
      const circle = L.circle([drawCenter.lat, drawCenter.lng], {
        radius: drawRadius, color: form.color, fillColor: form.color, fillOpacity: 0.15, weight: 2,
      }).addTo(map);
      if (form.name) circle.bindTooltip(form.name, { permanent: true, direction: 'center', className: 'leaflet-neighborhood-label' });
      previewMarkerRef.current = m;
      previewCircleRef.current = circle;
    }
  }, [drawCenter, drawRadius, form.color, form.name]);

  const handleSave = async () => {
    if (!drawCenter || !form.name.trim() || !form.city.trim()) {
      alert('Please tap the map and fill in name + city');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:          form.name.trim(),
        description:   form.description.trim() || undefined,
        color:         form.color,
        center_lat:    drawCenter.lat,
        center_lng:    drawCenter.lng,
        radius_meters: drawRadius,
        city:          form.city.trim(),
        country:       form.country || 'DZ',
      };
      if (initial) {
        await apiFetch(`/v1/admin/neighborhoods/${initial.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/v1/admin/neighborhoods', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err: any) {
      alert(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] h-14 mt-2 shrink-0">
        <h2 className="text-white text-[17px] font-bold">{initial ? 'Edit Neighborhood' : 'New Neighborhood'}</h2>
        <button onClick={onClose} className="text-gray-400 active:text-white">
          <X className="size-6" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapContainerRef} className="absolute inset-0" />
        {!drawCenter && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="bg-black/70 text-white text-[13px] px-4 py-2 rounded-full">
              Tap on the map to place center
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="shrink-0 bg-gray-900 border-t border-gray-800 px-5 pt-4 pb-6 max-h-[55%] overflow-y-auto">
        {!drawCenter ? (
          <div className="bg-blue-950/50 border border-blue-800/40 rounded-xl p-3 mb-3">
            <p className="text-[13px] text-blue-300 font-medium">Tap on the map above</p>
            <p className="text-[12px] text-blue-400/70 mt-0.5">Tap anywhere to place the neighborhood's center point.</p>
          </div>
        ) : (
          <>
            {/* Radius */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-semibold text-white">Radius</span>
                <span className="text-[13px] font-semibold text-[#14ae5c]">
                  {drawRadius >= 1000 ? `${(drawRadius / 1000).toFixed(1)} km` : `${drawRadius} m`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setDrawRadius(r => Math.max(100, r - 100))} className="size-8 rounded-full bg-gray-800 flex items-center justify-center active:bg-gray-700">
                  <Minus className="size-4 text-gray-400" />
                </button>
                <input
                  type="range" min={100} max={5000} step={100}
                  value={drawRadius}
                  onChange={e => setDrawRadius(parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${form.color} ${((drawRadius - 100) / 4900) * 100}%, #374151 ${((drawRadius - 100) / 4900) * 100}%)` }}
                />
                <button onClick={() => setDrawRadius(r => Math.min(5000, r + 100))} className="size-8 rounded-full bg-gray-800 flex items-center justify-center active:bg-gray-700">
                  <Plus className="size-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Details toggle */}
            <button
              onClick={() => setShowDetails(v => !v)}
              className="w-full flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 mb-3"
            >
              <span className="text-[13px] font-semibold text-white">Neighborhood Details</span>
              <ChevronDown className={`size-4 text-gray-500 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>

            {showDetails && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-1 block">Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Hadjam Moukhtar"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-1 block">City *</label>
                  <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="e.g. Alger"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-1 block">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description" rows={2}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-[11px] uppercase tracking-wider mb-2 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {PALETTE.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className="size-8 rounded-full border-2 transition-all active:scale-90"
                        style={{ backgroundColor: c, borderColor: form.color === c ? '#fff' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.city.trim()}
              className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {saving ? <Loader2 className="size-5 animate-spin" /> : initial ? 'Save Changes' : 'Create Neighborhood'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'activities' | 'users' | 'neighborhoods';

export default function AdminPanel() {
  useAdminGuard();
  const navigate  = useNavigate();
  const [tab, setTab]           = useState<Tab>('dashboard');
  const [showAIGen, setShowAIGen] = useState(false);

  const handleLogout = () => {
    clearTokens();
    navigate('/login', { replace: true });
  };

  return (
    <MobileContainer>
      <div className="flex flex-col size-full bg-gray-950">

        {/* Top bar */}
        <div className="pt-[env(safe-area-inset-top)] px-5 bg-gray-950 shrink-0">
          <div className="flex items-center justify-between h-14">
            <div>
              <p className="text-white text-[17px] font-bold leading-tight">Admin Panel</p>
              <p className="text-gray-600 text-[11px]">Wihda Control System</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 text-[12px]"
            >
              <LogOut className="size-3.5" />
              Logout
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-900 mx-4 rounded-2xl p-1 mt-1 mb-3 shrink-0">
          {([
            { key: 'dashboard',     label: 'Home',    icon: <LayoutDashboard className="size-3.5" /> },
            { key: 'activities',    label: 'Events',  icon: <Zap className="size-3.5" /> },
            { key: 'neighborhoods', label: 'Areas',   icon: <Globe className="size-3.5" /> },
            { key: 'users',         label: 'Users',   icon: <Users className="size-3.5" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                tab === t.key ? 'bg-[#14ae5c] text-white shadow' : 'text-gray-500'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'dashboard'     && <DashboardTab onGenerateAI={() => setShowAIGen(true)} />}
        {tab === 'activities'    && <ActivitiesTab />}
        {tab === 'neighborhoods' && <NeighborhoodsTab />}
        {tab === 'users'         && <UsersTab />}

        {/* AI Generator overlay */}
        {showAIGen && <AIGeneratorPage onClose={() => setShowAIGen(false)} />}

        {/* Bottom safe area */}
        <div className="pb-[env(safe-area-inset-bottom)] shrink-0" />
      </div>
    </MobileContainer>
  );
}
