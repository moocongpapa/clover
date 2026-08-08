import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

declare global {
  interface Window {
    google: any;
    gm_authFailure: any;
  }
}

export interface Arena {
  placeName: string;
  address: string;
  lat?: number;
  lng?: number;
}

interface GoogleMapSelectorProps {
  selectedArenas: Arena[];
  onChange: (arenas: Arena[]) => void;
  primaryIndex: number;
  onPrimaryChange: (index: number) => void;
  onAddressSelect: (parsed: {
    activitySido: string;
    activitySigungu: string;
    activityDistrict: string;
    activityTown: string;
  }) => void;
}

function normalizeSido(sido: string): string {
  if (!sido) return '';
  if (sido.startsWith('서울')) return '서울특별시';
  if (sido.startsWith('부산')) return '부산광역시';
  if (sido.startsWith('대구')) return '대구광역시';
  if (sido.startsWith('인천')) return '인천광역시';
  if (sido.startsWith('광주')) return '광주광역시';
  if (sido.startsWith('대전')) return '대전광역시';
  if (sido.startsWith('울산')) return '울산광역시';
  if (sido.startsWith('세종')) return '세종특별자치시';
  if (sido.startsWith('경기')) return '경기도';
  if (sido.startsWith('강원')) return '강원특별자치도';
  if (sido.startsWith('충북') || sido.startsWith('충청북')) return '충청북도';
  if (sido.startsWith('충남') || sido.startsWith('충청남')) return '충청남도';
  if (sido.startsWith('전북') || sido.startsWith('전북특별자치')) return '전북특별자치도';
  if (sido.startsWith('전남') || sido.startsWith('전라남')) return '전라남도';
  if (sido.startsWith('경북') || sido.startsWith('경상북')) return '경상북도';
  if (sido.startsWith('경남') || sido.startsWith('경상남')) return '경상남도';
  if (sido.startsWith('제주')) return '제주특별자치도';
  return sido;
}

export function parseKoreanAddress(address: string) {
  if (!address) return null;
  let cleanAddress = address.trim();
  if (cleanAddress.startsWith('대한민국')) {
    cleanAddress = cleanAddress.substring(4).trim();
  }
  const tokens = cleanAddress.split(/\s+/);
  if (tokens.length === 0) return null;

  const activitySido = normalizeSido(tokens[0]);
  let activitySigungu = '';
  let activityDistrict = '';
  let activityTown = '';

  if (tokens.length > 1) {
    const second = tokens[1];
    if (tokens.length > 2 && second.endsWith('시') && (tokens[2].endsWith('구') || tokens[2].endsWith('군'))) {
      activitySigungu = `${second} ${tokens[2]}`;
      if (tokens.length > 3) activityDistrict = tokens[3];
      if (tokens.length > 4) activityTown = tokens[4];
    } else {
      activitySigungu = second;
      if (tokens.length > 2) activityDistrict = tokens[2];
      if (tokens.length > 3) activityTown = tokens[3];
    }
  }

  return {
    activitySido,
    activitySigungu,
    activityDistrict,
    activityTown,
  };
}

// Distance Calculation (Haversine formula in KM)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distKm: number): string {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)}m`;
  }
  return `${distKm.toFixed(1)}km`;
}

