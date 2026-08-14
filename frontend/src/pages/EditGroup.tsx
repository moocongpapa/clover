import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RegionSelector, {
  type RegionSelection,
} from '../components/RegionSelector';
import BankAccountFields, {
  readBankAccountFromForm,
} from '../components/BankAccountFields';
import GoogleMapSelector from '../components/GoogleMapSelector';
import { api, CATEGORY_OPTIONS, isStaffRole, normalizeCategory } from '../api';
import './CreateGroup.css';

export default function EditGroup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [group, setGroup] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  // Form states
  const [category, setCategory] = useState('풋살/축구');
  const [customSportName, setCustomSportName] = useState('');
  const [selectedArenas, setSelectedArenas] = useState<{ placeName: string; address: string }[]>([]);
  const [primaryArenaIndex, setPrimaryArenaIndex] = useState<number>(-1);
  const [maxMembers, setMaxMembers] = useState(50);
  const [monthlyFee, setMonthlyFee] = useState<number | undefined>(undefined);
  const [monthlyFeeInput, setMonthlyFeeInput] = useState<string>('');
  const [dueDay, setDueDay] = useState<number | undefined>(undefined);
  const [officerFeeExempt, setOfficerFeeExempt] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const [region, setRegion] = useState<RegionSelection>({
    activitySido: '',
    activitySigungu: '',
    activityDistrict: '',
    activityTown: '',
  });

  useEffect(() => {
    if (!id) return;
    api
      .getGroup(id)
      .then((g) => {
        const role = g.myMembership?.role;
        const approved = g.myMembership?.status === 'APPROVED';
        const canEdit = approved && role && isStaffRole(role);
        if (!canEdit) {
          setError('모임 프로필을 수정할 권한이 없습니다.');
          return;
        }
        setGroup(g);
        const rawCategory = g.category || '';
        let normCat = normalizeCategory(rawCategory);
        if (normCat === '기타' && (g.name?.includes('FC') || g.name?.includes('풋살') || g.name?.includes('축구') || rawCategory.includes('풋살') || rawCategory.includes('축구'))) {
          normCat = '풋살/축구';
        }
        setCategory(normCat);
        if (normCat === '기타' && !g.customSportName && g.category && g.category !== '기타') {
          setCustomSportName(g.category);
        } else {
          setCustomSportName(g.customSportName || '');
        }
        setSelectedArenas(g.arenas || []);
        setPrimaryArenaIndex(g.arenas && g.arenas.length > 0 ? 0 : -1);
        setMaxMembers(g.maxMembers || 50);
        setMonthlyFee(g.monthlyFee || undefined);
        setMonthlyFeeInput(g.monthlyFee ? g.monthlyFee.toLocaleString() : '');
        setDueDay(g.dueDay || undefined);
        setOfficerFeeExempt(g.officerFeeExempt || false);
        setIsPublic(g.isPublic !== false);

        setRegion({
          activitySido: g.activitySido ?? '',
          activitySigungu: g.activitySigungu ?? '',
          activityDistrict: g.activityDistrict ?? '',
          activityTown: g.activityTown ?? '',
        });
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

    if (!region.activitySido || !region.activitySigungu) {
      setError('주요 활동 지역(시/도, 시/군/구)을 선택해 주세요.');
      return;
    }

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

      // Reorder arenas so the primary one is at index 0
      let arenasPayload = [...selectedArenas];
      if (primaryArenaIndex >= 0 && primaryArenaIndex < arenasPayload.length) {
        const [primary] = arenasPayload.splice(primaryArenaIndex, 1);
        arenasPayload.unshift(primary);
      }

      await api.updateGroup(id, {
        name: fd.get('name') as string,
        description: fd.get('description') as string,
        category,
        isPublic,
        customSportName: category === '기타' ? customSportName : null,
        maxMembers,
        monthlyFee: monthlyFee !== undefined ? monthlyFee : null,
        dueDay: dueDay || null,
        officerFeeExempt,
        arenas: arenasPayload,
        activitySido: region.activitySido || '',
        activitySigungu: region.activitySigungu || '',
        activityDistrict: region.activityDistrict || undefined,
        activityTown: region.activityTown || undefined,
        ...readBankAccountFromForm(fd),
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

      <form className="form-card" onSubmit={handleSubmit}>
        {/* Top Header Card: Left Tactile Photo Picker + Right Group Name & Description */}
        <div className="group-profile-header-card">
          <div className="group-avatar-picker-wrap">
            {previewUrl ? (
              <div className="group-avatar-preview-box">
                <img src={previewUrl} alt="모임 대표 이미지" className="group-avatar-preview-img" />
                <div className="group-avatar-overlay-actions">
                  <label className="avatar-mini-btn" htmlFor="profileImage" title="사진 변경">
                    📷
                  </label>
                  <button
                    type="button"
                    className="avatar-mini-btn avatar-mini-btn--delete"
                    onClick={clearImage}
                    title="사진 삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ) : (
              <label className="group-avatar-empty-picker" htmlFor="profileImage" title="모임 대표 사진 등록">
                <div className="empty-picker-icon-badge">
                  <span className="empty-picker-camera">📷</span>
                  <span className="empty-picker-plus">+</span>
                </div>
                <span className="empty-picker-label">사진 등록</span>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="profileImage"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="group-profile-fields-wrap">
            <div className="profile-field-group">
              <label htmlFor="name" className="profile-field-label">
                모임 이름 <span className="req-star">*</span>
              </label>
              <input
                id="name"
                name="name"
                defaultValue={group.name}
                required
                placeholder="모임 이름을 입력하세요"
                className="profile-field-input"
              />
            </div>
            <div className="profile-field-group">
              <label htmlFor="description" className="profile-field-label">
                소개 <span className="req-star">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={group.description}
                required
                rows={2}
                placeholder="모임 소개글을 입력하세요"
                className="profile-field-textarea"
              />
            </div>
          </div>
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
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label htmlFor="maxMembers">최대 정원 (명)</label>
          <select
            id="maxMembers"
            value={maxMembers}
            onChange={(e) => setMaxMembers(parseInt(e.target.value, 10))}
            required
          >
            {(() => {
              const opts = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 300, 500, 1000];
              if (maxMembers && !opts.includes(maxMembers)) {
                opts.push(maxMembers);
                opts.sort((a, b) => a - b);
              }
              return opts.map((num) => (
                <option key={num} value={num}>
                  {num}명
                </option>
              ));
            })()}
          </select>
        </div>

        {/* 💳 회비 설정 (정기 회비 금액 & 납부 마감일) */}
        <div style={{
          background: 'var(--surface, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--ink-dark, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💳</span> 모임 정기 회비 설정
          </h3>

          <div className="form-row form-row--double">
            <div className="form-group">
              <label htmlFor="monthlyFee">정기 회비 금액 (원)</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="monthlyFee"
                  type="text"
                  inputMode="numeric"
                  value={monthlyFeeInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    if (!raw) {
                      setMonthlyFeeInput('');
                      setMonthlyFee(undefined);
                    } else {
                      const num = parseInt(raw, 10);
                      setMonthlyFee(num);
                      setMonthlyFeeInput(num.toLocaleString());
                    }
                  }}
                  placeholder="예: 10,000"
                  style={{ paddingRight: '32px' }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--ink-muted, #64748b)', fontWeight: '700' }}>
                  원
                </span>
              </div>

              {/* Quick Fee Amount Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {[
                  { label: '회비 없음', val: 0 },
                  { label: '1만원', val: 10000 },
                  { label: '2만원', val: 20000 },
                  { label: '3만원', val: 30000 },
                  { label: '5만원', val: 50000 },
                  { label: '10만원', val: 100000 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setMonthlyFee(p.val);
                      setMonthlyFeeInput(p.val === 0 ? '0' : p.val.toLocaleString());
                    }}
                    style={{
                      padding: '4px 10px',
                      background: monthlyFee === p.val ? 'rgba(16, 185, 129, 0.12)' : 'var(--grey-100, #f1f5f9)',
                      border: monthlyFee === p.val ? '1px solid #10b981' : '1px solid transparent',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: monthlyFee === p.val ? '#10b981' : 'var(--ink-muted, #64748b)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ opacity: monthlyFee === 0 ? 0.45 : 1, pointerEvents: monthlyFee === 0 ? 'none' : 'auto', transition: 'all 0.2s ease' }}>
              <label htmlFor="dueDay">매월 회비 마감일 (일)</label>
              <select
                id="dueDay"
                value={monthlyFee === 0 ? '' : (dueDay || '')}
                onChange={(e) => setDueDay(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                disabled={monthlyFee === 0}
              >
                <option value="">{monthlyFee === 0 ? '회비 없음 (미설정)' : '미설정'}</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    매월 {day}일 마감
                  </option>
                ))}
                <option value="31">월말 (마지막날)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ⚙️ 모임 운영 & 공개 설정 카드 */}
        <div className="group-options-card" style={{
          background: 'var(--surface, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '16px',
          padding: '16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          margin: '16px 0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--ink-dark, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚙️</span> 모임 운영 & 공개 설정
          </h3>

          {/* Option 1: 운영진 회비 면제 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label
                htmlFor="officerFeeExempt"
                style={{ fontSize: '14px', fontWeight: '700', color: 'var(--ink-dark, #0f172a)', display: 'block', cursor: 'pointer', marginBottom: '2px' }}
              >
                운영진 회비 면제 적용
              </label>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-muted, #64748b)', lineHeight: 1.35 }}>
                모임장 및 운영진의 정기 회비 납부 대상 제외
              </p>
            </div>
            <label className="toggle-switch" style={{ flexShrink: 0 }}>
              <input
                id="officerFeeExempt"
                type="checkbox"
                checked={officerFeeExempt}
                onChange={(e) => setOfficerFeeExempt(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle, #f1f5f9)' }} />

          {/* Option 2: 검색·목록 공개 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label
                htmlFor="isPublic"
                style={{ fontSize: '14px', fontWeight: '700', color: 'var(--ink-dark, #0f172a)', display: 'block', cursor: 'pointer', marginBottom: '2px' }}
              >
                검색 · 목록에 모임 공개
              </label>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-muted, #64748b)', lineHeight: 1.35 }}>
                비공개 설정 시 초대 링크를 가진 멤버만 가입 가능
              </p>
            </div>
            <label className="toggle-switch" style={{ flexShrink: 0 }}>
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <BankAccountFields
          bankName={group.bankName ?? ''}
          bankAccountNumber={group.bankAccountNumber ?? ''}
          bankAccountHolder={group.bankAccountHolder ?? ''}
          disabled={monthlyFee === 0}
        />

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
