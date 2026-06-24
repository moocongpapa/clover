import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, CATEGORIES, type GroupDetail } from '../api';
import '../pages/Groups.css';

export default function EditGroup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getGroup(id)
      .then((g) => {
        const role = g.myMembership?.role;
        const approved = g.myMembership?.status === 'APPROVED';
        const canEdit =
          approved && (role === 'PRESIDENT' || role === 'OFFICER');
        if (!canEdit) {
          setError('모임 프로필을 수정할 권한이 없습니다.');
          return;
        }
        setGroup(g);
        if (g.profileImageUrl) {
          setPreviewUrl(g.profileImageUrl);
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const handleImageChange = (file: File | null) => {
    if (imageFile && previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    if (!file) {
      setImageFile(null);
      if (!removeImage && group?.profileImageUrl) {
        setPreviewUrl(group.profileImageUrl);
      } else {
        setPreviewUrl(null);
      }
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
    setRemoveImage(false);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imageFile && previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !group) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    try {
      let profileImageUrl: string | null | undefined = undefined;

      if (imageFile) {
        const uploaded = await api.uploadGroupImage(imageFile);
        profileImageUrl = uploaded.url;
      } else if (removeImage) {
        profileImageUrl = null;
      }

      await api.updateGroup(id, {
        name: fd.get('name') as string,
        description: fd.get('description') as string,
        category: fd.get('category') as string,
        isPublic: fd.get('isPublic') === 'on',
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
      });
      navigate(`/groups/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패');
    } finally {
      setLoading(false);
    }
  };

  if (error && !group) {
    return (
      <div>
        <p className="form-error">{error}</p>
        {id && (
          <Link to={`/groups/${id}`} className="link-text">
            모임으로 돌아가기
          </Link>
        )}
      </div>
    );
  }

  if (!group) return <p className="loading-text">불러오는 중…</p>;

  return (
    <div>
      <p className="breadcrumb">
        <Link to={`/groups/${group.id}`}>{group.name}</Link>
      </p>
      <div className="page-header">
        <h1>모임 프로필 수정</h1>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">모임 이름 *</label>
          <input
            id="name"
            name="name"
            defaultValue={group.name}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">소개 *</label>
          <textarea
            id="description"
            name="description"
            defaultValue={group.description}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">카테고리 *</label>
          <select
            id="category"
            name="category"
            defaultValue={group.category}
            required
          >
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
                <div className="image-upload__preview-actions">
                  <label className="btn-sm btn-outline" htmlFor="profileImage">
                    변경
                  </label>
                  <button
                    type="button"
                    className="btn-sm btn-ghost"
                    onClick={clearImage}
                  >
                    제거
                  </button>
                </div>
              </div>
            ) : (
              <label className="image-upload__picker" htmlFor="profileImage">
                <span className="image-upload__icon">+</span>
                <span>이미지 선택</span>
                <span className="image-upload__hint">
                  JPEG, PNG, WebP, GIF · 최대 5MB
                </span>
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
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            defaultChecked={group.isPublic}
          />
          <label htmlFor="isPublic">검색·목록에 공개</label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions-row">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '저장 중…' : '저장하기'}
          </button>
          <Link to={`/groups/${group.id}`} className="btn-ghost">
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
