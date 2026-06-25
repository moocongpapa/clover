import { type FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegionSelector, {
  type RegionSelection,
} from '../components/RegionSelector';
import BankAccountFields, {
  readBankAccountFromForm,
} from '../components/BankAccountFields';
import { api, CATEGORIES } from '../api';
import '../pages/Groups.css';

export default function CreateGroup() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      setError('주요 활동 지역을 선택해 주세요.');
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
        category: fd.get('category') as string,
        isPublic: fd.get('isPublic') === 'on',
        profileImageUrl,
        activitySido: region.activitySido,
        activitySigungu: region.activitySigungu,
        ...(region.activityDistrict
          ? { activityDistrict: region.activityDistrict }
          : {}),
        ...(region.activityTown ? { activityTown: region.activityTown } : {}),
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
        <div className="form-group">
          <label>주요 활동 지역 *</label>
          <RegionSelector value={region} onChange={setRegion} />
        </div>
        <div className="form-group">
          <label htmlFor="category">카테고리 *</label>
          <select id="category" name="category" required>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
