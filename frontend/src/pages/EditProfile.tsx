import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type User } from '../api';
import { useAuth } from '../context/AuthContext';
import './EditProfile.css';
import './Groups.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

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

  const [displayNameVal, setDisplayNameVal] = useState('');

  // Profile data states
  const [birthYearVal, setBirthYearVal] = useState<number | ''>('');
  const [birthMonthVal, setBirthMonthVal] = useState<number | ''>('');
  const [birthDayVal, setBirthDayVal] = useState<number | ''>('');
  const [phoneNumberVal, setPhoneNumberVal] = useState('');
  const [genderVal, setGenderVal] = useState<'MALE' | 'FEMALE' | ''>('');
  const [isEarlyYearVal, setIsEarlyYearVal] = useState(false);

  // Picker modal states
  const [isBirthPickerOpen, setIsBirthPickerOpen] = useState(false);
  const [isGenderPickerOpen, setIsGenderPickerOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  // Temporary modal states
  const [tempYear, setTempYear] = useState<number | ''>('');
  const [tempMonth, setTempMonth] = useState<number | ''>('');
  const [tempDay, setTempDay] = useState<number | ''>('');
  const [tempLunar, setTempLunar] = useState(false);
  const [tempEarly, setTempEarly] = useState(false);
  const [tempPhone, setTempPhone] = useState('');

  const loadData = () => {
    api
      .getMe()
      .then((me) => {
        setProfile(me);
        setDisplayNameVal(me.displayName || '');
        setBio(me.bio ?? '');
        if (me.profileImageUrl) {
          setPreviewUrl(me.profileImageUrl);
        }
        setBirthYearVal(me.birthYear ?? '');
        setPhoneNumberVal(me.phoneNumber ?? '');
        setGenderVal(me.gender ?? '');
        setIsEarlyYearVal(me.isEarlyYear ?? false);

        // Parse birthDate
        if (me.birthDate) {
          const bDate = new Date(me.birthDate);
          setBirthMonthVal(bDate.getMonth() + 1);
          setBirthDayVal(bDate.getDate());
        }
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadData();
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

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
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

      // Construct birthDate
      let constructedBirthDate: string | null = null;
      if (birthYearVal && birthMonthVal && birthDayVal) {
        constructedBirthDate = new Date(
          Number(birthYearVal),
          Number(birthMonthVal) - 1,
          Number(birthDayVal),
          12, 0, 0 // Safe midday
        ).toISOString();
      }

      const updated = await api.updateProfile({
        displayName: displayNameVal.trim(),
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
        bio: bio.trim() || null,
        birthYear: birthYearVal ? Number(birthYearVal) : null,
        birthDate: constructedBirthDate,
        isEarlyYear: isEarlyYearVal,
        phoneNumber: phoneNumberVal.trim() || null,
        gender: genderVal || null,
      });
      updateUser(updated);
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  // Open birthday picker bottom sheet
  const openBirthPicker = () => {
    setTempYear(birthYearVal || 1991);
    setTempMonth(birthMonthVal || 10);
    setTempDay(birthDayVal || 4);
    setTempEarly(isEarlyYearVal);
    setIsBirthPickerOpen(true);
  };

  // Apply birthday selection
  const handleApplyBirth = () => {
    setBirthYearVal(tempYear);
    setBirthMonthVal(tempMonth);
    setBirthDayVal(tempDay);
    setIsEarlyYearVal(tempEarly);
    setIsBirthPickerOpen(false);
  };

  // Format date display
  const formatBirthDisplay = () => {
    if (birthYearVal && birthMonthVal && birthDayVal) {
      return `${isEarlyYearVal ? '빠른 ' : ''}${birthYearVal}년 ${birthMonthVal}월 ${birthDayVal}일`;
    }
    if (birthYearVal) {
      return `${isEarlyYearVal ? '빠른 ' : ''}${birthYearVal}년`;
    }
    return '선택 안 함';
  };

  // Open phone verification modal
  const openPhoneModal = () => {
    setTempPhone(phoneNumberVal || '+82 ');
    setIsPhoneModalOpen(true);
  };

  // Numeric keypad click handler
  const handleKeypadPress = (val: string) => {
    if (val === 'back') {
      setTempPhone((prev) => {
        // Prevent deleting prefix "+82 "
        if (prev === '+82 ') return prev;
        if (prev.endsWith(' ')) return prev.slice(0, -1);
        return prev.slice(0, -1);
      });
    } else {
      setTempPhone((prev) => {
        const cleaned = prev.replace(/\D/g, '');
        if (cleaned.length >= 15) return prev; // Limit length
        
        // Add spacing for mobile readability
        const raw = prev + val;
        // Strip out non-digits to format
        const digits = raw.replace(/\D/g, '').slice(2); // remove 82
        if (digits.length === 3) return prev + val + ' ';
        if (digits.length === 7) return prev + val + ' ';
        return prev + val;
      });
    }
  };

  const handleApplyPhone = () => {
    setPhoneNumberVal(tempPhone);
    setIsPhoneModalOpen(false);
  };

  if (error && !profile) {
    return <p className="form-error">{error}</p>;
  }

  if (!profile) {
    return <p className="loading-text">불러오는 중…</p>;
  }

  const avatarFallback = profile.displayName[0];

  return (
    <div className="edit-profile-page">
      {/* Native Band-style Header */}
      <div className="edit-profile-header">
        <div className="header-left" onClick={() => navigate(-1)}>
          <span className="back-arrow">〈</span>
          <span className="header-title">내 프로필</span>
        </div>
        <button type="button" className="confirm-btn" onClick={() => handleSubmit()} disabled={loading}>
          {loading ? '저장 중…' : '확인'}
        </button>
      </div>

      <form className="edit-profile-body" onSubmit={(e) => e.preventDefault()}>
        {/* Section 2: 내 정보 */}
        <div className="profile-section-title">내 정보</div>
        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="displayName" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--grey-600)' }}>이름 (닉네임) *</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              value={displayNameVal}
              onChange={(e) => setDisplayNameVal(e.target.value)}
              placeholder="이름을 입력해 주세요"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-soft)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                marginTop: '4px'
              }}
            />
          </div>
        </div>
        <div className="info-list-container">
          {/* 생일 */}
          <div className="info-list-item" onClick={openBirthPicker}>
            <div className="info-item-label">생일</div>
            <div className="info-item-value-wrap">
              <span className="info-item-value">{formatBirthDisplay()}</span>
              <span className="chevron">〉</span>
            </div>
          </div>

          {/* 성별 */}
          <div className="info-list-item" onClick={() => setIsGenderPickerOpen(true)}>
            <div className="info-item-label">성별</div>
            <div className="info-item-value-wrap">
              <span className="info-item-value">
                {genderVal === 'MALE' ? '남성' : genderVal === 'FEMALE' ? '여성' : '선택 안 함'}
              </span>
              <span className="chevron">〉</span>
            </div>
          </div>

          {/* 휴대폰 번호 */}
          <div className="info-list-item" onClick={openPhoneModal}>
            <div className="info-item-label">휴대폰 번호</div>
            <div className="info-item-value-wrap">
              <span className="info-item-value">
                {phoneNumberVal ? phoneNumberVal : '등록되지 않음'}
              </span>
              <span className="chevron">〉</span>
            </div>
          </div>

        </div>

        {/* Global User Photo and Bio Settings */}
        <div className="profile-section-title">기본 상세 정보</div>
        <div className="global-profile-editor-card">
          <div className="profile-pic-center-wrap">
            <div className="profile-pic-container">
              <label htmlFor="profileImage" className="profile-pic-avatar-wrap">
                {previewUrl ? (
                  <img src={previewUrl} alt="" className="profile-pic-img" />
                ) : (
                  <span className="profile-pic-fallback">{avatarFallback}</span>
                )}
                <div className="profile-camera-badge">📷</div>
              </label>
              <input
                ref={fileInputRef}
                id="profileImage"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
            </div>
            {(previewUrl || profile.profileImageUrl) && (
              <button
                type="button"
                className="profile-reset-image-btn"
                onClick={() => {
                  handleImageChange(null);
                  setRemoveImage(true);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                기본 이미지로 변경
              </button>
            )}
          </div>

          <div className="profile-bio-container form-group">
            <label htmlFor="bio">자기소개</label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              maxLength={500}
              placeholder="간단한 자기소개를 입력해 주세요"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="form-hint">{bio.length}/500</p>
          </div>
        </div>

        {/* Save button row at the bottom right */}
        <div className="profile-bottom-actions">
          <button
            type="button"
            className="profile-bottom-save-btn"
            onClick={() => handleSubmit()}
            disabled={loading}
          >
            {loading ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>

      {/* Picker 1: Birthday Modal Bottom Sheet */}
      {isBirthPickerOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsBirthPickerOpen(false)}>
          <div className="profile-modal-content bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title">생년월일 선택</h3>
              <button type="button" className="confirm-text-btn" onClick={handleApplyBirth}>
                확인
              </button>
            </div>

            {/* Lunar calendar & Early Year Toggle Row */}
            <div style={{ display: 'flex', gap: '24px', padding: '12px 0', borderBottom: '1px solid var(--border-soft)', width: '100%' }}>
              <div className="lunar-toggle-row" style={{ borderBottom: 'none', padding: 0, flex: 1 }}>
                <span className="lunar-label">음력</span>
                <label className="toggle-switch-label">
                  <input
                    type="checkbox"
                    checked={tempLunar}
                    onChange={(e) => setTempLunar(e.target.checked)}
                  />
                  <span className="toggle-switch-slider"></span>
                </label>
              </div>
              <div className="lunar-toggle-row" style={{ borderBottom: 'none', padding: 0, flex: 1 }}>
                <span className="lunar-label">빠른</span>
                <label className="toggle-switch-label">
                  <input
                    type="checkbox"
                    checked={tempEarly}
                    onChange={(e) => setTempEarly(e.target.checked)}
                  />
                  <span className="toggle-switch-slider"></span>
                </label>
              </div>
            </div>

            {/* Three Columns Select Row */}
            <div className="picker-wheel-row">
              <div className="picker-wheel-col">
                <select
                  value={tempYear}
                  onChange={(e) => setTempYear(e.target.value ? Number(e.target.value) : '')}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
              </div>
              <div className="picker-wheel-col">
                <select
                  value={tempMonth}
                  onChange={(e) => setTempMonth(e.target.value ? Number(e.target.value) : '')}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
              </div>
              <div className="picker-wheel-col">
                <select
                  value={tempDay}
                  onChange={(e) => setTempDay(e.target.value ? Number(e.target.value) : '')}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}일
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button className="bottom-sheet-close-btn" onClick={() => setIsBirthPickerOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Picker 2: Gender Modal Bottom Sheet */}
      {isGenderPickerOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsGenderPickerOpen(false)}>
          <div className="profile-modal-content bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">성별 선택</h3>
            <div className="gender-sheet-buttons">
              <button
                type="button"
                className={`gender-sheet-btn ${genderVal === 'MALE' ? 'is-active' : ''}`}
                onClick={() => {
                  setGenderVal('MALE');
                  setIsGenderPickerOpen(false);
                }}
              >
                남성
              </button>
              <button
                type="button"
                className={`gender-sheet-btn ${genderVal === 'FEMALE' ? 'is-active' : ''}`}
                onClick={() => {
                  setGenderVal('FEMALE');
                  setIsGenderPickerOpen(false);
                }}
              >
                여성
              </button>
            </div>
            <button className="bottom-sheet-close-btn" onClick={() => setIsGenderPickerOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Modal 3: Phone Change Fullscreen/Modal */}
      {isPhoneModalOpen && (
        <div className="phone-change-modal-overlay">
          <div className="phone-change-modal-content">
            {/* Header */}
            <div className="phone-change-header">
              <span className="back-arrow" onClick={() => setIsPhoneModalOpen(false)}>
                〈
              </span>
              <span className="header-title">휴대폰 번호 변경</span>
            </div>

            {/* Input Field */}
            <div className="phone-input-wrap">
              <label className="phone-input-label">휴대폰 번호</label>
              <div className="phone-input-value-row">
                <input
                  type="text"
                  readOnly
                  className="phone-active-input"
                  value={tempPhone}
                />
              </div>
            </div>

            {/* Confirmation Button */}
            <div className="phone-confirm-btn-wrap">
              <button
                type="button"
                className="phone-confirm-btn"
                disabled={tempPhone.length < 10}
                onClick={handleApplyPhone}
              >
                확인
              </button>
            </div>

            {/* Hint Text */}
            <p className="phone-disclaimer-text">
              휴대폰번호는 로그인을 위해 저장되며, 모임을 이용하는 기간 동안 보관되는 것에 동의합니다.
            </p>

            {/* Interactive Numeric Keypad */}
            <div className="phone-numeric-keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="keypad-key"
                  onClick={() => handleKeypadPress(n)}
                >
                  {n}
                </button>
              ))}
              <button type="button" className="keypad-key empty-key" disabled></button>
              <button
                type="button"
                className="keypad-key"
                onClick={() => handleKeypadPress('0')}
              >
                0
              </button>
              <button
                type="button"
                className="keypad-key backspace-key"
                onClick={() => handleKeypadPress('back')}
              >
                ⌫
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
