import { useState } from 'react';
import { api } from '../api';

export interface PlaceResult {
  id: string;
  placeName: string;
  address: string;
  category?: string;
  phone?: string;
  url?: string;
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
  const [keyword, setKeyword] = useState(initialKeyword);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleSelect = (item: PlaceResult) => {
    const formatted = item.address
      ? `${item.placeName} (${item.address})`
      : item.placeName;
    onSelectPlace(formatted, item);
    onClose();
  };

  const handleUseCustomText = () => {
    if (keyword.trim()) {
      onSelectPlace(keyword.trim());
      onClose();
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
          maxHeight: '85vh',
          background: 'var(--surface, #ffffff)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '20px 16px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--ink-dark)' }}>
              모임 장소 검색 (카카오 지도)
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
              placeholder="장소명 또는 주소 검색 (예: 펜타시티, 잠실운동장)"
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
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
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
            maxHeight: '46vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '4px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-muted)', fontSize: '14px' }}>
              카카오 지도에서 장소를 찾는 중… 🔍
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
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
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-muted)' }}>
              <p style={{ margin: '0 0 10px', fontSize: '14px' }}>
                검색 결과가 없습니다.
              </p>
              {keyword && (
                <button
                  type="button"
                  onClick={handleUseCustomText}
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
                  입력한 <strong>"{keyword}"</strong> 그대로 사용하기
                </button>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--ink-muted)', fontSize: '13.5px' }}>
              구장명, 체육관명, 또는 도로명 주소를 입력해 검색해 보세요! 🏟️
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
