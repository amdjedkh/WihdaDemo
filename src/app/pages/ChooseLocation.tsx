import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Search, Navigation, Minus, Plus,
  Check, Loader2, MapPin, PenLine, X, ChevronDown,
} from 'lucide-react';
import SwipeBack from '../components/SwipeBack';
import { apiFetch, setTokens } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'sonner';

// ── map helpers ───────────────────────────────────────────────────────────────

function lonToTileX(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}
function latToTileY(lat: number, zoom: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, zoom);
}
function metersPerPixel(lat: number, zoom: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  return Math.sqrt(
    Math.pow((lat1 - lat2) * 111000, 2) +
    Math.pow((lng1 - lng2) * 111000 * Math.cos((lat1 * Math.PI) / 180), 2),
  );
}

const PALETTE = ['#14ae5c', '#52ADE5', '#f0a326', '#e74c3c', '#8e44ad', '#1abc9c', '#e67e22', '#2980b9'];

interface Neighborhood {
  id: string;
  name: string;
  description: string | null;
  color: string;
  city: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  distance_km?: number | null;
}

interface TileCache { [key: string]: HTMLImageElement }

const DEFAULT_LAT = 36.7538;
const DEFAULT_LNG = 3.0588;
const DEFAULT_ZOOM = 14;

// ── component ─────────────────────────────────────────────────────────────────

