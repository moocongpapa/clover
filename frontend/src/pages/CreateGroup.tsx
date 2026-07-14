import { type FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegionSelector, {
  type RegionSelection,
} from '../components/RegionSelector';
import BankAccountFields, {
  readBankAccountFromForm,
} from '../components/BankAccountFields';
import { api, CATEGORY_OPTIONS } from '../api';
import '../pages/Groups.css';

function ArenaSearchSelector({
  selectedArenas,
  onChange,
}: {
  selectedArenas: { placeName: string; address: string }[];
  onChange: (arenas: { placeName: string; address: string }[]) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert('지도 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(keyword, (data: any, status: any) => {
        setLoading(false);
        if (status === window.kakao.maps.services.Status.OK) {
          setResults(data);
        } else {
          setResults([]);
        }
      });
    } catch (err) {
      setLoading(false);
      setResults([]);
      console.error(err);
    }
  };

  const handleAdd = (place: any) => {
    if (selectedArenas.length >= 3) {
      alert('활동 구장은 최대 3개까지 등록할 수 있습니다.');
      return;
    }
    if (selectedArenas.some((a) => a.placeName === place.place_name)) return;

    onChange([...selectedArenas, { placeName: place.place_name, address: place.address_name }]);
    setKeyword('');
    setResults([]);
  };

  const handleRemove = (idx: number) => {
    onChange(selectedArenas.filter((_, i) => i !== idx));
  };

  return (
    <div className="arena-search-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label>활동 구장 등록 (최대 3개)</label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {selectedArenas.map((arena, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--grey-50)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{idx + 1}. {arena.placeName}</span>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--ink-muted)' }}>{arena.address}</p>
            </div>
            <button
              type="button"
              className="btn-sm btn-ghost"
              onClick={() => handleRemove(idx)}
              style={{ color: 'var(--red-500)', fontWeight: 700 }}
            >
              제거
            </button>
          </div>
        ))}
      </div>

      {selectedArenas.length < 3 && (
        <>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="구장명 또는 주소 검색 (예: 펜타시티 풋살)"
              style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}
            />
            <button type="button" onClick={handleSearch} className="btn-outline" style={{ padding: '0 16px', borderRadius: '10px', fontSize: '13px' }}>
              검색
            </button>
          </div>

          {results.length > 0 && (
            <ul style={{ listStyle: 'none', padding: '0', margin: '4px 0 0 0', border: '1px solid var(--border)', borderRadius: '10px', maxHeight: '160px', overflowY: 'auto', background: 'var(--surface)', zIndex: 10 }}>
              {results.map((r, i) => (
                <li key={i} style={{ padding: '8px 12px', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => handleAdd(r)}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{r.place_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{r.address_name}</div>
                </li>
              ))}
            </ul>
          )}
          {loading && <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>검색 중…</p>}
        </>
      )}
    </div>
  );
}

