import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
    gm_authFailure: any;
  }
}

export interface Arena {
  placeName: string;
  address: string;
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

const MOCK_PLACES = [
  { placeName: '용산 아이파크몰 풋살장', address: '서울특별시 용산구 한강대로23길 55' },
  { placeName: '올림픽공원 테니스코트', address: '서울특별시 송파구 올림픽로 424' },
  { placeName: '서초종합체육관', address: '서울특별시 서초구 양재대로12길 74' },
  { placeName: '여의도공원 농구장', address: '서울특별시 영등포구 여의공원로 68' },
  { placeName: '반포종합운동장 축구장', address: '서울특별시 서초구 신반포로15길 40' },
  { placeName: '하남 스타필드 스포츠몬스터', address: '경기도 하남시 미사대로 750' },
  { placeName: '분당구미 체육공원 풋살장', address: '경기도 성남시 분당구 구미동 23' },
  { placeName: '수원종합운동장 인조잔디구장', address: '경기도 수원시 장안구 경수대로 893' },
  { placeName: '송파 탄천합수부 축구장', address: '서울특별시 송파구 잠실동 30' },
  { placeName: '일산 호수공원 농구코트', address: '경기도 고양시 일산동구 호수로 731' },
  { placeName: '부천체육관 배드민턴장', address: '경기도 부천시 원미구 석천로 293' },
  { placeName: '인천아시아드 주경기장', address: '인천광역시 서구 봉수대로 806' },
  { placeName: '대전월드컵경기장 풋살구장', address: '대전광역시 유성구 월드컵대로 32' },
  { placeName: '대구 두류공원 야구장', address: '대구광역시 달서구 공원순환로 201' },
  { placeName: '부산 삼락생태공원 테니스장', address: '부산광역시 사상구 삼락동 29-4' },
  { placeName: '광주 상무시민공원 축구장', address: '광주광역시 서구 상무공원로 101' },
  { placeName: '울산 문수축구경기장 풋살장', address: '울산광역시 남구 문수로 44' },
  { placeName: '세종시 중앙공원 체육시설', address: '세종특별자치시 중앙공원서로 60' },
  { placeName: '제주 종합경기장 애향운동장', address: '제주특별자치도 제주시 서광로2길 24' },
  { placeName: '펜타시티 풋살장', address: '경상북도 포항시 북구 흥해읍 삼도리 102' }
];

export default function GoogleMapSelector({
  selectedArenas,
  onChange,
  primaryIndex,
  onPrimaryChange,
  onAddressSelect
}: GoogleMapSelectorProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [isAuthFailure, setIsAuthFailure] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Monitor Google Maps auth failure
  useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('Google Maps Authentication failed. Switching to interactive mock map.');
      setIsAuthFailure(true);
    };
    return () => {
      delete (window as any).gm_authFailure;
    };
  }, []);

  // Dynamically load Google Maps script
  useEffect(() => {
    const loadScript = () => {
      if (window.google && window.google.maps) {
        setGoogleMapsLoaded(true);
        return;
      }

      const scriptId = 'google-maps-api-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        const keyParam = apiKey ? `&key=${apiKey}` : '';
        script.src = `https://maps.googleapis.com/maps/api/js?libraries=places&language=ko&region=KR${keyParam}`;
        script.async = true;
        script.defer = true;
        script.onload = () => setGoogleMapsLoaded(true);
        script.onerror = () => {
          console.warn('Failed to load Google Maps script. Using fallback.');
          setIsAuthFailure(true);
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', () => setGoogleMapsLoaded(true));
      }
    };

    loadScript();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!googleMapsLoaded || isAuthFailure || !mapContainerRef.current) return;

    try {
      const defaultCenter = { lat: 37.5665, lng: 126.9780 }; // Seoul City Hall
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false
      });

      mapRef.current = map;

      // Click listener on map to drop custom pin and geocode
      map.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            const placeName = '선택한 지도 위치';
            
            // Add a mock search result representing clicked point
            const clickedPlace = {
              place_name: placeName,
              address_name: address,
              geometry: { location: { lat: () => lat, lng: () => lng } }
            };
            setResults([clickedPlace]);
            setKeyword('');
            setSearchTriggered(true);

            // Parse and notify Sido/Sigungu/Eupmyeondong immediately
            const parsed = parseKoreanAddress(address);
            if (parsed) {
              onAddressSelect(parsed);
            }
          }
        });
      });
    } catch (err) {
      console.warn('Error initializing Google Map, falling back to mock map.', err);
      setIsAuthFailure(true);
    }
  }, [googleMapsLoaded, isAuthFailure]);

  // Update map markers when selectedArenas change (Real Google Maps)
  useEffect(() => {
    if (!mapRef.current || !window.google || isAuthFailure) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    const geocoder = new window.google.maps.Geocoder();

    selectedArenas.forEach((arena, idx) => {
      geocoder.geocode({ address: arena.address }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const marker = new window.google.maps.Marker({
            position: location,
            map: mapRef.current,
            label: `${idx + 1}`,
            title: arena.placeName
          });

          markersRef.current.push(marker);
          bounds.extend(location);
          mapRef.current.fitBounds(bounds);
          if (mapRef.current.getZoom() > 16) {
            mapRef.current.setZoom(16);
          }
        }
      });
    });
  }, [selectedArenas, isAuthFailure]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setSearchTriggered(true);

    if (googleMapsLoaded && !isAuthFailure && window.google && window.google.maps) {
      try {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: keyword, types: ['establishment', 'geocode'], componentRestrictions: { country: 'kr' } },
          (predictions: any, status: any) => {
            setLoading(false);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              const formattedResults = predictions.map((p: any) => ({
                place_name: p.structured_formatting.main_text,
                address_name: p.structured_formatting.secondary_text || '',
                place_id: p.place_id
              }));
              setResults(formattedResults);
            } else {
              setResults([]);
            }
          }
        );
      } catch (err) {
        setLoading(false);
        setResults([]);
        console.error(err);
      }
    } else {
      // Mock Search Fallback
      setTimeout(() => {
        setLoading(false);
        const filtered = MOCK_PLACES.filter(
          p => p.placeName.includes(keyword) || p.address.includes(keyword)
        );
        const formatted = filtered.map(p => ({
          place_name: p.placeName,
          address_name: p.address
        }));

        // If no results, offer to add custom place
        if (formatted.length === 0) {
          formatted.push({
            place_name: keyword,
            address_name: '서울특별시 종로구 혜화동 123'
          });
        }
        setResults(formatted);
      }, 300);
    }
  };

  const handleAdd = (place: any) => {
    if (selectedArenas.length >= 3) {
      alert('활동 구장은 최대 3개까지 등록할 수 있습니다.');
      return;
    }
    if (selectedArenas.some(a => a.placeName === place.place_name)) return;

    if (place.place_id && window.google) {
      // Fetch exact address and geometry for Google Places result
      const mapDiv = document.createElement('div');
      const service = new window.google.maps.places.PlacesService(mapDiv);
      service.getDetails({ placeId: place.place_id }, (details: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
          const cleanAddress = details.formatted_address || place.address_name;
          const newArena = {
            placeName: place.place_name,
            address: cleanAddress.replace('대한민국 ', '')
          };
          const updated = [...selectedArenas, newArena];
          onChange(updated);

          // If this is the first registered arena, automatically set as primary and notify parent
          if (updated.length === 1) {
            onPrimaryChange(0);
            const parsed = parseKoreanAddress(newArena.address);
            if (parsed) onAddressSelect(parsed);
          }

          // Center map on this location
          if (mapRef.current && details.geometry && details.geometry.location) {
            mapRef.current.setCenter(details.geometry.location);
            mapRef.current.setZoom(16);
          }
        }
      });
    } else {
      const newArena = {
        placeName: place.place_name,
        address: place.address_name
      };
      const updated = [...selectedArenas, newArena];
      onChange(updated);

      // If this is the first registered arena, automatically set as primary and notify parent
      if (updated.length === 1) {
        onPrimaryChange(0);
        const parsed = parseKoreanAddress(newArena.address);
        if (parsed) onAddressSelect(parsed);
      }
    }

    setKeyword('');
    setResults([]);
    setSearchTriggered(false);
  };

  const handleRemove = (idx: number) => {
    const updated = selectedArenas.filter((_, i) => i !== idx);
    onChange(updated);

    if (primaryIndex === idx) {
      // Reset primary index
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
      <label style={{ fontWeight: 700, fontSize: '14px' }}>활동 구장 등록 (최대 3개)</label>

      {/* Real Map or Mock Map View */}
      <div 
        style={{ 
          position: 'relative',
          width: '100%', 
          height: '220px', 
          background: 'var(--grey-100)', 
          border: '1px solid var(--border)', 
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {!isAuthFailure ? (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          /* Mock Interactive Map Visualization */
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              padding: '20px',
              textAlign: 'center',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</span>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>
              구글 지도 서비스 (개발 모드 시뮬레이터)
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--ink-muted)' }}>
              원하는 구장을 검색하여 추가하면 주요 활동 지역 정보가 자동으로 매핑됩니다.
            </p>
            {/* Visual Markers inside mock map */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {selectedArenas.map((arena, i) => (
                <span 
                  key={i} 
                  style={{ 
                    background: i === primaryIndex ? 'var(--blue-500)' : 'var(--grey-500)', 
                    color: 'white', 
                    padding: '4px 8px', 
                    borderRadius: '20px', 
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  📍 {i + 1}. {arena.placeName} {i === primaryIndex && '(주요)'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Arenas List with Primary Region Selector */}
      {selectedArenas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>
            등록된 구장 중 모임의 주요 활동 구장(지역 기준)을 하나 선택해 주세요.
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
                  background: isPrimary ? 'var(--blue-50)' : 'var(--surface)', 
                  border: isPrimary ? '2px solid var(--blue-500)' : '1px solid var(--border)', 
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <input
                    type="radio"
                    name="primary_arena"
                    checked={isPrimary}
                    onChange={() => handleSetPrimary(idx)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    id={`primary_arena_${idx}`}
                  />
                  <label htmlFor={`primary_arena_${idx}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>
                      {arena.placeName} {isPrimary && <span style={{ color: 'var(--blue-500)', marginLeft: '4px', fontSize: '11px' }}>(★ 주요 활동 지역)</span>}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{arena.address}</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  style={{ 
                    border: 'none', 
                    background: 'none', 
                    color: 'var(--red-500)', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  제거
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Place Search Field */}
      {selectedArenas.length < 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="구장명 또는 주소 검색 (예: 올림픽공원 테니스)"
              style={{ 
                flex: 1, 
                padding: '10px 14px', 
                border: '1px solid var(--border)', 
                borderRadius: '10px', 
                fontSize: '13px' 
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
            />
            <button 
              type="button" 
              onClick={handleSearch} 
              className="btn-outline" 
              style={{ padding: '0 16px', borderRadius: '10px', fontSize: '13px' }}
            >
              검색
            </button>
          </div>

          {results.length > 0 && (
            <ul 
              style={{ 
                listStyle: 'none', 
                padding: '0', 
                margin: '4px 0 0 0', 
                border: '1px solid var(--border)', 
                borderRadius: '10px', 
                maxHeight: '160px', 
                overflowY: 'auto', 
                background: 'var(--surface)', 
                zIndex: 10,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}
            >
              {results.map((r, i) => (
                <li 
                  key={i} 
                  style={{ 
                    padding: '8px 12px', 
                    borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', 
                    cursor: 'pointer' 
                  }} 
                  onClick={() => handleAdd(r)}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{r.place_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{r.address_name}</div>
                </li>
              ))}
            </ul>
          )}
          {loading && <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>검색 중…</p>}
          {searchTriggered && results.length === 0 && !loading && (
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>검색 결과가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
