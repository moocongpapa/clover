import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type User } from '../api';
import { useAuth } from '../context/AuthContext';
import './EditProfile.css';
import './Groups.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const getDaysInMonth = (year: number | '', month: number | '') => {
  if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
  const numDays = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: numDays }, (_, i) => i + 1);
};

interface ScrollPickerProps<T> {
  options: T[];
  value: T;
  onChange: (val: T) => void;
  formatter: (val: T) => string;
}

function ScrollPicker<T extends string | number>({ options, value, onChange, formatter }: ScrollPickerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const index = options.indexOf(value);
    if (index !== -1) {
      containerRef.current.scrollTop = index * 40;
    }
  }, [value, options]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / 40);
      if (index >= 0 && index < options.length) {
        const selectedValue = options[index];
        if (selectedValue !== value) {
          onChange(selectedValue);
        }
      }
    }, 100);
  };

  return (
    <div 
      className="scroll-picker-col" 
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: '160px',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        position: 'relative',
        padding: '60px 0',
        width: '100%',
        textAlign: 'center',
      }}
    >
      {options.map((opt) => (
        <div
          key={opt}
          className={`scroll-picker-item ${opt === value ? 'is-selected' : ''}`}
          onClick={() => onChange(opt)}
          style={{
            height: '40px',
            lineHeight: '40px',
            fontSize: opt === value ? '19px' : '15px',
            fontWeight: opt === value ? '800' : '500',
            color: opt === value ? 'var(--ink-dark)' : 'var(--ink-muted)',
            scrollSnapAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {formatter(opt)}
        </div>
      ))}
    </div>
  );
}

