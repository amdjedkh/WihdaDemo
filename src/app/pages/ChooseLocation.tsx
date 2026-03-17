import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Search, Navigation,
  Check, Loader2, MapPin, PenLine, X, ChevronDown, Minus, Plus,
} from 'lucide-react';
import SwipeBack from '../components/SwipeBack';
import { apiFetch, setTokens } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

const DEFAULT_LAT = 36.7538;
const DEFAULT_LNG = 3.0588;
const DEFAULT_ZOOM = 13;

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  return Math.sqrt(
    Math.pow((lat1 - lat2) * 111000, 2) +
    Math.pow((lng1 - lng2) * 111000 * Math.cos((lat1 * Math.PI) / 180), 2),
  );
}

export default function ChooseLocation() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const neighborhoodLayersRef = useRef<L.Circle[]>([]);
  const createMarkerRef = useRef<L.Marker | null>(null);
  const createCircleRef = useRef<L.Circle | null>(null);

  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [selected, setSelected] = useState<Neighborhood | null>(null);
  const [joining, setJoining] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<'browse' | 'create'>('browse');
  const [drawCenter, setDrawCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [drawRadius, setDrawRadius] = useState(500);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createColor, setCreateColor] = useState('#14ae5c');
  const [createCity, setCreateCity] = useState('');
  const [creating, setCreating] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState('');
  const [showForm, setShowForm] = useState(false);

  // ── init Leaflet map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control (bottom-right)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── draw neighborhoods on map ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old layers
    neighborhoodLayersRef.current.forEach((l) => l.remove());
    neighborhoodLayersRef.current = [];

    neighborhoods.forEach((n) => {
      const color = n.color || '#14ae5c';
      const isSelected = selected?.id === n.id;

      const circle = L.circle([n.center_lat, n.center_lng], {
        radius: n.radius_meters,
        color,
        fillColor: color,
        fillOpacity: isSelected ? 0.15 : 0.08,
        weight: isSelected ? 2.5 : 1.5,
        dashArray: isSelected ? undefined : '8, 5',
      }).addTo(map);

      circle.bindTooltip(n.name, {
        permanent: n.radius_meters > 300,
        direction: 'center',
        className: 'leaflet-neighborhood-label',
      });

      circle.on('click', () => {
        setSelected(n);
        map.flyTo([n.center_lat, n.center_lng], 15, { duration: 0.5 });
      });

      neighborhoodLayersRef.current.push(circle);
    });
  }, [neighborhoods, selected]);

  // ── create mode: map click handler ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (e: L.LeafletMouseEvent) => {
      if (mode !== 'create') return;
      const { lat, lng } = e.latlng;
      setDrawCenter({ lat, lng });
      setShowForm(true);
      checkOverlap(lat, lng, drawRadius);
    };

    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [mode, drawRadius]);

  // ── update create preview circle + marker ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (createMarkerRef.current) { createMarkerRef.current.remove(); createMarkerRef.current = null; }
    if (createCircleRef.current) { createCircleRef.current.remove(); createCircleRef.current = null; }

    if (mode === 'create' && drawCenter) {
      const marker = L.circleMarker([drawCenter.lat, drawCenter.lng], {
        radius: 8,
        color: '#fff',
        fillColor: createColor,
        fillOpacity: 1,
        weight: 2.5,
      }).addTo(map);

      const circle = L.circle([drawCenter.lat, drawCenter.lng], {
        radius: drawRadius,
        color: createColor,
        fillColor: createColor,
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);

      if (createName) {
        circle.bindTooltip(createName, { permanent: true, direction: 'center', className: 'leaflet-neighborhood-label' });
      }

      createMarkerRef.current = marker as unknown as L.Marker;
      createCircleRef.current = circle;
    }
  }, [mode, drawCenter, drawRadius, createColor, createName]);

  // ── load neighborhoods ───────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch('/v1/neighborhoods')
      .then((res) => setNeighborhoods(res?.data?.neighborhoods || []))
      .catch(() => {});
  }, []);

  // ── search ───────────────────────────────────────────────────────────────────
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
      const { latitude, longitude } = pos.coords;
      mapRef.current?.flyTo([latitude, longitude], 15, { duration: 0.8 });
      apiFetch(`/v1/neighborhoods/lookup?lat=${latitude}&lng=${longitude}`)
        .then((res) => setNeighborhoods(res?.data?.neighborhoods || []))
        .catch(() => {});
    });
  };

  // ── overlap check ────────────────────────────────────────────────────────────
  const checkOverlap = useCallback(async (cLat: number, cLng: number, r: number) => {
    try {
      const res = await apiFetch('/v1/neighborhoods');
      const all: Neighborhood[] = res?.data?.neighborhoods || [];
      const overlapping = all.filter((n) => {
        const d = distanceMeters(cLat, cLng, n.center_lat, n.center_lng);
        return d < n.radius_meters + r;
      });
      setOverlapWarning(
        overlapping.length > 0
          ? `A neighborhood already exists nearby: "${overlapping[0].name}"`
          : '',
      );
    } catch {}
  }, []);

  useEffect(() => {
    if (mode === 'create' && drawCenter) {
      checkOverlap(drawCenter.lat, drawCenter.lng, drawRadius);
    }
  }, [drawRadius, drawCenter, mode, checkOverlap]);

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
      if (res?.data?.new_access_token) setTokens(res.data.new_access_token);
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

  // ── fly to selected neighborhood ─────────────────────────────────────────────
  const flyTo = (n: Neighborhood) => {
    setSelected(n);
    mapRef.current?.flyTo([n.center_lat, n.center_lng], 15, { duration: 0.5 });
  };

  return (
    <MobileContainer>
      <PageTransition>
      <SwipeBack>
      <Toaster position="top-center" />
      <div className="flex flex-col size-full bg-white">

        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)] shrink-0">
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

        {/* Map — takes remaining space */}
        <div className="flex-1 relative min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0" />

          {/* Create mode overlay hint */}
          {mode === 'create' && !drawCenter && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
              <div className="bg-black/60 text-white text-[13px] px-4 py-2 rounded-full">
                Tap on the map to place center
              </div>
            </div>
          )}
        </div>

        {/* Bottom panel */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-5 pt-4 pb-6 max-h-[55%] overflow-y-auto">

          {/* Browse: search + GPS */}
          {mode === 'browse' && (
            <>
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
              <button onClick={handleGPS} className="flex items-center gap-2 w-full py-2 mb-3 text-[13px] text-[#14ae5c] font-medium">
                <Navigation className="size-4" /> Use current location
              </button>

              {/* Neighborhood list */}
              {neighborhoods.length > 0 && (
                <div className="space-y-2 mb-3">
                  {neighborhoods.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => flyTo(n)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selected?.id === n.id ? 'border-[#14ae5c] bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                    >
                      <div className="size-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: (n.color || '#14ae5c') + '22' }}>
                        <MapPin className="size-4" style={{ color: n.color || '#14ae5c' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800">{n.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {n.city}{n.distance_km ? ` · ${n.distance_km.toFixed(1)} km` : ''} · r={Math.round(n.radius_meters || 0)}m
                        </p>
                      </div>
                      {selected?.id === n.id && <Check className="size-4 text-[#14ae5c] shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {neighborhoods.length === 0 && !searching && (
                <p className="text-[13px] text-gray-400 text-center py-4">No neighborhoods found. Search or create one.</p>
              )}

              {/* Join button */}
              {selected && (
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
            </>
          )}

          {/* Create mode panel */}
          {mode === 'create' && (
            <>
              {!drawCenter ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                  <p className="text-[13px] text-blue-700 font-medium mb-0.5">Tap on the map above</p>
                  <p className="text-[12px] text-blue-500">Tap anywhere to place your neighborhood's center point.</p>
                </div>
              ) : (
                <>
                  {/* Radius */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-gray-800">Radius</span>
                      <span className="text-[13px] font-semibold text-[#14ae5c]">
                        {drawRadius >= 1000 ? `${(drawRadius / 1000).toFixed(1)} km` : `${drawRadius} m`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setDrawRadius((r) => Math.max(100, r - 100))} className="size-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200">
                        <Minus className="size-4 text-gray-600" />
                      </button>
                      <input
                        type="range" min={100} max={5000} step={100}
                        value={drawRadius}
                        onChange={(e) => setDrawRadius(parseInt(e.target.value))}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, ${createColor} ${((drawRadius - 100) / 4900) * 100}%, #e5e7eb ${((drawRadius - 100) / 4900) * 100}%)` }}
                      />
                      <button onClick={() => setDrawRadius((r) => Math.min(5000, r + 100))} className="size-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200">
                        <Plus className="size-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {overlapWarning && (
                    <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                      <span className="text-[16px]">⚠️</span>
                      <p className="text-[12px] text-red-700">{overlapWarning}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowForm((v) => !v)}
                    className="w-full flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-3"
                  >
                    <span className="text-[13px] font-semibold text-gray-800">Neighborhood Details</span>
                    <ChevronDown className={`size-4 text-gray-500 transition-transform ${showForm ? 'rotate-180' : ''}`} />
                  </button>

                  {showForm && (
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="text-[12px] font-semibold text-gray-700 mb-1 block">Name *</label>
                        <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Hadjam Moukhtar"
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-700 mb-1 block">City *</label>
                        <input type="text" value={createCity} onChange={(e) => setCreateCity(e.target.value)} placeholder="e.g. Alger"
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-700 mb-1 block">Description</label>
                        <textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Optional description" rows={2}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none resize-none" />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-700 mb-2 block">Color</label>
                        <div className="flex gap-2 flex-wrap">
                          {PALETTE.map((c) => (
                            <button key={c} onClick={() => setCreateColor(c)}
                              className="size-8 rounded-full border-2 transition-transform active:scale-90"
                              style={{ backgroundColor: c, borderColor: createColor === c ? '#333' : 'transparent' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

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
            </>
          )}

        </div>
      </div>
      </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}
