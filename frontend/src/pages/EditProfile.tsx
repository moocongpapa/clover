import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { api, clearToken, isProfileComplete, type User } from '../api';
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
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

  // Profile data states (defaults to 1995-01-01 if empty)
  const [birthYearVal, setBirthYearVal] = useState<number | ''>(1995);
  const [birthMonthVal, setBirthMonthVal] = useState<number | ''>(1);
  const [birthDayVal, setBirthDayVal] = useState<number | ''>(1);
  const [phoneNumberVal, setPhoneNumberVal] = useState('');
  const [genderVal, setGenderVal] = useState<'MALE' | 'FEMALE' | ''>('');
  const [isEarlyYearVal, setIsEarlyYearVal] = useState(false);

  // Inline accordion states
  const [isBirthExpanded, setIsBirthExpanded] = useState(false);
  const [isGenderExpanded, setIsGenderExpanded] = useState(false);
  const [isPhoneExpanded, setIsPhoneExpanded] = useState(false);
  const [tempPhone, setTempPhone] = useState('');

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
        if (me.phoneNumber) {
          setTempPhone(me.phoneNumber.replace(/\D/g, '').slice(-8));
        }
        setGenderVal(me.gender ?? '');
        setIsEarlyYearVal(me.isEarlyYear ?? false);

        // Parse birthDate / birthYear
        if (me.birthDate) {
          const bDate = new Date(me.birthDate);
          setBirthYearVal(bDate.getUTCFullYear() || bDate.getFullYear());
          setBirthMonthVal(bDate.getUTCMonth() + 1 || bDate.getMonth() + 1);
          setBirthDayVal(bDate.getUTCDate() || bDate.getDate());
        } else if (me.birthYear) {
          setBirthYearVal(me.birthYear);
          setBirthMonthVal(1);
          setBirthDayVal(1);
        } else {
          setBirthYearVal(1995);
          setBirthMonthVal(1);
          setBirthDayVal(1);
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
    const by = overrides?.birthYear !== undefined ? overrides.birthYear : (birthYearVal ? Number(birthYearVal) : null);
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

  const handleDateChange = (newY: number, newM: number, newD: number, newEarly = isEarlyYearVal) => {
    setBirthYearVal(newY);
    setBirthMonthVal(newM);
    setBirthDayVal(newD);
    setIsEarlyYearVal(newEarly);
    const iso = new Date(Date.UTC(newY, newM - 1, newD, 12, 0, 0)).toISOString();
    autoSave({ birthYear: newY, birthDate: iso, isEarlyYear: newEarly });
  };

  const handleGenderChange = (val: 'MALE' | 'FEMALE') => {
    setGenderVal(val);
    autoSave({ gender: val });
  };

  const handlePhoneInputChange = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('010')) {
      digits = digits.slice(3);
    }
    if (digits.length <= 8) {
      setTempPhone(digits);
      if (digits.length === 8) {
        const formatted = `010-${digits.slice(0, 4)}-${digits.slice(4)}`;
        setPhoneNumberVal(formatted);
        autoSave({ phoneNumber: formatted });
      } else {
        setPhoneNumberVal('');
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
      setIsBirthExpanded(true);
      setError('생년월일을 선택해 주세요.');
      return;
    }

    if (!genderVal) {
      setIsGenderExpanded(true);
      setGenderVal('MALE');
      setError('성별을 선택해 주세요.');
      return;
    }

    const cleanPhone = phoneNumberVal.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setIsPhoneExpanded(true);
      setError('휴대폰 번호 8자리를 입력해 주세요.');
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

  const formatBirthDisplay = () => {
    if (birthYearVal && birthMonthVal && birthDayVal) {
      return `${isEarlyYearVal ? '빠른 ' : ''}${birthYearVal}년 ${birthMonthVal}월 ${birthDayVal}일`;
    }
    if (birthYearVal) {
      return `${isEarlyYearVal ? '빠른 ' : ''}${birthYearVal}년 1월 1일`;
    }
    return '선택해 주세요';
  };

  const handleToggleBirth = () => {
    if (!isBirthExpanded) {
      if (!birthYearVal) setBirthYearVal(1995);
      if (!birthMonthVal) setBirthMonthVal(1);
      if (!birthDayVal) setBirthDayVal(1);
      handleDateChange(Number(birthYearVal) || 1995, Number(birthMonthVal) || 1, Number(birthDayVal) || 1);
    }
    setIsBirthExpanded(!isBirthExpanded);
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
      setError('서비스 이용을 위해 필수 정보(이름, 생년월일, 성별, 휴대폰 번호)를 입력하고 [확인]을 눌러주세요.');
      return;
    }
    navigate(-1);
  };

  const avatarFallback = (displayNameVal || profile.displayName || 'U')[0];

  return (
    <div className="edit-profile-page">
      {/* Native Band-style Header with real-time status */}
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
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: '500' }}>저장 중…</span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: '700' }}>저장됨 ✓</span>
          )}
        </div>
      </div>

      {isFirstOnboarding && (
        <div style={{
          margin: '12px 16px 0',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(16, 185, 129, 0.08))',
          border: '1.5px solid var(--brand-primary)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>🍀</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--brand-primary)', marginBottom: '2px' }}>
              환영합니다! 필수 회원 정보 입력
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', lineHeight: '1.4' }}>
              원활한 모임 활동 및 알림 수신을 위해 <strong>이름, 생년월일, 성별, 휴대폰 번호</strong>를 입력해 주세요.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#b91c1c',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form className="edit-profile-body" onSubmit={(e) => e.preventDefault()}>
        {/* Section 2: 내 정보 */}
        <div className="profile-section-title">내 정보</div>
        
        <div className="info-list-container">
          {/* 이름 */}
          <div className="info-list-item no-arrow" style={{ cursor: 'default' }}>
            <div className="info-item-label">
              이름 <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
            </div>
            <div className="info-item-value-wrap" style={{ flex: 1, maxWidth: '200px' }}>
              <input
                type="text"
                value={displayNameVal}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => displayNameVal.trim() && autoSave({ displayName: displayNameVal.trim() })}
                placeholder="이름을 입력하세요"
                style={{
                  width: '100%',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--ink-dark)',
                  textAlign: 'right',
                  outline: 'none',
                  background: 'var(--surface)',
                }}
              />
            </div>
          </div>

          {/* 생일 */}
          <div className="info-list-item-group">
            <div className="info-list-item" onClick={handleToggleBirth}>
              <div className="info-item-label">
                생일 <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
              </div>
              <div className="info-item-value-wrap">
                <span className="info-item-value" style={{ color: birthYearVal ? 'var(--ink-dark)' : 'var(--ink-muted)', fontWeight: birthYearVal ? '600' : 'normal' }}>
                  {formatBirthDisplay()}
                </span>
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
                        onChange={(e) => {
                          const early = e.target.checked;
                          setIsEarlyYearVal(early);
                          handleDateChange(Number(birthYearVal) || 1995, Number(birthMonthVal) || 1, Number(birthDayVal) || 1, early);
                        }}
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
                    value={Number(birthYearVal) || 1995}
                    onChange={(val) => {
                      handleDateChange(val, Number(birthMonthVal) || 1, Number(birthDayVal) || 1);
                    }}
                    formatter={(val) => `${val}년`}
                  />
                  <ScrollPicker
                    options={MONTHS}
                    value={Number(birthMonthVal) || 1}
                    onChange={(val) => {
                      handleDateChange(Number(birthYearVal) || 1995, val, Number(birthDayVal) || 1);
                    }}
                    formatter={(val) => `${val}월`}
                  />
                  <ScrollPicker
                    options={getDaysInMonth(Number(birthYearVal) || 1995, Number(birthMonthVal) || 1)}
                    value={Number(birthDayVal) || 1}
                    onChange={(val) => {
                      handleDateChange(Number(birthYearVal) || 1995, Number(birthMonthVal) || 1, val);
                    }}
                    formatter={(val) => `${val}일`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 성별 */}
          <div className="info-list-item-group">
            <div className="info-list-item" onClick={() => setIsGenderExpanded(!isGenderExpanded)}>
              <div className="info-item-label">
                성별 <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
              </div>
              <div className="info-item-value-wrap">
                <span className="info-item-value" style={{ color: genderVal ? 'var(--ink-dark)' : 'var(--ink-muted)', fontWeight: genderVal ? '600' : 'normal' }}>
                  {genderVal === 'MALE' ? '남성' : genderVal === 'FEMALE' ? '여성' : '선택해 주세요'}
                </span>
                <span className="chevron" style={{ transform: isGenderExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>〉</span>
              </div>
            </div>
            {isGenderExpanded && (
              <div className="inline-picker-container" style={{ padding: '0 16px 16px 16px', background: 'var(--surface)' }}>
                <div className="picker-scroll-container">
                  <div className="picker-scroll-highlight"></div>
                  <ScrollPicker
                    options={['MALE', 'FEMALE']}
                    value={genderVal || 'MALE'}
                    onChange={(val) => handleGenderChange(val as 'MALE' | 'FEMALE')}
                    formatter={(val) => val === 'MALE' ? '남성' : '여성'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 휴대폰 번호 */}
          <div className="info-list-item-group">
            <div className="info-list-item" onClick={() => {
              if (!isPhoneExpanded) {
                const last8 = phoneNumberVal ? phoneNumberVal.replace(/\D/g, '').slice(-8) : '';
                setTempPhone(last8);
              }
              setIsPhoneExpanded(!isPhoneExpanded);
            }}>
              <div className="info-item-label">
                휴대폰 번호 <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
              </div>
              <div className="info-item-value-wrap">
                <span className="info-item-value" style={{ color: phoneNumberVal ? 'var(--ink-dark)' : 'var(--ink-muted)', fontWeight: phoneNumberVal ? '600' : 'normal' }}>
                  {phoneNumberVal ? phoneNumberVal : '010-____-____ 입력'}
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
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
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
              onChange={(e) => handleBioChange(e.target.value)}
            />
            <p className="form-hint">{bio.length}/500</p>
          </div>
        </div>

        {/* Bottom Center Complete Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px 16px 48px 16px',
          width: '100%',
        }}>
          <button
            type="button"
            onClick={() => handleComplete()}
            disabled={loading}
            style={{
              width: '100%',
              maxWidth: '360px',
              height: '52px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '17px',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ color: '#ffffff', fontWeight: '800', fontSize: '17px' }}>
              {loading ? '저장 중…' : '완료'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
