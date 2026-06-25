import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  formatPhoneNumber,
  formatUserBirthDate,
  type User,
} from '../api';
import { useAuth } from '../context/AuthContext';
import './EditProfile.css';
import './Groups.css';

export default function EditProfile() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then((me) => {
        setProfile(me);
        setBio(me.bio ?? '');
        if (me.profileImageUrl) {
          setPreviewUrl(me.profileImageUrl);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  const handleImageChange = (file: File | null) => {
    if (imageFile && previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    if (!file) {
      setImageFile(null);
      if (!removeImage && profile?.profileImageUrl) {
        setPreviewUrl(profile.profileImageUrl);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setError('');
    try {
      let profileImageUrl: string | null | undefined = undefined;
      if (imageFile) {
        const uploaded = await api.uploadProfileImage(imageFile);
        profileImageUrl = uploaded.url;
      } else if (removeImage) {
        profileImageUrl = null;
      }

      const updated = await api.updateProfile({
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
        bio: bio.trim() || null,
      });
      updateUser(updated);
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  if (error && !profile) {
    return <p className="form-error">{error}</p>;
  }

  if (!profile) {
    return <p className="loading-text">불러오는 중…</p>;
  }

  const avatarFallback = profile.displayName[0];

  return (
    <div className="edit-profile">
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="profileImage">프로필 사진</label>
          <div className="profile-image-upload">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="profile-image-upload__preview"
              />
            ) : (
              <span className="profile-image-upload__fallback" aria-hidden>
                {avatarFallback}
              </span>
            )}
            <div className="profile-image-upload__actions">
              <label className="btn-sm btn-outline" htmlFor="profileImage">
                사진 변경
              </label>
              {(previewUrl || profile.profileImageUrl) && (
                <button
                  type="button"
                  className="btn-sm btn-ghost"
                  onClick={() => {
                    handleImageChange(null);
                    setRemoveImage(true);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  기본으로
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="profileImage"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="bio">자기소개</label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={500}
            placeholder="간단한 자기소개를 입력해 주세요"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <p className="form-hint">{bio.length}/500</p>
        </div>

        <div className="form-group">
          <label htmlFor="displayName">이름</label>
          <input
            id="displayName"
            value={profile.displayName}
            disabled
            readOnly
          />
          <p className="form-hint">카카오 계정 정보는 수정할 수 없어요</p>
        </div>

        <div className="form-group">
          <label htmlFor="birthDate">생년월일</label>
          <input
            id="birthDate"
            value={formatUserBirthDate(profile.birthDate, profile.birthYear)}
            disabled
            readOnly
          />
        </div>

        <div className="form-group">
          <label htmlFor="phoneNumber">전화번호</label>
          <input
            id="phoneNumber"
            value={
              profile.phoneNumber
                ? formatPhoneNumber(profile.phoneNumber)
                : '-'
            }
            disabled
            readOnly
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate(-1)}
          >
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
