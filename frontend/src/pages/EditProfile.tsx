import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { api, clearToken, isProfileComplete, type User } from '../api';
import { useAuth } from '../context/AuthContext';
import './EditProfile.css';
import './Groups.css';

export default function EditProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<User | null>(null);
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayNameVal, setDisplayNameVal] = useState('');

  // Profile data states
  const [birthRawInput, setBirthRawInput] = useState(''); // e.g. "19911004"
  const [birthYearVal, setBirthYearVal] = useState<number | null>(null);
  const [birthMonthVal, setBirthMonthVal] = useState<number | null>(null);
  const [birthDayVal, setBirthDayVal] = useState<number | null>(null);
  const [phoneNumberVal, setPhoneNumberVal] = useState('');
  const [genderVal, setGenderVal] = useState<'MALE' | 'FEMALE' | ''>('');
  const [isEarlyYearVal, setIsEarlyYearVal] = useState(false);

  const isFirstOnboarding = searchParams.get('required') === 'true' || (profile !== null && !isProfileComplete(profile));

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
        setPhoneNumberVal(me.phoneNumber ?? '');
        setGenderVal(me.gender ?? '');
        setIsEarlyYearVal(me.isEarlyYear ?? false);

        // Parse birthDate / birthYear
        if (me.birthDate) {
          const bDate = new Date(me.birthDate);
          const y = bDate.getUTCFullYear() || bDate.getFullYear();
          const m = bDate.getUTCMonth() + 1 || bDate.getMonth() + 1;
          const d = bDate.getUTCDate() || bDate.getDate();
          setBirthYearVal(y);
          setBirthMonthVal(m);
          setBirthDayVal(d);
          const mStr = String(m).padStart(2, '0');
          const dStr = String(d).padStart(2, '0');
          setBirthRawInput(`${y}${mStr}${dStr}`);
        } else if (me.birthYear) {
          setBirthYearVal(me.birthYear);
          setBirthMonthVal(1);
          setBirthDayVal(1);
          setBirthRawInput(`${me.birthYear}0101`);
        }
      })
      .catch((e) => {
        clearToken();
        setError(e.message);
        navigate('/login', { replace: true });
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time auto-saving helper
  const autoSave = async (overrides?: Partial<Parameters<typeof api.updateProfile>[0]>) => {
    if (!profile) return;

    const trimmedName = overrides?.displayName !== undefined ? overrides.displayName : displayNameVal.trim();
    const by = overrides?.birthYear !== undefined ? overrides.birthYear : birthYearVal;
    const early = overrides?.isEarlyYear !== undefined ? overrides.isEarlyYear : isEarlyYearVal;
    const g = overrides?.gender !== undefined ? overrides.gender : (genderVal || null);
    const phone = overrides?.phoneNumber !== undefined ? overrides.phoneNumber : phoneNumberVal.trim();
    const b = overrides?.bio !== undefined ? overrides.bio : (bio.trim() || null);

    let bd = overrides?.birthDate;
    if (bd === undefined && birthYearVal && birthMonthVal && birthDayVal) {
      bd = new Date(Date.UTC(Number(birthYearVal), Number(birthMonthVal) - 1, Number(birthDayVal), 12, 0, 0)).toISOString();
    }

    setSaveStatus('saving');
    try {
      const updated = await api.updateProfile({
        displayName: trimmedName || profile.displayName,
        ...(overrides?.profileImageUrl !== undefined ? { profileImageUrl: overrides.profileImageUrl } : {}),
        bio: b,
        birthYear: by,
        birthDate: bd ?? null,
        isEarlyYear: early,
        phoneNumber: phone || null,
        gender: g,
      });
      updateUser(updated);
      setProfile(updated);
      setSaveStatus('saved');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      return updated;
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('idle');
    }
  };

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      setPreviewUrl(null);
      await autoSave({ profileImageUrl: null });
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
    setLoading(true);
    try {
      const uploaded = await api.uploadProfileImage(file);
      setPreviewUrl(uploaded.url);
      await autoSave({ profileImageUrl: uploaded.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (newName: string) => {
    setDisplayNameVal(newName);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (newName.trim()) {
        autoSave({ displayName: newName.trim() });
      }
    }, 600);
  };

  const handleBioChange = (newBio: string) => {
    setBio(newBio);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      autoSave({ bio: newBio.trim() || null });
    }, 600);
  };

  // Smart Birth Date Input (supports YYYYMMDD e.g. 19911004 or 1991-10-04)
  const handleBirthInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    setBirthRawInput(digits);

    if (digits.length === 8) {
      const y = parseInt(digits.slice(0, 4), 10);
      const m = parseInt(digits.slice(4, 6), 10);
      const d = parseInt(digits.slice(6, 8), 10);

      const currentYear = new Date().getFullYear();
      if (y >= 1920 && y <= currentYear && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        setBirthYearVal(y);
        setBirthMonthVal(m);
        setBirthDayVal(d);
        const iso = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
        autoSave({ birthYear: y, birthDate: iso });
      }
    } else if (digits.length === 0) {
      setBirthYearVal(null);
      setBirthMonthVal(null);
      setBirthDayVal(null);
      autoSave({ birthYear: null, birthDate: null });
    }
  };

  const handleNativeDatePick = (dateStr: string) => {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      setBirthYearVal(y);
      setBirthMonthVal(m);
      setBirthDayVal(d);
      setBirthRawInput(`${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`);
      const iso = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
      autoSave({ birthYear: y, birthDate: iso });
    }
  };

  const formatBirthFormatted = (digits: string) => {
    if (!digits) return '';
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  };

  // One-touch Gender Segmented Control
  const handleGenderSelect = (val: 'MALE' | 'FEMALE') => {
    setGenderVal(val);
    autoSave({ gender: val });
  };

  // Inline 8-digit Phone Input
  const handlePhoneInputChange = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('010')) {
      digits = digits.slice(3);
    }
    digits = digits.slice(0, 8);

    if (digits.length === 0) {
      setPhoneNumberVal('');
      autoSave({ phoneNumber: null });
    } else {
      let formatted = `010-${digits}`;
      if (digits.length > 4) {
        formatted = `010-${digits.slice(0, 4)}-${digits.slice(4)}`;
      }
      setPhoneNumberVal(formatted);
      if (digits.length === 8) {
        autoSave({ phoneNumber: formatted });
      }
    }
  };

  // Header confirm / complete button (validates mandatory fields)
  const handleComplete = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;

    const trimmedName = displayNameVal.trim();
    if (!trimmedName) {
      setError('이름(닉네임)을 입력해 주세요.');
      return;
    }

    if (!birthYearVal || !birthMonthVal || !birthDayVal) {
      setError('생년월일 8자리를 올바르게 입력해 주세요. (예: 19950101)');
      return;
    }

    if (!genderVal) {
      setError('성별을 선택해 주세요.');
      return;
    }

    const cleanPhone = phoneNumberVal.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setError('휴대폰 번호를 올바르게 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const updated = await autoSave();
      if (updated) {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  if (error && !profile) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-dark)', marginBottom: '8px', fontSize: '16px', fontWeight: '700' }}>
          로그인 정보가 만료되었습니다
        </p>
        <p style={{ color: 'var(--ink-muted)', marginBottom: '24px', fontSize: '13px' }}>
          원활한 서비스 이용을 위해 카카오 계정으로 다시 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login', { replace: true });
          }}
          style={{
            background: '#fee500',
            color: '#191919',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 28px',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          카카오로 로그인하기
        </button>
      </div>
    );
  }

  if (!profile) {
    return <p className="loading-text">불러오는 중…</p>;
  }

  const handleBackClick = () => {
    if (isFirstOnboarding) {
      setError('서비스 이용을 위해 필수 정보(이름, 생년월일, 성별, 휴대폰 번호)를 입력하고 [완료]를 눌러주세요.');
      return;
    }
    navigate(-1);
  };

  const avatarFallback = (displayNameVal || profile.displayName || 'U')[0];

  return (
    <div className="edit-profile-page">
      {/* Top Header */}
      <div className="edit-profile-header">
        <div className="header-left">
          {!isFirstOnboarding ? (
            <BackButton onClick={handleBackClick} />
          ) : (
            <div style={{ width: '8px' }} />
          )}
          <span className="header-title">{isFirstOnboarding ? '회원 정보 입력' : '내 프로필'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saveStatus === 'saving' && (
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: '600' }}>저장 중…</span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: '800' }}>저장됨 ✓</span>
          )}
        </div>
      </div>

      {isFirstOnboarding && (
        <div className="onboarding-welcome-banner">
          <span className="onboarding-welcome-icon">🍀</span>
          <div>
            <div className="onboarding-welcome-title">
              환영합니다! 필수 회원 정보 입력
            </div>
            <div className="onboarding-welcome-desc">
              원활한 모임 활동 및 알림 수신을 위해 <strong>이름, 생년월일, 성별, 휴대폰 번호</strong>를 입력해 주세요.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="profile-error-alert">
          ⚠️ {error}
        </div>
      )}

      <form className="edit-profile-body" onSubmit={(e) => e.preventDefault()}>
        {/* Section: 내 필수 정보 (Modern Clean Form Card) */}
        <div className="profile-section-title">내 정보</div>
        
        <div className="profile-modern-card">
          {/* 1. 이름 */}
          <div className="profile-input-group">
            <label className="profile-input-label">
              이름 <span className="req-star">*</span>
            </label>
            <div className="profile-input-field-wrap">
              <input
                type="text"
                className="profile-text-input"
                value={displayNameVal}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => displayNameVal.trim() && autoSave({ displayName: displayNameVal.trim() })}
                placeholder="이름(닉네임)을 입력하세요"
              />
              {displayNameVal && (
                <button
                  type="button"
                  className="profile-input-clear-btn"
                  onClick={() => handleNameChange('')}
                  title="지우기"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="profile-divider" />

          {/* 2. 생년월일 */}
          <div className="profile-input-group">
            <div className="profile-input-label-row">
              <label className="profile-input-label">
                생년월일 <span className="req-star">*</span>
              </label>
              <label className="early-year-toggle-pill">
                <span>⚡ 빠른 년생</span>
                <input
                  type="checkbox"
                  checked={isEarlyYearVal}
                  onChange={(e) => {
                    const early = e.target.checked;
                    setIsEarlyYearVal(early);
                    autoSave({ isEarlyYear: early });
                  }}
                />
                <span className="early-slider"></span>
              </label>
            </div>

            <div className="profile-input-field-wrap">
              <input
                type="tel"
                inputMode="numeric"
                className="profile-text-input"
                value={formatBirthFormatted(birthRawInput)}
                onChange={(e) => handleBirthInputChange(e.target.value)}
                placeholder="예: 1995.01.01 (8자리 입력)"
                maxLength={10}
              />
              <button
                type="button"
                className="profile-calendar-btn"
                onClick={() => datePickerRef.current?.showPicker?.()}
                title="달력으로 선택"
              >
                📅
              </button>
              <input
                ref={datePickerRef}
                type="date"
                className="sr-only"
                onChange={(e) => handleNativeDatePick(e.target.value)}
              />
            </div>
          </div>

          <div className="profile-divider" />

          {/* 3. 성별 (One-Touch Segmented Buttons) */}
          <div className="profile-input-group">
            <label className="profile-input-label">
              성별 <span className="req-star">*</span>
            </label>
            <div className="gender-segmented-control">
              <button
                type="button"
                className={`gender-segment-btn ${genderVal === 'MALE' ? 'is-active' : ''}`}
                onClick={() => handleGenderSelect('MALE')}
              >
                <span className="gender-btn-icon">🙋‍♂️</span>
                <span>남성</span>
              </button>
              <button
                type="button"
                className={`gender-segment-btn ${genderVal === 'FEMALE' ? 'is-active' : ''}`}
                onClick={() => handleGenderSelect('FEMALE')}
              >
                <span className="gender-btn-icon">🙋‍♀️</span>
                <span>여성</span>
              </button>
            </div>
          </div>

          <div className="profile-divider" />

          {/* 4. 휴대폰 번호 */}
          <div className="profile-input-group">
            <label className="profile-input-label">
              휴대폰 번호 <span className="req-star">*</span>
            </label>
            <div className="profile-input-field-wrap">
              <input
                type="tel"
                inputMode="numeric"
                className="profile-text-input"
                value={phoneNumberVal}
                onChange={(e) => handlePhoneInputChange(e.target.value)}
                placeholder="010-####-#### (8자리 입력)"
                maxLength={13}
              />
            </div>
          </div>
        </div>

        {/* Section: 기본 상세 정보 (Photo & Bio) */}
        <div className="profile-section-title">기본 상세 정보</div>
        <div className="profile-modern-card profile-bio-card">
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
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                기본 이미지로 변경
              </button>
            )}
          </div>

          <div className="profile-input-group" style={{ marginTop: '16px' }}>
            <label className="profile-input-label">자기소개</label>
            <textarea
              className="profile-textarea"
              rows={3}
              maxLength={500}
              placeholder="간단한 자기소개를 입력해 주세요"
              value={bio}
              onChange={(e) => handleBioChange(e.target.value)}
            />
            <div className="profile-textarea-counter">{bio.length}/500</div>
          </div>
        </div>

        {/* Bottom Center Vivid Green Complete Button */}
        <div className="profile-bottom-cta-wrap">
          <button
            type="button"
            className="profile-complete-btn"
            onClick={() => handleComplete()}
            disabled={loading}
          >
            {loading ? '저장 중…' : '완료'}
          </button>
        </div>
      </form>
    </div>
  );
}