// Curated comprehensive Korean sports facilities
const POPULAR_SPORTS_VENUES: Array<{ placeName: string; address: string; lat: number; lng: number }> = [
  { placeName: '올림픽공원 테니스경기장', address: '서울특별시 송파구 올림픽로 424', lat: 37.5195, lng: 127.1235 },
  { placeName: '올림픽공원 평화의광장', address: '서울특별시 송파구 올림픽로 424', lat: 37.5188, lng: 127.1147 },
  { placeName: '잠실종합운동장 보조경기장', address: '서울특별시 송파구 올림픽로 25', lat: 37.5152, lng: 127.0728 },
  { placeName: '용산 아이파크몰 아디다스 풋살파크', address: '서울특별시 용산구 한강대로23길 55', lat: 37.5298, lng: 126.9647 },
  { placeName: '서초종합체육관', address: '서울특별시 서초구 양재대로12길 74', lat: 37.4612, lng: 127.0392 },
  { placeName: '반포종합운동장 축구장', address: '서울특별시 서초구 신반포로15길 40', lat: 37.5054, lng: 126.9934 },
  { placeName: '여의도공원 농구장', address: '서울특별시 영등포구 여의공원로 68', lat: 37.5255, lng: 126.9248 },
  { placeName: '목동종합운동장 주경기장', address: '서울특별시 양천구 안양천로 939', lat: 37.5303, lng: 126.8797 },
  { placeName: '송파 탄천유수지 축구장', address: '서울특별시 송파구 가락동 78-21', lat: 37.4938, lng: 127.1132 },
  { placeName: '마포구민체육센터 체육관', address: '서울특별시 마포구 월드컵로25길 190', lat: 37.5552, lng: 126.8974 },
  { placeName: '월드컵공원 풋살구장', address: '서울특별시 마포구 하늘공원로 86', lat: 37.5684, lng: 126.8927 },
  { placeName: '노원마들스타디움 축구장', address: '서울특별시 노원구 덕릉로 450', lat: 37.6432, lng: 127.0655 },
  { placeName: '분당구미 체육공원 풋살장', address: '경기도 성남시 분당구 구미동 23', lat: 37.3411, lng: 127.1119 },
  { placeName: '탄천종합운동장', address: '경기도 성남시 분당구 탄천로 215', lat: 37.4095, lng: 127.1265 },
  { placeName: '수원종합운동장 인조잔디구장', address: '경기도 수원시 장안구 경수대로 893', lat: 37.2977, lng: 127.0112 },
  { placeName: '수원월드컵경기장 스포츠센터', address: '경기도 수원시 팔달구 월드컵로 310', lat: 37.2865, lng: 127.0368 },
  { placeName: '하남 스타필드 스포츠몬스터', address: '경기도 하남시 미사대로 750', lat: 37.5456, lng: 127.2238 },
  { placeName: '고양종합운동장 체육관', address: '경기도 고양시 일산서구 중앙로 1601', lat: 37.6766, lng: 126.7483 },
  { placeName: '일산 호수공원 농구코트', address: '경기도 고양시 일산동구 호수로 731', lat: 37.6582, lng: 126.7645 },
  { placeName: '부천종합운동장 인조잔디구장', address: '경기도 부천시 원미구 소사로 482', lat: 37.5028, lng: 126.7972 },
  { placeName: '인천아시아드 주경기장', address: '인천광역시 서구 봉수대로 806', lat: 37.5483, lng: 126.6669 },
  { placeName: '인천 문학경기장 주경기장', address: '인천광역시 미추홀구 매소홀로 618', lat: 37.4348, lng: 126.6917 },
  { placeName: '대전월드컵경기장 풋살구장', address: '대전광역시 유성구 월드컵대로 32', lat: 36.3551, lng: 127.3235 },
  { placeName: '대구 두류공원 야구장', address: '대구광역시 달서구 공원순환로 201', lat: 35.8524, lng: 128.5602 },
  { placeName: '부산 삼락생태공원 테니스장', address: '부산광역시 사상구 삼락동 29-4', lat: 35.1764, lng: 128.9745 },
  { placeName: '부산 아시아드주경기장', address: '부산광역시 연제구 월드컵대로 344', lat: 35.1901, lng: 129.0594 },
  { placeName: '광주 상무시민공원 축구장', address: '광주광역시 서구 상무공원로 101', lat: 35.1528, lng: 126.8489 },
  { placeName: '울산 문수축구경기장 풋살장', address: '울산광역시 남구 문수로 44', lat: 35.5348, lng: 129.2595 },
  { placeName: '세종시 중앙공원 체육시설', address: '세종특별자치시 중앙공원서로 60', lat: 36.4952, lng: 127.2704 },
  { placeName: '제주 종합경기장 애향운동장', address: '제주특별자치도 제주시 서광로2길 24', lat: 33.4996, lng: 126.5165 },
  { placeName: '포항 양덕 한마음체육관', address: '경상북도 포항시 북구 장량로 253', lat: 36.0825, lng: 129.3871 },
];

