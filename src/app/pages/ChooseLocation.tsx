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
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = (import.meta.env.VITE_MAPBOX_TOKEN as string) ||
  'pk.eyJ1IjoiYW1kamVka2giLCJhIjoiY21udWV0MWY3MGZqbjJxcjFpa2o4ZTByciJ9.qmZhll4YSsgt7CFpH62tPg';

const PALETTE = ['#14ae5c', '#52ADE5', '#f0a326', '#e74c3c', '#8e44ad', '#1abc9c', '#e67e22', '#2980b9'];
const APP_GREEN = '#14ae5c';

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

/** Convert meters to approximate degrees (for GeoJSON circle approximation) */
function metersToDeg(meters: number, lat: number) {
  return {
    lng: meters / (111320 * Math.cos((lat * Math.PI) / 180)),
    lat: meters / 110540,
  };
}

/** Build a GeoJSON polygon approximating a circle */
function circlePolygon(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const { lng: dLng, lat: dLat } = metersToDeg(radiusMeters, centerLat);
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([
      centerLng + dLng * Math.cos(angle),
      centerLat + dLat * Math.sin(angle),
    ]);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

export default function ChooseLocation() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const previewMarkerRef = useRef<mapboxgl.Marker | null>(null);

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
  const [createColor, setCreateColor] = useState(APP_GREEN);
  const [createCity, setCreateCity] = useState('');
  const [creating, setCreating] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ── init Mapbox map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [DEFAULT_LNG, DEFAULT_LAT],
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    // Custom attribution (compact)
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    // Navigation control (zoom + compass) — bottom right, styled via CSS
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('load', () => {
      // ── Custom map theme: tint roads and labels green ──────────────────────

      // Water — very light teal tint
      if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', '#d9f2e6');
      }
      // Parks / green spaces
      ['landuse', 'national-park', 'landcover'].forEach((id) => {
        if (map.getLayer(id)) {
          map.setPaintProperty(id, 'fill-color', [
            'case',
            ['in', ['get', 'class'], ['literal', ['park', 'grass', 'scrub', 'wood', 'forest', 'glacier']]],
            '#c8edda',
            ['get', 'fill-color'] || '#e8f5e9',
          ]);
        }
      });

      // Highway lines — muted green-gray
      ['road-motorway', 'road-primary', 'road-secondary', 'road-street'].forEach((id) => {
        if (map.getLayer(id)) {
          try { map.setPaintProperty(id, 'line-color', '#d1e8d8'); } catch {}
        }
      });

      // ── Source + layers for neighborhood circles ───────────────────────────
      map.addSource('neighborhoods', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Fill
      map.addLayer({
        id: 'neighborhoods-fill',
        type: 'fill',
        source: 'neighborhoods',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['case', ['get', 'selected'], 0.18, 0.08],
        },
      });

      // Border
      map.addLayer({
        id: 'neighborhoods-border',
        type: 'line',
        source: 'neighborhoods',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'selected'], 2.5, 1.5],
          'line-dasharray': ['case', ['get', 'selected'], ['literal', [1]], ['literal', [6, 4]]],
          'line-opacity': 0.9,
        },
      });

      // Labels
      map.addLayer({
        id: 'neighborhoods-label',
        type: 'symbol',
        source: 'neighborhoods',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 12,
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      });

      // ── Source + layer for create-mode preview circle ──────────────────────
      map.addSource('preview', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'preview-fill',
        type: 'fill',
        source: 'preview',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.12,
        },
      });

      map.addLayer({
        id: 'preview-border',
        type: 'line',
        source: 'preview',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5,
          'line-dasharray': ['literal', [1]],
        },
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── update neighborhood circles on map ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const src = map.getSource('neighborhoods') as mapboxgl.GeoJSONSource;
    if (!src) return;

    // Remove old label markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const features: GeoJSON.Feature<GeoJSON.Polygon>[] = neighborhoods.map((n) => {
      const f = circlePolygon(n.center_lng, n.center_lat, n.radius_meters);
      f.properties = {
        id: n.id,
        name: n.name,
        color: n.color || APP_GREEN,
        selected: selected?.id === n.id,
      };
      return f;
    });

    src.setData({ type: 'FeatureCollection', features });
  }, [neighborhoods, selected, mapReady]);

  // ── map click handler (create mode) ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      if (mode !== 'create') return;
      const { lng, lat } = e.lngLat;
      setDrawCenter({ lat, lng });
      setShowForm(true);
      checkOverlap(lat, lng, drawRadius);
    };

    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [mode, drawRadius, mapReady]);

  // ── create mode: preview circle + draggable center marker ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove old preview marker
    previewMarkerRef.current?.remove();
    previewMarkerRef.current = null;

    const src = map.getSource('preview') as mapboxgl.GeoJSONSource;
    if (!src) return;

    if (mode === 'create' && drawCenter) {
      // Preview circle
      const f = circlePolygon(drawCenter.lng, drawCenter.lat, drawRadius);
      f.properties = { color: createColor };
      src.setData({ type: 'FeatureCollection', features: [f] });

      // Draggable center marker
      const el = document.createElement('div');
      el.style.cssText = `
        width:20px;height:20px;border-radius:50%;
        background:${createColor};border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:grab;
      `;
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([drawCenter.lng, drawCenter.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat();
        setDrawCenter({ lat, lng });
        checkOverlap(lat, lng, drawRadius);
      });

      previewMarkerRef.current = marker;
    } else {
      src.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [mode, drawCenter, drawRadius, createColor, mapReady]);

  // ── cursor style in create mode ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = mode === 'create' ? 'crosshair' : '';
  }, [mode]);

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
      mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15, duration: 800 });
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

  // ── fly to selected neighborhood ─────────────────────────────────────────────
  const flyTo = (n: Neighborhood) => {
    setSelected(n);
    mapRef.current?.flyTo({
      center: [n.center_lng, n.center_lat],
      zoom: 15,
      duration: 600,
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
    setCreateColor(APP_GREEN);
    // Clear preview
    const src = mapRef.current?.getSource('preview') as mapboxgl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features: [] });
    previewMarkerRef.current?.remove();
    previewMarkerRef.current = null;
  };

  return (
    <MobileContainer>
      <PageTransition>
      <SwipeBack>
      <Toaster position="top-center" />
      <div className="flex flex-col h-dvh w-full bg-white">

        {/* Header */}
        <div className="px-5 pt-[env(safe-area-inset-top)] shrink-0 bg-white z-10">
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

        {/* Map */}
        <div className="flex-1 relative min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0" />

          {/* Create mode hint pill */}
          {mode === 'create' && !drawCenter && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="bg-gray-900/80 backdrop-blur-sm text-white text-[13px] px-4 py-2 rounded-full shadow-lg">
                Tap on the map to place center
              </div>
            </div>
          )}

          {/* GPS button floating over map */}
          {mode === 'browse' && (
            <button
              onClick={handleGPS}
              className="absolute bottom-4 left-4 z-10 size-10 bg-white rounded-full shadow-md flex items-center justify-center active:scale-95 transition-transform border border-gray-100"
            >
              <Navigation className="size-4 text-[#14ae5c]" />
            </button>
          )}
        </div>

        {/* Bottom panel */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[55%] overflow-y-auto">

          {/* Browse mode */}
          {mode === 'browse' && (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 text-[14px] outline-none focus:ring-2 focus:ring-[#14ae5c]/30 transition-all"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#14ae5c] animate-spin" />}
              </div>

              {/* Neighborhood list */}
              {neighborhoods.length > 0 && (
                <div className="space-y-2 mb-3">
                  {neighborhoods.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => flyTo(n)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selected?.id === n.id
                          ? 'border-[#14ae5c] bg-[#14ae5c]/5 shadow-sm'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div
                        className="size-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (n.color || APP_GREEN) + '22' }}
                      >
                        <MapPin className="size-4" style={{ color: n.color || APP_GREEN }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800">{n.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {n.city}{n.distance_km ? ` · ${n.distance_km.toFixed(1)} km` : ''} · {Math.round(n.radius_meters || 0)}m radius
                        </p>
                      </div>
                      {selected?.id === n.id && (
                        <div className="size-5 rounded-full bg-[#14ae5c] flex items-center justify-center shrink-0">
                          <Check className="size-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {neighborhoods.length === 0 && !searching && (
                <div className="text-center py-6">
                  <div className="size-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="size-5 text-gray-400" />
                  </div>
                  <p className="text-[13px] text-gray-500 font-medium">No neighborhoods found</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">Search by city or create one</p>
                </div>
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
                    className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-sm shadow-[#14ae5c]/30"
                  >
                    {joining
                      ? <Loader2 className="size-5 animate-spin" />
                      : <><Check className="size-5" /> Join {selected.name}</>
                    }
                  </button>
                </div>
              )}
            </>
          )}

          {/* Create mode panel */}
          {mode === 'create' && (
            <>
              {!drawCenter ? (
                <div className="bg-[#14ae5c]/8 border border-[#14ae5c]/20 rounded-2xl p-4 mb-3 flex items-start gap-3">
                  <div className="size-8 bg-[#14ae5c]/15 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="size-4 text-[#14ae5c]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800 mb-0.5">Tap on the map</p>
                    <p className="text-[12px] text-gray-500">Place your neighborhood's center point anywhere on the map.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Radius slider */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-gray-800">Radius</span>
                      <span className="text-[13px] font-semibold text-[#14ae5c]">
                        {drawRadius >= 1000 ? `${(drawRadius / 1000).toFixed(1)} km` : `${drawRadius} m`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDrawRadius((r) => Math.max(100, r - 100))}
                        className="size-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
                      >
                        <Minus className="size-4 text-gray-600" />
                      </button>
                      <input
                        type="range" min={100} max={5000} step={100}
                        value={drawRadius}
                        onChange={(e) => setDrawRadius(parseInt(e.target.value))}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${createColor} ${((drawRadius - 100) / 4900) * 100}%, #e5e7eb ${((drawRadius - 100) / 4900) * 100}%)`,
                        }}
                      />
                      <button
                        onClick={() => setDrawRadius((r) => Math.min(5000, r + 100))}
                        className="size-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
                      >
                        <Plus className="size-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {overlapWarning && (
                    <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                      <span className="text-[15px]">⚠️</span>
                      <p className="text-[12px] text-red-700">{overlapWarning}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowForm((v) => !v)}
                    className="w-full flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-3 active:bg-gray-100 transition-colors"
                  >
                    <span className="text-[13px] font-semibold text-gray-800">Neighborhood Details</span>
                    <ChevronDown className={`size-4 text-gray-500 transition-transform duration-200 ${showForm ? 'rotate-180' : ''}`} />
                  </button>

                  {showForm && (
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="text-[12px] font-semibold text-gray-700 mb-1 block">Name *</label>
                        <input
                          type="text" value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          placeholder="e.g. Hadjam Moukhtar"
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none focus:ring-2 focus:ring-[#14ae5c]/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-700 mb-1 block">City *</label>
                        <input
                          type="text" value={createCity}
                          onChange={(e) => setCreateCity(e.target.value)}
                          placeholder="e.g. Alger"
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none focus:ring-2 focus:ring-[#14ae5c]/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-700 mb-1 block">Description</label>
                        <textarea
                          value={createDesc}
                          onChange={(e) => setCreateDesc(e.target.value)}
                          placeholder="Optional description" rows={2}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[14px] focus:border-[#14ae5c] focus:outline-none focus:ring-2 focus:ring-[#14ae5c]/20 transition-all resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-700 mb-2 block">Color</label>
                        <div className="flex gap-2 flex-wrap">
                          {PALETTE.map((c) => (
                            <button
                              key={c} onClick={() => setCreateColor(c)}
                              className="size-8 rounded-full transition-all active:scale-90"
                              style={{
                                backgroundColor: c,
                                boxShadow: createColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCreate}
                    disabled={creating || !!overlapWarning || !createName.trim() || !createCity.trim()}
                    className="w-full bg-[#14ae5c] text-white py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform mb-2 shadow-sm shadow-[#14ae5c]/30"
                  >
                    {creating ? <Loader2 className="size-5 animate-spin" /> : <><Check className="size-5" /> Create Neighborhood</>}
                  </button>
                  <button onClick={resetCreate} className="w-full text-gray-400 py-2 text-[13px] active:text-gray-600 transition-colors">
                    Cancel
                  </button>
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
