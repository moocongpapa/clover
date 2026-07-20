import { type FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegionSelector, {
  type RegionSelection,
} from '../components/RegionSelector';
import BankAccountFields, {
  readBankAccountFromForm,
} from '../components/BankAccountFields';
import GoogleMapSelector from '../components/GoogleMapSelector';
import { api, CATEGORY_OPTIONS } from '../api';
import '../pages/Groups.css';

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
  const [primaryArenaIndex, setPrimaryArenaIndex] = useState<number>(-1);
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

    if (!region.activitySido || !region.activitySigungu) {
      setError('주요 활동 지역(시/도, 시/군/구)을 선택해 주세요.');
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

      // Reorder arenas so the primary one is at index 0
      let arenasPayload = [...selectedArenas];
      if (primaryArenaIndex >= 0 && primaryArenaIndex < arenasPayload.length) {
        const [primary] = arenasPayload.splice(primaryArenaIndex, 1);
        arenasPayload.unshift(primary);
      }

      const group = await api.createGroup({
        name: fd.get('name') as string,
        description: fd.get('description') as string,
        category,
        customSportName: category === '기타' ? customSportName : null,
        maxMembers,
        dueDay,
        officerFeeExempt,
        arenas: arenasPayload,
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

        {/* 1. Google map search arenas */}
        <div className="form-group">
          <GoogleMapSelector
            selectedArenas={selectedArenas}
            onChange={setSelectedArenas}
            primaryIndex={primaryArenaIndex}
            onPrimaryChange={setPrimaryArenaIndex}
            onAddressSelect={(parsed) => {
              setRegion({
                activitySido: parsed.activitySido,
                activitySigungu: parsed.activitySigungu,
                activityDistrict: parsed.activityDistrict,
                activityTown: parsed.activityTown
              });
            }}
          />
        </div>

        {/* Region selector is always displayed so user can customize it */}
        <div className="form-group">
          <label>주요 활동 지역 *</label>
          <RegionSelector value={region} onChange={setRegion} />
        </div>

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
            <select
              id="maxMembers"
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value, 10))}
              required
            >
              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((num) => (
                <option key={num} value={num}>
                  {num}명
                </option>
              ))}
            </select>
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
