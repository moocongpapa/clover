import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';

export interface PlaceResult {
  id: string;
  placeName: string;
  address: string;
  category?: string;
  phone?: string;
  url?: string;
  lat?: number;
  lng?: number;
}

interface PlaceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (placeText: string, raw?: PlaceResult) => void;
  initialKeyword?: string;
}

const QUICK_SEARCH_CHIPS = ['풋살장', '축구장', '체육관', '배드민턴', '테니스장', '볼링장', '공원', '카페'];

export default function PlaceSearchModal({
  isOpen,
  onClose,
  onSelectPlace,
  initialKeyword = '',
}: PlaceSearchModalProps) {
  const [tab, setTab] = useState<'search' | 'map'>('search');
  const [keyword, setKeyword] = useState(initialKeyword);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Map Picker State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapSelectedCoords, setMapSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapAddress, setMapAddress] = useState('');
  const [mapPlaceName, setMapPlaceName] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Initialize or resize Leaflet Map when Tab switches to 'map'
  useEffect(() => {
    if (!isOpen || tab !== 'map') return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const defaultCenter: [number, number] = [37.5665, 126.978]; // Seoul
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 14,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        const customMarkerIcon = L.divIcon({
          className: 'clover-map-picker-pin',
          html: `
            <div style="
              width: 34px;
              height: 34px;
              background: #10B981;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              font-size: 16px;
              transform: translate(-50%, -50%);
            ">
              📍
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        // Map Click Handler
        map.on('click', async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setMapSelectedCoords({ lat, lng });

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { icon: customMarkerIcon }).addTo(map);
          }

          setReverseGeocoding(true);
          try {
            const geo = await api.reverseGeocode(lat, lng);
            if (geo && geo.address) {
              setMapAddress(geo.address);
              if (geo.buildingName) {
                setMapPlaceName(geo.buildingName);
              } else if (!mapPlaceName) {
                setMapPlaceName('지도에서 찍은 장소');
              }
            } else {
              setMapAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
          } catch (err) {
            setMapAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          } finally {
            setReverseGeocoding(false);
          }
        });

        mapInstanceRef.current = map;

        // Try getting current GPS location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              map.setView([latitude, longitude], 15);
            },
            () => {},
            { timeout: 5000 }
          );
        }
      } else {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const handleSearch = async (queryToSearch?: string) => {
    const q = (queryToSearch ?? keyword).trim();
    if (!q) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const list = await api.searchPlaces(q);
      setResults(list || []);
    } catch (err) {
      console.error('Failed to search places', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearchResult = (item: PlaceResult) => {
    const formatted = item.address
      ? `${item.placeName} (${item.address})`
      : item.placeName;
    onSelectPlace(formatted, item);
    onClose();
  };

  const handleConfirmMapSelection = () => {
    if (!mapAddress) return;
    const name = mapPlaceName.trim() || '지도에서 선택한 위치';
    const formatted = `${name} (${mapAddress})`;
    onSelectPlace(formatted, {
      id: `map-${Date.now()}`,
      placeName: name,
      address: mapAddress,
      lat: mapSelectedCoords?.lat,
      lng: mapSelectedCoords?.lng,
    });
    onClose();
  };

  const handleGpsCurrentLocation = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          mapInstanceRef.current?.setView([latitude, longitude], 16, { animate: true });
        },
        () => {
          alert('현재 위치 정보를 가져올 수 없습니다.');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '88vh',
          background: 'var(--surface, #ffffff)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '20px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--ink-dark)' }}>
              모임 장소 설정
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--grey-100, #f1f5f9)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switch: Search vs Map Picker */}
        <div
          style={{
            display: 'flex',
            background: 'var(--grey-100, #f1f5f9)',
            borderRadius: '12px',
            padding: '3px',
            gap: '3px',
          }}
        >
          <button
            type="button"
            onClick={() => setTab('search')}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: '10px',
              background: tab === 'search' ? '#ffffff' : 'transparent',
              color: tab === 'search' ? 'var(--ink-dark)' : 'var(--ink-muted)',
              fontWeight: tab === 'search' ? '800' : '600',
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: tab === 'search' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🔍 카카오 장소 검색
          </button>
          <button
            type="button"
            onClick={() => setTab('map')}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: '10px',
              background: tab === 'map' ? '#ffffff' : 'transparent',
              color: tab === 'map' ? 'var(--accent, #10b981)' : 'var(--ink-muted)',
              fontWeight: tab === 'map' ? '800' : '600',
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: tab === 'map' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🗺️ 지도에서 직접 찍기
          </button>
        </div>

        {/* TAB 1: Search */}
        {tab === 'search' && (
          <>
            {/* Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              style={{ display: 'flex', gap: '8px' }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="장소명 또는 주소 검색 (예: 펜타시티, 잠실)"
                  autoFocus
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 36px 0 14px',
                    background: 'var(--grey-50, #f8fafc)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '14.5px',
                    fontWeight: '600',
                    color: 'var(--ink-dark)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => setKeyword('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink-muted)',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0 16px',
                  height: '46px',
                  background: 'var(--accent, #10b981)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {loading ? '검색중…' : '검색'}
              </button>
            </form>

            {/* Quick Search Chips */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {QUICK_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setKeyword(chip);
                    handleSearch(chip);
                  }}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--grey-100, #f1f5f9)',
                    border: '1px solid var(--border)',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '44vh',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '2px',
              }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--ink-muted)', fontSize: '14px' }}>
                  카카오 지도에서 장소를 찾는 중… 🔍
                </div>
              ) : results.length > 0 ? (
                results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--surface, #ffffff)',
                      border: '1px solid var(--border)',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ink-dark)' }}>
                        {item.placeName}
                      </span>
                      {item.category && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--ink-muted)',
                            background: 'var(--grey-100)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.category.split(' > ').pop()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                      📍 {item.address}
                    </div>
                    {item.phone && (
                      <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                        📞 {item.phone}
                      </div>
                    )}
                  </div>
                ))
              ) : hasSearched ? (
                <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--ink-muted)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '14px' }}>
                    검색 결과에 원하는 곳이 없나요?
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('map')}
                    style={{
                      padding: '9px 18px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1.5px solid var(--accent, #10b981)',
                      borderRadius: '10px',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      color: 'var(--accent, #10b981)',
                      cursor: 'pointer',
                    }}
                  >
                    🗺️ 지도에서 직접 위치 찍어서 등록하기
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--ink-muted)', fontSize: '13px' }}>
                  <p style={{ margin: '0 0 12px' }}>구장명이나 주소를 입력해 검색하거나,</p>
                  <button
                    type="button"
                    onClick={() => setTab('map')}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--grey-100)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--ink-dark)',
                      cursor: 'pointer',
                    }}
                  >
                    🗺️ 지도에서 직접 위치 찍기
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: Map Picker */}
        {tab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Map Container */}
            <div style={{ position: 'relative', width: '100%', height: '260px', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

              {/* GPS Button */}
              <button
                type="button"
                onClick={handleGpsCurrentLocation}
                title="내 위치로 이동"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  zIndex: 1000,
                  width: '38px',
                  height: '38px',
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                🎯
              </button>

              {/* Helper badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  zIndex: 1000,
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  pointerEvents: 'none',
                }}
              >
                지도를 클릭하여 핀을 꽂아주세요 📍
              </div>
            </div>

            {/* Selected Location Card */}
            {mapSelectedCoords ? (
              <div
                style={{
                  background: 'var(--grey-50, #f8fafc)',
                  border: '1.5px solid var(--accent, #10b981)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--accent, #10b981)' }}>
                    선택된 위치
                  </span>
                  {reverseGeocoding && (
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>주소 조회 중…</span>
                  )}
                </div>

                {/* Editable Place Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '3px' }}>
                    장소명 (직접 수정 가능)
                  </label>
                  <input
                    type="text"
                    value={mapPlaceName}
                    onChange={(e) => setMapPlaceName(e.target.value)}
                    placeholder="예: 펜타시티 야외 풋살장, 공원 잔디마당"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      color: 'var(--ink-dark)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  📍 {mapAddress || '지도를 클릭해 주소를 불러옵니다'}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmMapSelection}
                  disabled={!mapAddress}
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'var(--accent, #10b981)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    marginTop: '2px',
                  }}
                >
                  이 위치로 선택 완료 ✓
                </button>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'var(--grey-50, #f8fafc)',
                  border: '1px dashed var(--border)',
                  borderRadius: '12px',
                  color: 'var(--ink-muted)',
                  fontSize: '13px',
                }}
              >
                지도를 움직여 원하는 위치를 클릭해 보세요! 📌
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