export default function CreateGroup() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState('풋살/축구');
  const [customSportName, setCustomSportName] = useState('');
  const [selectedArenas, setSelectedArenas] = useState<{ placeName: string; address: string }[]>([]);
  const [maxMembers, setMaxMembers] = useState(50);
  const [dueDay, setDueDay] = useState<number | undefined>(undefined);
  const [officerFeeExempt, setOfficerFeeExempt] = useState(false);

  const [region, setRegion] = useState<RegionSelection>({
    activitySido: '',
    activitySigungu: '',
    activityDistrict: '',
    activityTown: '',
  });

  const handleImageChange = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setImageFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있습니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지는 5MB 이하만 업로드할 수 있습니다.');
      return;
    }
    setError('');
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    handleImageChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // If they did not register any arenas, they must select region manually
    if (selectedArenas.length === 0 && (!region.activitySido || !region.activitySigungu)) {
      setError('활동 구장을 등록하지 않으려면 주요 활동 지역을 직접 선택해 주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let profileImageUrl: string | undefined;
      if (imageFile) {
        const uploaded = await api.uploadGroupImage(imageFile);
        profileImageUrl = uploaded.url;
      }

      const group = await api.createGroup({
        name: fd.get('name') as string,
        description: fd.get('description') as string,
        category,
        customSportName: category === '기타' ? customSportName : null,
        maxMembers,
        dueDay,
        officerFeeExempt,
        arenas: selectedArenas,
        isPublic: fd.get('isPublic') === 'on',
        profileImageUrl,
        activitySido: region.activitySido || '',
        activitySigungu: region.activitySigungu || '',
        activityDistrict: region.activityDistrict || undefined,
        activityTown: region.activityTown || undefined,
        ...readBankAccountFromForm(fd),
      });
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">모임 이름 *</label>
          <input id="name" name="name" required />
        </div>
        <div className="form-group">
          <label htmlFor="description">소개 *</label>
          <textarea id="description" name="description" required />
        </div>

        {/* 1. Kakao map search arenas */}
        <div className="form-group">
          <ArenaSearchSelector
            selectedArenas={selectedArenas}
            onChange={setSelectedArenas}
          />
        </div>

        {/* Region selector is only required if no arenas are set */}
        {selectedArenas.length === 0 && (
          <div className="form-group">
            <label>주요 활동 지역 *</label>
            <RegionSelector value={region} onChange={setRegion} />
          </div>
        )}

        {/* 2. Sport category selectors */}
        <div className="form-row form-row--double">
          <div className="form-group">
            <label htmlFor="category">카테고리 *</label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.value}
                </option>
              ))}
            </select>
          </div>

          {category === '기타' && (
            <div className="form-group">
              <label htmlFor="customSportName">스포츠명 직접 입력 *</label>
              <input
                id="customSportName"
                value={customSportName}
                onChange={(e) => setCustomSportName(e.target.value)}
                placeholder="예: 클라이밍, 서핑 등"
                required
              />
            </div>
          )}
        </div>

        {/* 3. Fee settings and limits */}
        <div className="form-row form-row--double">
          <div className="form-group">
            <label htmlFor="maxMembers">최대 정원 (명)</label>
            <input
              id="maxMembers"
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value, 10))}
              min={2}
              max={100}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dueDay">매월 회비 마감일 (일)</label>
            <select
              id="dueDay"
              value={dueDay || ''}
              onChange={(e) => setDueDay(e.target.value ? parseInt(e.target.value, 10) : undefined)}
            >
              <option value="">미설정</option>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}일
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group checkbox-row">
          <input
            id="officerFeeExempt"
            type="checkbox"
            checked={officerFeeExempt}
            onChange={(e) => setOfficerFeeExempt(e.target.checked)}
          />
          <label htmlFor="officerFeeExempt">운영진 회비 면제 적용</label>
        </div>

        <div className="form-group">
          <label htmlFor="profileImage">대표 이미지</label>
          <div className="image-upload">
            {previewUrl ? (
              <div className="image-upload__preview">
                <img src={previewUrl} alt="대표 이미지 미리보기" />
                <button
                  type="button"
                  className="btn-sm btn-ghost"
                  onClick={clearImage}
                >
                  제거
                </button>
              </div>
            ) : (
              <label className="image-upload__picker" htmlFor="profileImage">
                <span className="image-upload__icon">+</span>
                <span>이미지 선택</span>
                <span className="image-upload__hint">JPEG, PNG, WebP, GIF · 최대 5MB</span>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="profileImage"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="image-upload__input"
              onChange={(e) =>
                handleImageChange(e.target.files?.[0] ?? null)
              }
            />
          </div>
        </div>

        <div className="form-group checkbox-row">
          <input id="isPublic" name="isPublic" type="checkbox" defaultChecked />
          <label htmlFor="isPublic">검색·목록에 공개</label>
        </div>

        <BankAccountFields />

        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '생성 중…' : '모임 만들기'}
        </button>
      </form>
    </div>
  );
}