export default function GoogleMapSelector({
  selectedArenas,
  onChange,
  primaryIndex,
  onPrimaryChange,
  onAddressSelect,
}: GoogleMapSelectorProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLocating, setGpsLocating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<L.Marker[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Interactive Leaflet Map with OpenStreetMap CartoDB Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const defaultCenter: [number, number] = [37.5665, 126.9780]; // Seoul City Hall
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      // High quality, fast tile layer for Korea
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Handle map click to place custom pin and reverse geocode
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`,
            { headers: { 'User-Agent': 'Clover-App/1.0' } }
          );
          const data = await res.json();
          let addr = data?.display_name || '';
          if (addr.startsWith('대한민국, ')) addr = addr.replace('대한민국, ', '');
          if (addr.includes(', 대한민국')) addr = addr.replace(', 대한민국', '');

          const clickedPlace = {
            place_name: data?.name || '지도에서 선택한 위치',
            address_name: addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
          };
          setResults([clickedPlace]);
          setSearchTriggered(true);
        } catch {
          const clickedPlace = {
            place_name: '선택한 위치',
            address_name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
          };
          setResults([clickedPlace]);
          setSearchTriggered(true);
        }
      });

      leafletMapRef.current = map;

      // Auto-locate GPS on boot
      requestGpsLocation(map, selectedArenas.length === 0);
    }
  }, []);

  // Request GPS Location from Browser
  const requestGpsLocation = (mapInstance?: L.Map | null, autoCenter = false) => {
    if (!('geolocation' in navigator)) return;

    setGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });

        const map = mapInstance || leafletMapRef.current;
        if (map) {
          if (autoCenter) {
            map.setView([lat, lng], 14, { animate: true });
          }

          // Update user GPS marker
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.remove();
          }

          const myLocIcon = L.divIcon({
            className: 'clover-gps-marker',
            html: `
              <div style="
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #2563EB;
                border: 3px solid #ffffff;
                box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.4), 0 2px 8px rgba(0,0,0,0.3);
              "></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          const userMarker = L.marker([lat, lng], { icon: myLocIcon }).addTo(map);
          userMarker.bindPopup('<strong style="font-size:12.5px; color:#1e40af;">📍 내 현재 위치</strong>');
          userLocationMarkerRef.current = userMarker;
        }
      },
      (err) => {
        setGpsLocating(false);
        console.warn('GPS Geolocation unavailable:', err.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleRecenterUser = () => {
    if (userLocation && leafletMapRef.current) {
      leafletMapRef.current.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    } else {
      requestGpsLocation(leafletMapRef.current, true);
    }
  };

  // Update Leaflet Map Markers when selectedArenas change
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Clear old markers
    leafletMarkersRef.current.forEach((m) => m.remove());
    leafletMarkersRef.current = [];

    if (selectedArenas.length === 0) return;

    const bounds = L.latLngBounds([]);

    selectedArenas.forEach((arena, idx) => {
      let lat = arena.lat;
      let lng = arena.lng;

      // Match with known popular venues if coords not stored
      if (!lat || !lng) {
        const found = POPULAR_SPORTS_VENUES.find(
          (p) => p.placeName === arena.placeName || p.address === arena.address
        );
        if (found) {
          lat = found.lat;
          lng = found.lng;
        } else {
          // Default nearby offset around user or center
          const baseLat = userLocation?.lat || 37.5665;
          const baseLng = userLocation?.lng || 126.9780;
          lat = baseLat + (idx - 1) * 0.02;
          lng = baseLng + (idx - 1) * 0.02;
        }
      }

      const isPrimary = idx === primaryIndex;
      const markerColor = isPrimary ? '#10B981' : '#3B82F6';

      const customHtml = `
        <div style="
          background: ${markerColor};
          color: #ffffff;
          font-weight: 800;
          font-size: 12px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          transform: translate(-50%, -50%);
        ">
          ${idx + 1}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'clover-custom-marker',
        html: customHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; padding: 2px;">
          <strong style="font-size: 13px; color: #111827;">${idx + 1}. ${arena.placeName}</strong>
          ${isPrimary ? '<span style="color: #10B981; font-weight:700; font-size:11px; margin-left:4px;">(★ 주요 구장)</span>' : ''}
          <div style="font-size: 11.5px; color: #6B7280; margin-top: 2px;">${arena.address}</div>
        </div>
      `);

      leafletMarkersRef.current.push(marker);
      bounds.extend([lat, lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [selectedArenas, primaryIndex, userLocation]);

  // Venue & Address Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = keyword.trim();
    if (!query) return;

    setLoading(true);
    setSearchTriggered(true);

    try {
      // 1. First search in rich local sports facilities database
      let localMatches = POPULAR_SPORTS_VENUES.filter(
        (p) =>
          p.placeName.toLowerCase().includes(query.toLowerCase()) ||
          p.address.toLowerCase().includes(query.toLowerCase())
      ).map((p) => {
        const dist = userLocation
          ? calculateDistanceKm(userLocation.lat, userLocation.lng, p.lat, p.lng)
          : undefined;
        return {
          place_name: p.placeName,
          address_name: p.address,
          lat: p.lat,
          lng: p.lng,
          distance: dist,
        };
      });

      // Sort local matches by GPS distance if available
      if (userLocation) {
        localMatches.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
      }

      // 2. Fetch live OpenStreetMap Nominatim Geocoding
      let osmMatches: any[] = [];
      try {
        const osmRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&countrycodes=kr&accept-language=ko&limit=8`,
          { headers: { 'User-Agent': 'Clover-App/1.0' } }
        );
        const osmData = await osmRes.json();
        if (Array.isArray(osmData)) {
          osmMatches = osmData.map((item: any) => {
            let addr = item.display_name || '';
            if (addr.startsWith('대한민국, ')) addr = addr.replace('대한민국, ', '');
            if (addr.includes(', 대한민국')) addr = addr.replace(', 대한민국', '');
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            const dist = userLocation ? calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng) : undefined;
            return {
              place_name: item.name || query,
              address_name: addr,
              lat,
              lng,
              distance: dist,
            };
          });
        }
      } catch (err) {
        console.warn('OSM Geocoding fallback active', err);
      }

      // Combine & Deduplicate Results
      const combined: Array<{
        place_name: string;
        address_name: string;
        lat?: number;
        lng?: number;
        distance?: number;
        isCustom?: boolean;
      }> = [...localMatches];

      osmMatches.forEach((osm) => {
        if (!combined.some((c) => c.place_name === osm.place_name || c.address_name === osm.address_name)) {
          combined.push(osm);
        }
      });

      // Sort all combined results by GPS distance if user location is available
      if (userLocation) {
        combined.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
      }

      // If no exact match found, provide custom place registration option
      if (combined.length === 0) {
        combined.push({
          place_name: query,
          address_name: '서울특별시 ' + query,
          isCustom: true,
        });
      }

      setResults(combined);
    } catch (err) {
      console.error('Search error:', err);
      setResults([
        {
          place_name: query,
          address_name: query,
          isCustom: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (place: any) => {
    if (selectedArenas.length >= 3) {
      alert('활동 구장은 최대 3개까지 등록할 수 있습니다.');
      return;
    }
    if (selectedArenas.some((a) => a.placeName === place.place_name)) {
      alert('이미 등록된 구장입니다.');
      return;
    }

    const newArena: Arena = {
      placeName: place.place_name,
      address: place.address_name,
      lat: place.lat,
      lng: place.lng,
    };

    const updated = [...selectedArenas, newArena];
    onChange(updated);

    // If first arena, set as primary and auto-fill region
    if (updated.length === 1) {
      onPrimaryChange(0);
      const parsed = parseKoreanAddress(newArena.address);
      if (parsed) onAddressSelect(parsed);
    }

    // Move map to added arena
    if (leafletMapRef.current && place.lat && place.lng) {
      leafletMapRef.current.setView([place.lat, place.lng], 15, { animate: true });
    }

    setKeyword('');
    setResults([]);
    setSearchTriggered(false);
  };

  const handleRemove = (idx: number) => {
    const updated = selectedArenas.filter((_, i) => i !== idx);
    onChange(updated);

    if (primaryIndex === idx) {
      if (updated.length > 0) {
        onPrimaryChange(0);
        const parsed = parseKoreanAddress(updated[0].address);
        if (parsed) onAddressSelect(parsed);
      } else {
        onPrimaryChange(-1);
      }
    } else if (primaryIndex > idx) {
      onPrimaryChange(primaryIndex - 1);
    }
  };

  const handleSetPrimary = (idx: number) => {
    onPrimaryChange(idx);
    const selectedArena = selectedArenas[idx];
    const parsed = parseKoreanAddress(selectedArena.address);
    if (parsed) {
      onAddressSelect(parsed);
    }
  };

  return (
    <div className="google-map-selector" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink-dark)' }}>
          활동 구장 등록 (최대 3개)
        </label>
        <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
          {selectedArenas.length}/3개 등록됨
        </span>
      </div>

      {/* Real Interactive Leaflet Map with GPS Floating Button */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          background: 'var(--grey-100)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          zIndex: 1,
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* GPS Re-center Floating Action Button */}
        <button
          type="button"
          onClick={handleRecenterUser}
          title="내 현재 위치로 지도 이동"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'var(--surface, #ffffff)',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--ink-dark)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 1000,
            transition: 'all 0.15s ease',
          }}
        >
          {gpsLocating ? '📡 위치 찾는 중…' : '📍 내 위치'}
        </button>

        {/* Map Click Hint Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--ink-muted)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          💡 지도를 클릭하여 원하는 위치를 직접 지정할 수도 있어요
        </div>
      </div>

      {/* Registered Arenas List */}
      {selectedArenas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>
            주요 활동 구장을 선택하면 대표 활동 지역이 자동 설정됩니다.
          </span>
          {selectedArenas.map((arena, idx) => {
            const isPrimary = idx === primaryIndex;
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: isPrimary ? '#ecfdf5' : 'var(--surface)',
                  border: isPrimary ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <input
                    type="radio"
                    name="primary_arena"
                    checked={isPrimary}
                    onChange={() => handleSetPrimary(idx)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                    id={`primary_arena_${idx}`}
                  />
                  <label
                    htmlFor={`primary_arena_${idx}`}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink-dark)' }}>
                      📍 {idx + 1}. {arena.placeName}
                      {isPrimary && (
                        <span style={{ color: 'var(--accent)', marginLeft: '6px', fontSize: '11px', fontWeight: 800 }}>
                          (★ 주요 활동 구장)
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--ink-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {arena.address}
                    </span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  style={{
                    border: 'none',
                    background: '#fee2e2',
                    color: '#ef4444',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    marginLeft: '8px',
                    flexShrink: 0,
                  }}
                >
                  삭제
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Place Search Field */}
      {selectedArenas.length < 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="구장명 또는 주소 검색 (예: 올림픽공원 테니스, 잠실종합운동장)"
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '13.5px',
                background: 'var(--surface)',
                color: 'var(--ink-dark)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch(e);
                }
              }}
            />
            <button
              type="button"
              onClick={handleSearch}
              className="btn-primary"
              style={{
                padding: '0 18px',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {loading ? '검색 중…' : '검색'}
            </button>
          </div>

          {results.length > 0 && (
            <ul
              style={{
                listStyle: 'none',
                padding: '4px 0',
                margin: '0',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                maxHeight: '200px',
                overflowY: 'auto',
                background: 'var(--surface)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                zIndex: 10,
              }}
            >
              {results.map((r, i) => (
                <li
                  key={i}
                  style={{
                    padding: '10px 14px',
                    borderBottom: i < results.length - 1 ? '1px solid var(--border-soft)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.15s ease',
                  }}
                  onClick={() => handleAdd(r)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--grey-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink-dark)' }}>
                      📍 {r.place_name}
                      {r.distance !== undefined && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#2563EB',
                            background: '#eff6ff',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            marginLeft: '6px',
                            fontWeight: 700,
                          }}
                        >
                          {formatDistance(r.distance)}
                        </span>
                      )}
                      {r.isCustom && (
                        <span style={{ fontSize: '11px', color: 'var(--accent)', marginLeft: '6px', fontWeight: 600 }}>
                          [직접 등록]
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {r.address_name}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: '#ecfdf5',
                      color: 'var(--accent)',
                      fontWeight: 700,
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      marginLeft: '8px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    + 추가
                  </button>
                </li>
              ))}
            </ul>
          )}

          {loading && (
            <p style={{ fontSize: '12px', color: 'var(--accent)', margin: '2px 0 0 0', fontWeight: 600 }}>
              🔍 구장 및 주소 정보를 검색하고 있습니다...
            </p>
          )}

          {searchTriggered && results.length === 0 && !loading && (
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '2px 0 0 0' }}>
              검색 결과가 없습니다. 구장명을 직접 입력하여 검색해 보세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