export default function EditProfile() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
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

  // Inline accordion states
  const [isBirthExpanded, setIsBirthExpanded] = useState(false);
  const [isGenderExpanded, setIsGenderExpanded] = useState(false);
  const [isPhoneExpanded, setIsPhoneExpanded] = useState(false);
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

  // Helpers for 8-digit phone numbers
  const getDigitsOnly = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const getLast8Digits = (phone: string) => {
    const digits = getDigitsOnly(phone);
    return digits.slice(-8);
  };

  const formatTempPhoneDisplay = (rawDigits: string) => {
    const clean = rawDigits.replace(/\D/g, '');
    if (clean.length === 0) return '010-____-____';
    if (clean.length <= 4) {
      const displayPart = clean.padEnd(4, '_');
      return `010-${displayPart.slice(0, 4)}-____`;
    }
    const part1 = clean.slice(0, 4);
    const part2 = clean.slice(4).padEnd(4, '_');
    return `010-${part1}-${part2}`;
  };

  const formatInputPhone = (rawDigits: string) => {
    const clean = rawDigits.replace(/\D/g, '');
    if (clean.length === 0) return '';
    if (clean.length <= 4) {
      return `010-${clean}`;
    }
    return `010-${clean.slice(0, 4)}-${clean.slice(4)}`;
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
        
        <div className="info-list-container">
          {/* 이름 */}
          <div className="info-list-item no-arrow" style={{ cursor: 'default' }}>
            <div className="info-item-label">이름</div>
            <div className="info-item-value-wrap">
              <span className="info-item-value" style={{ color: 'var(--ink-dark)', fontWeight: '600' }}>{displayNameVal}</span>
            </div>
          </div>

          {/* 생일 */}
          <div className="info-list-item-group">
            <div className="info-list-item" onClick={() => setIsBirthExpanded(!isBirthExpanded)}>
              <div className="info-item-label">생일</div>
              <div className="info-item-value-wrap">
                <span className="info-item-value">{formatBirthDisplay()}</span>
                <span className="chevron" style={{ transform: isBirthExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>〉</span>
              </div>
            </div>
            {isBirthExpanded && (
              <div className="inline-picker-container" style={{ padding: '0 16px 16px 16px', background: 'var(--surface)' }}>
                {/* Lunar calendar & Early Year Toggle Row */}
                <div style={{ display: 'flex', gap: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--border-soft)', width: '100%' }}>
                  <div className="lunar-toggle-row" style={{ borderBottom: 'none', padding: 0, flex: 1 }}>
                    <span className="lunar-label">빠른 년생</span>
                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={isEarlyYearVal}
                        onChange={(e) => setIsEarlyYearVal(e.target.checked)}
                      />
                      <span className="toggle-switch-slider"></span>
                    </label>
                  </div>
                </div>

                {/* Three Columns Scroll Row */}
                <div className="picker-scroll-container">
                  <div className="picker-scroll-highlight"></div>
                  <ScrollPicker
                    options={YEARS}
                    value={birthYearVal || 1991}
                    onChange={(val) => setBirthYearVal(val)}
                    formatter={(val) => `${val}년`}
                  />
                  <ScrollPicker
                    options={MONTHS}
                    value={birthMonthVal || 10}
                    onChange={(val) => setBirthMonthVal(val)}
                    formatter={(val) => `${val}월`}
                  />
                  <ScrollPicker
                    options={getDaysInMonth(birthYearVal, birthMonthVal)}
                    value={birthDayVal || 4}
                    onChange={(val) => setBirthDayVal(val)}
                    formatter={(val) => `${val}일`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 성별 */}
          <div className="info-list-item-group">
            <div className="info-list-item" onClick={() => setIsGenderExpanded(!isGenderExpanded)}>
              <div className="info-item-label">성별</div>
              <div className="info-item-value-wrap">
                <span className="info-item-value">
                  {genderVal === 'MALE' ? '남성' : genderVal === 'FEMALE' ? '여성' : '선택 안 함'}
                </span>
                <span className="chevron" style={{ transform: isGenderExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>〉</span>
              </div>
            </div>
            {isGenderExpanded && (
              <div className="inline-picker-container" style={{ padding: '0 16px 16px 16px', background: 'var(--surface)' }}>
                <div className="picker-scroll-container">
                  <div className="picker-scroll-highlight"></div>
                  <ScrollPicker
                    options={['MALE', 'FEMALE', '']}
                    value={genderVal}
                    onChange={(val) => setGenderVal(val as 'MALE' | 'FEMALE' | '')}
                    formatter={(val) => val === 'MALE' ? '남성' : val === 'FEMALE' ? '여성' : '선택 안 함'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 휴대폰 번호 */}
          <div className="info-list-item-group">
            <div className="info-list-item" onClick={() => {
              if (!isPhoneExpanded) {
                const last8 = getLast8Digits(phoneNumberVal);
                setTempPhone(last8);
              }
              setIsPhoneExpanded(!isPhoneExpanded);
            }}>
              <div className="info-item-label">휴대폰 번호</div>
              <div className="info-item-value-wrap">
                <span className="info-item-value">
                  {phoneNumberVal ? phoneNumberVal : '등록되지 않음'}
                </span>
                <span className="chevron" style={{ transform: isPhoneExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>〉</span>
              </div>
            </div>
            {isPhoneExpanded && (
              <div className="inline-picker-container" style={{ padding: '0 16px 16px 16px', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="phone-input-wrap" style={{ marginTop: '12px' }}>
                  <div className="phone-input-value-row">
                    <input
                      type="tel"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      ref={phoneInputRef}
                      autoFocus
                      className="phone-active-input-editable"
                      value={formatInputPhone(tempPhone)}
                      onChange={(e) => {
                        const val = e.target.value;
                        let digits = val.replace(/\D/g, '');
                        if (digits.startsWith('010')) {
                          digits = digits.slice(3);
                        }
                        if (digits.length <= 8) {
                          setTempPhone(digits);
                          if (digits.length === 8) {
                            const formatted = `010-${digits.slice(0, 4)}-${digits.slice(4)}`;
                            setPhoneNumberVal(formatted);
                          } else {
                            setPhoneNumberVal('');
                          }
                        }
                      }}
                      placeholder="010-____-____"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        outline: 'none',
                        textAlign: 'center',
                        color: 'var(--ink-dark)',
                        background: 'var(--grey-50)',
                        letterSpacing: '0.5px'
                      }}
                    />
                  </div>
                </div>
                <p className="phone-disclaimer-text" style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px', textAlign: 'center', margin: 0 }}>
                  앞의 '010'을 제외하고 숫자 8자리만 입력해 주세요. (예: 12345678)
                </p>
              </div>
            )}
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

    </div>
  );
}