export default function ChooseLocation() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // map state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileCacheRef = useRef<TileCache>({});
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startLat: number; startLng: number } | null>(null);

  // neighborhoods
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [selected, setSelected] = useState<Neighborhood | null>(null);
  const [joining, setJoining] = useState(false);

  // search
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // create mode
  const [mode, setMode] = useState<'browse' | 'create'>('browse');
  const [drawCenter, setDrawCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [drawRadius, setDrawRadius] = useState(500); // meters
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createColor, setCreateColor] = useState('#14ae5c');
  const [createCity, setCreateCity] = useState('');
  const [creating, setCreating] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState('');
  const [showForm, setShowForm] = useState(false);

  // ── load all neighborhoods on mount ─────────────────────────────────────────
  useEffect(() => {
    apiFetch('/v1/neighborhoods')
      .then((res) => setNeighborhoods(res?.data?.neighborhoods || []))
      .catch(() => {});
  }, []);

  // ── draw map ─────────────────────────────────────────────────────────────────
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f2efe9';
    ctx.fillRect(0, 0, w, h);

    const centerTileX = lonToTileX(lng, zoom);
    const centerTileY = latToTileY(lat, zoom);
    const tileSize = 256;
    const offsetX = w / 2 - (centerTileX % 1) * tileSize;
    const offsetY = h / 2 - (centerTileY % 1) * tileSize;
    const baseTileX = Math.floor(centerTileX);
    const baseTileY = Math.floor(centerTileY);
    const tilesX = Math.ceil(w / tileSize) + 2;
    const tilesY = Math.ceil(h / tileSize) + 2;

    for (let dx = -Math.floor(tilesX / 2); dx <= Math.floor(tilesX / 2); dx++) {
      for (let dy = -Math.floor(tilesY / 2); dy <= Math.floor(tilesY / 2); dy++) {
        const tileX = baseTileX + dx;
        const tileY = baseTileY + dy;
        const x = offsetX + dx * tileSize;
        const y = offsetY + dy * tileSize;
        const key = `${zoom}/${tileX}/${tileY}`;
        if (tileCacheRef.current[key]) {
          ctx.drawImage(tileCacheRef.current[key], x, y, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#f5f2ec';
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.strokeStyle = '#e8e4dd';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, tileSize, tileSize);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tileX}/${tileY}@2x.png`;
          img.onload = () => { tileCacheRef.current[key] = img; drawMap(); };
        }
      }
    }

    const toPixel = (pLat: number, pLng: number) => ({
      x: w / 2 + (lonToTileX(pLng, zoom) - centerTileX) * tileSize,
      y: h / 2 + (latToTileY(pLat, zoom) - centerTileY) * tileSize,
    });

    const mpp = metersPerPixel(lat, zoom);

    // Draw existing neighborhoods
    neighborhoods.forEach((n) => {
      const pos = toPixel(n.center_lat, n.center_lng);
      const r = n.radius_meters / mpp;
      const isSelected = selected?.id === n.id;
      const color = n.color || '#14ae5c';

      // Fill
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color + (isSelected ? '22' : '14');
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.setLineDash(isSelected ? [] : [8, 5]);
      ctx.strokeStyle = color + (isSelected ? 'cc' : '88');
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      if (r > 20) {
        ctx.font = `${isSelected ? 'bold ' : ''}12px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(n.name, pos.x, pos.y);
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw new neighborhood being created
    if (mode === 'create' && drawCenter) {
      const pos = toPixel(drawCenter.lat, drawCenter.lng);
      const r = drawRadius / mpp;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = createColor + '22';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = createColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = createColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = createColor;
      ctx.fillText(createName || 'New Neighborhood', pos.x, pos.y - r - 6);
    }

    // You pin (center)
    const cx = w / 2;
    const cy = h / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,174,92,0.08)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#14ae5c'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Attribution
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('© OpenStreetMap © CARTO', 4, h - 4);
  }, [lat, lng, zoom, neighborhoods, selected, mode, drawCenter, drawRadius, createColor, createName]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setCanvasSize({ w: Math.floor(width * 2), h: Math.floor(height * 2) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { drawMap(); }, [drawMap, canvasSize]);

  // ── drag to pan ──────────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLat: lat, startLng: lng };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const mpp = metersPerPixel(lat, zoom);
    setLat(dragRef.current.startLat + (dy * mpp) / 111320);
    setLng(dragRef.current.startLng - (dx * mpp) / (111320 * Math.cos((lat * Math.PI) / 180)));
  };
  const handlePointerUp = () => { dragRef.current = null; };

  // ── tap on map in create mode ────────────────────────────────────────────────
  const handleMapTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'create') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const w = canvas.width;
    const h = canvas.height;
    const tileSize = 256;
    const centerTileX = lonToTileX(lng, zoom);
    const centerTileY = latToTileY(lat, zoom);
    const mpp = metersPerPixel(lat, zoom);

    // Convert pixel to lat/lng
    const dTileX = (px - w / 2) / tileSize;
    const dTileY = (py - h / 2) / tileSize;
    const tileX = centerTileX + dTileX;
    const tileY = centerTileY + dTileY;
    const n = Math.pow(2, zoom);
    const tapLng = (tileX / n) * 360 - 180;
    const tapLatRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n)));
    const tapLat = (tapLatRad * 180) / Math.PI;

    setDrawCenter({ lat: tapLat, lng: tapLng });
    setLat(tapLat);
    setLng(tapLng);

    // Check overlaps live
    checkOverlap(tapLat, tapLng, drawRadius);
    setShowForm(true);
  };

  const checkOverlap = useCallback(async (cLat: number, cLng: number, r: number) => {
    try {
      const res = await apiFetch(`/v1/neighborhoods?_check=1`);
      const all: Neighborhood[] = res?.data?.neighborhoods || [];
      const overlapping = all.filter((n) => {
        const d = distanceMeters(cLat, cLng, n.center_lat, n.center_lng);
        return d < n.radius_meters + r;
      });
      setOverlapWarning(
        overlapping.length > 0
          ? `A neighborhood already exists in this area: "${overlapping[0].name}"`
          : '',
      );
    } catch {}
  }, []);

  useEffect(() => {
    if (mode === 'create' && drawCenter) {
      checkOverlap(drawCenter.lat, drawCenter.lng, drawRadius);
    }
  }, [drawRadius, drawCenter, mode, checkOverlap]);

  // ── search (browse mode) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || mode !== 'browse') return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearching(true);
      apiFetch(`/v1/neighborhoods/lookup?city=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => setNeighborhoods(res?.data?.neighborhoods || []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 500);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, mode]);

  // ── GPS ──────────────────────────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      apiFetch(`/v1/neighborhoods/lookup?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
        .then((res) => setNeighborhoods(res?.data?.neighborhoods || []))
        .catch(() => {});
    });
  };

  // ── join ─────────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!selected) return;
    setJoining(true);
    try {
      const res = await apiFetch('/v1/neighborhoods/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ neighborhood_id: selected.id }),
      });
      // Save the new token which has neighborhood_id embedded in the JWT
      if (res?.data?.new_access_token) {
        setTokens(res.data.new_access_token);
      }
      await refreshProfile();
      toast.success(`Joined ${selected.name}!`);
      setTimeout(() => navigate(-1), 1000);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to join neighborhood');
    } finally {
      setJoining(false);
    }
  };

  // ── create ───────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!drawCenter || !createName.trim() || !createCity.trim()) {
      toast.error('Please fill in the neighborhood name and city');
      return;
    }
    if (overlapWarning) {
      toast.error('Cannot create: overlap detected');
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch('/v1/neighborhoods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim() || undefined,
          color: createColor,
          center_lat: drawCenter.lat,
          center_lng: drawCenter.lng,
          radius_meters: drawRadius,
          city: createCity.trim(),
        }),
      });
      const created: Neighborhood = res.data.neighborhood;
      setNeighborhoods((prev) => [created, ...prev]);
      setSelected(created);
      toast.success(`"${created.name}" created!`);
      setMode('browse');
      setShowForm(false);
      setDrawCenter(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create neighborhood');
    } finally {
      setCreating(false);
    }
  };

  const resetCreate = () => {
    setMode('browse');
    setDrawCenter(null);
    setShowForm(false);
    setOverlapWarning('');
    setCreateName('');
    setCreateDesc('');
    setCreateCity('');
    setCreateColor('#14ae5c');
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <MobileContainer>
      <PageTransition>
      <SwipeBack>
      <Toaster position="top-center" />
      <div className="flex flex-col size-full bg-white">

        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 h-14">
            <button onClick={() => mode === 'create' ? resetCreate() : navigate(-1)} className="text-gray-800">
              {mode === 'create' ? <X className="size-6" /> : <ArrowLeft className="size-6" />}
            </button>
            <h1 className="text-[18px] font-semibold text-gray-900 font-[Poppins,sans-serif] flex-1">
              {mode === 'create' ? 'Create Neighborhood' : 'Choose Location'}
            </h1>
            {mode === 'browse' && user && (
              <button
                onClick={() => setMode('create')}
                className="flex items-center gap-1.5 bg-[#14ae5c] text-white px-3 py-1.5 rounded-full text-[12px] font-semibold active:scale-95 transition-transform"
              >
                <PenLine className="size-3.5" /> Create
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">

          {/* Browse mode: search */}
          {mode === 'browse' && (
            <>
              <p className="text-[13px] text-gray-500 mb-3">
                Search for your neighborhood or tap one on the map to join.
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 text-[14px] outline-none focus:ring-2 focus:ring-[#14ae5c]/30"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#14ae5c] animate-spin" />}
              </div>
              <button onClick={handleGPS} className="flex items-center gap-2 w-full py-2.5 mb-3 text-[13px] text-[#14ae5c] font-medium">
                <Navigation className="size-4" /> Use current location
              </button>

              {/* Neighborhood list */}
              {neighborhoods.length > 0 && (
                <div className="mb-3 space-y-2">
                  {neighborhoods.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { setSelected(n); setLat(n.center_lat); setLng(n.center_lng); setZoom(15); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selected?.id === n.id ? 'border-[#14ae5c] bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                    >
                      <div className="size-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: (n.color || '#14ae5c') + '22' }}>
                        <MapPin className="size-4" style={{ color: n.color || '#14ae5c' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800">{n.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {n.city}{n.distance_km ? ` · ${n.distance_km.toFixed(1)} km` : ''} · r={Math.round((n.radius_meters || 0))}m
                        </p>
                      </div>
                      {selected?.id === n.id && <Check className="size-4 text-[#14ae5c] shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Create mode instructions */}
          {mode === 'create' && !drawCenter && (
            <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-[13px] text-blue-700 font-medium mb-0.5">Tap on the map</p>
              <p className="text-[12px] text-blue-500">Tap anywhere on the map below to place your neighborhood's center point.</p>
            </div>
          )}

          {/* Map */}
          <div
            ref={containerRef}
            className="w-full h-[240px] rounded-2xl overflow-hidden mb-4 border border-gray-200 relative touch-none"
          >
            <canvas
              ref={canvasRef}
              width={canvasSize.w || 700}
              height={canvasSize.h || 480}
              className="w-full h-full cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={mode === 'create' ? handleMapTap : undefined}
              style={{ touchAction: 'none' }}
            />
            {/* Zoom */}
            <div className="absolute right-3 top-3 flex flex-col gap-1">
              <button onClick={() => setZoom((z) => Math.min(18, z + 1))} className="bg-white shadow rounded-lg size-8 flex items-center justify-center active:bg-gray-100">
                <Plus className="size-4 text-gray-700" />
              </button>
              <button onClick={() => setZoom((z) => Math.max(5, z - 1))} className="bg-white shadow rounded-lg size-8 flex items-center justify-center active:bg-gray-100">
                <Minus className="size-4 text-gray-700" />
              </button>
            </div>
            {/* Crosshair hint in create mode */}
            {mode === 'create' && !drawCenter && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 text-white text-[12px] px-3 py-1.5 rounded-full">Tap to place center</div>
              </div>
            )}
          </div>

          {/* Create mode: radius slider + form */}
          {mode === 'create' && drawCenter && (
            <>
              {/* Radius */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-semibold text-gray-800">Neighborhood Radius</span>
                  <span className="text-[13px] font-semibold text-[#14ae5c]">{drawRadius >= 1000 ? `${(drawRadius / 1000).toFixed(1)} km` : `${drawRadius} m`}</span>
                </div>
                <input
                  type="range" min={100} max={5000} step={100}
                  value={drawRadius}
                  onChange={(e) => setDrawRadius(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${createColor} ${((drawRadius - 100) / 4900) * 100}%, #e5e7eb ${((drawRadius - 100) / 4900) * 100}%)` }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[11px] text-gray-400">100 m</span>
                  <span className="text-[11px] text-gray-400">5 km</span>
                </div>
              </div>

              {/* Overlap warning */}
              {overlapWarning && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-[16px]">⚠️</span>
                  <p className="text-[12px] text-red-700">{overlapWarning}</p>
                </div>
              )}

              {/* Form toggle */}
              <button
                onClick={() => setShowForm((v) => !v)}
                className="w-full flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-3"
              >
                <span className="text-[13px] font-semibold text-gray-800">Neighborhood Details</span>
                <ChevronDown className={`size-4 text-gray-500 transition-transform ${showForm ? 'rotate-180' : ''}`} />
              </button>

              {showForm && (
                <div className="space-y-3 mb-4">
                  {/* Name */}
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 mb-1 block">Name *</label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. Hadjam Moukhtar"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none"
                    />
                  </div>
                  {/* City */}
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 mb-1 block">City *</label>
                    <input
                      type="text"
                      value={createCity}
                      onChange={(e) => setCreateCity(e.target.value)}
                      placeholder="e.g. Alger"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none"
                    />
                  </div>
                  {/* Description */}
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 mb-1 block">Description</label>
                    <textarea
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                      placeholder="Optional — describe this neighborhood"
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-400 focus:border-[#14ae5c] focus:outline-none resize-none"
                    />
                  </div>
                  {/* Color */}
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 mb-2 block">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCreateColor(c)}
                          className="size-8 rounded-full border-2 transition-transform active:scale-90"
                          style={{ backgroundColor: c, borderColor: createColor === c ? '#333' : 'transparent' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={creating || !!overlapWarning || !createName.trim() || !createCity.trim()}
                className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform mb-2"
              >
                {creating ? <Loader2 className="size-5 animate-spin" /> : <><Check className="size-5" /> Create Neighborhood</>}
              </button>
              <button onClick={resetCreate} className="w-full text-gray-500 py-2 text-[13px]">Cancel</button>
            </>
          )}

          {/* Browse mode: join button */}
          {mode === 'browse' && selected && (
            <div className="mt-2">
              {selected.description && (
                <p className="text-[12px] text-gray-500 mb-3 px-1">{selected.description}</p>
              )}
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
              >
                {joining ? <Loader2 className="size-5 animate-spin" /> : <><Check className="size-5" /> Join {selected.name}</>}
              </button>
            </div>
          )}

          {/* Browse mode: no selection yet */}
          {mode === 'browse' && !selected && neighborhoods.length === 0 && (
            <div className="text-center py-6">
              <p className="text-[13px] text-gray-400">No neighborhoods found. Search or create one.</p>
            </div>
          )}

        </div>
      </div>
      </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}
