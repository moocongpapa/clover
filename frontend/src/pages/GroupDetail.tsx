import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import {
  api,
  formatCategoryEmoji,
  formatEventDate,
  formatEventTimeRange,
  ASSIGNABLE_ROLES,
  formatMemberDisplayName,
  formatUserDisplayName,
  formatPhoneNumber,
  isStaffRole,
  normalizeCategory,
  ROLE_LABELS,
  ROLE_SORT_ORDER,
  type Event,
  type VoteChoice,
} from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import './GroupDetail.css';

declare global {
  interface Window {
    kakao: any;
  }
}

// Feature Flag: Hide gallery from public service until officially opened
const SHOW_GALLERY = false;

type GroupTab = 'posts' | 'events' | 'gallery' | 'members' | 'payments' | 'officers' | 'info';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [paymentData, setPaymentData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');

  // Announcements States
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [writingAnnouncement, setWritingAnnouncement] = useState(false);
  const [postType, setPostType] = useState<'NOTICE' | 'GENERAL'>('GENERAL');

  // Gallery States
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedMediaIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMediaIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setSelectedMediaIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setSelectedMediaIndex((prev) =>
          prev !== null && prev < mediaFiles.length - 1 ? prev + 1 : prev,
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMediaIndex, mediaFiles.length]);

  // Tab State
  const [activeTab, setActiveTab] = useState<GroupTab>('posts');
  const [eventSubTab, setEventSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [memberFilter, setMemberFilter] = useState<'all' | 'officer' | 'member' | 'injured'>('all');

  // New Feed States
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [feedFilter, setFeedFilter] = useState<'all' | 'announcements'>('all');
  const [showWriteMenu, setShowWriteMenu] = useState(false);

  // Reaction Buttons (좋아요, 최고, 싫어요, 체크)
  const REACTION_OPTIONS = [
    { type: 'LIKE', emoji: '❤️', label: '좋아요' },
    { type: 'BEST', emoji: '👍', label: '최고' },
    { type: 'DISLIKE', emoji: '👎', label: '싫어요' },
    { type: 'CHECK', emoji: '✅', label: '체크' },
  ] as const;

  const [reactionsMap, setReactionsMap] = useState<
    Record<string, Record<string, { count: number; active: boolean }>>
  >({});

  const [announcementCommentsMap, setAnnouncementCommentsMap] = useState<
    Record<string, Array<{ id: string; author: string; time: string; content: string }>>
  >({});

  const handleToggleReaction = (itemId: string, reactionType: string) => {
    setReactionsMap((prev) => {
      const currentItemMap = prev[itemId] || {
        LIKE: { count: 0, active: false },
        BEST: { count: 0, active: false },
        DISLIKE: { count: 0, active: false },
        CHECK: { count: 0, active: false },
      };
      const currentReaction = currentItemMap[reactionType] || { count: 0, active: false };
      const nextActive = !currentReaction.active;
      const nextCount = Math.max(0, currentReaction.count + (nextActive ? 1 : -1));

      return {
        ...prev,
        [itemId]: {
          ...currentItemMap,
          [reactionType]: {
            count: nextCount,
            active: nextActive,
          },
        },
      };
    });
  };

  const getAnnouncementComments = (announcementId: string) => {
    return announcementCommentsMap[announcementId] || [];
  };

  const handleAddAnnouncementComment = (announcementId: string, content: string) => {
    if (!content.trim()) return;
    const currentComments = getAnnouncementComments(announcementId);
    const userHeaderInfo = user ? getMemberHeaderInfo(user) : '회원';
    const nowStr = new Date().toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newComment = {
      id: `ann-c-${Date.now()}`,
      author: userHeaderInfo,
      time: nowStr,
      content: content.trim(),
    };

    setAnnouncementCommentsMap((prev) => ({
      ...prev,
      [announcementId]: [...currentComments, newComment],
    }));

    setCommentInputs((prev) => ({ ...prev, [announcementId]: '' }));
  };

  // Month Picker State for Payments
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const upcomingEvents = events
    .filter((ev) => {
      const d = new Date(ev.date);
      const [h, m] = (ev.startTime).split(':').map(Number);
      d.setHours(h, m, 0, 0);
      return d.getTime() >= Date.now();
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastEvents = events
    .filter((ev) => {
      const d = new Date(ev.date);
      const [h, m] = (ev.startTime).split(':').map(Number);
      d.setHours(h, m, 0, 0);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);
      return d.getTime() < Date.now() && d.getTime() >= threeMonthsAgo.getTime();
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const load = () => {
    if (!id) return;
    Promise.all([
      api.getGroup(id),
      api.listEvents(id),
      api.listAnnouncements(id),
      api.getGroupMedia(id)
    ])
      .then(([g, e, ann, med]) => {
        setGroup(g);
        setEvents(e);
        setAnnouncements(ann);
        setMediaFiles(med);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);



  // Load payment checklist when info tab (or payments section) is selected or year/month changes
  useEffect(() => {
    if ((activeTab === 'payments' || activeTab === 'info') && id) {
      api.getPayments(id, payYear, payMonth)
        .then(setPaymentData)
        .catch(() => {});
    }
  }, [activeTab, id, payYear, payMonth]);

  if (error) return <p className="form-error">{error}</p>;
  if (!group) return <p className="loading-text">불러오는 중…</p>;

  const membership = group.myMembership;
  const isApproved = membership?.status === 'APPROVED';
  const isOfficer = membership?.role ? isStaffRole(membership.role) : false;
  const isPresident = membership?.role === 'PRESIDENT';

  const handleJoin = async () => {
    try {
      await api.joinGroup(group.id);
      setMessage('가입 신청이 완료되었습니다. 회장 승인을 기다려 주세요.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '가입 실패');
    }
  };

  const handleCancelJoin = async () => {
    try {
      await api.cancelJoinGroup(group.id);
      setMessage('가입 신청을 취소했습니다.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '취소 실패');
    }
  };

  const handleApprove = async (userId: string, status: string) => {
    await api.updateMember(group.id, userId, { status });
    load();
  };

  const handleSetRole = async (userId: string, role: string) => {
    try {
      await api.updateMember(group.id, userId, { role });
      setMessage('역할이 변경되었습니다.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '역할 변경 실패');
    }
  };

  const handleTransfer = async () => {
    if (!transferTargetId) return;
    const target = group.members.find((m: any) => m.user.id === transferTargetId);
    if (!target) return;
    if (!confirm(`${target.user.displayName}님에게 회장직을 양도하시겠습니까?`)) {
      return;
    }
    try {
      await api.transferPresident(group.id, transferTargetId);
      setMessage('회장직이 양도되었습니다.');
      setShowTransfer(false);
      setTransferTargetId('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '회장 양도 실패');
    }
  };

  const handleKick = async (userId: string, displayName: string) => {
    if (!confirm(`${displayName} 회원을 강제로 탈퇴(추방)시키겠습니까?`)) {
      return;
    }
    try {
      await api.kickMember(group.id, userId);
      setMessage('회원이 강제 탈퇴 처리되었습니다.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '강제 탈퇴 처리 실패');
    }
  };

  const handleDissolveGroup = async () => {
    if (!confirm('정말로 이 모임을 해체하시겠습니까?\n해체 시 모임 내 모든 멤버 정보, 일정, 투표 및 공지사항 등이 영구적으로 삭제됩니다.')) {
      return;
    }
    const checkName = prompt(`확인을 위해 모임 이름("${group.name}")을 정확히 입력해 주세요:`);
    if (checkName !== group.name) {
      alert('모임 이름이 올바르지 않습니다. 모임 해체가 취소되었습니다.');
      return;
    }
    try {
      await api.deleteGroup(group.id);
      alert('모임이 해체되었습니다.');
      navigate('/groups');
    } catch (e) {
      setError(e instanceof Error ? e.message : '모임 해체 실패');
    }
  };

  const handleCopyInvite = async () => {
    const inviteUrl = `${window.location.origin}/invite/${group.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('링크 복사에 실패했습니다.');
    }
  };

  const handleCopyAccountNumber = async () => {
    if (!group.bankAccountNumber) return;
    try {
      await navigator.clipboard.writeText(group.bankAccountNumber);
      setAccountCopied(true);
      setTimeout(() => setAccountCopied(false), 2000);
    } catch {
      setError('계좌번호 복사에 실패했습니다.');
    }
  };

  const handleTogglePayment = async (targetUserId: string) => {
    try {
      await api.togglePayment(group.id, targetUserId, payYear, payMonth);
      // Reload payments
      const data = await api.getPayments(group.id, payYear, payMonth);
      setPaymentData(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : '납부 토글 실패');
    }
  };

  const handleRemindUnpaid = async () => {
    if (!id) return;
    try {
      const res = await api.remindUnpaidMembers(id, payYear, payMonth);
      alert(`총 ${res.remindedCount}명의 미납 회원에게 회비 납부 알림(토스/카카오페이 1초 송금 딥링크)이 발송되었습니다! 📣`);
    } catch (err) {
      console.error(err);
      alert('회비 독촉 알림 발송 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateMyStatus = async (userStatus: string) => {
    try {
      await api.updateMyStatus(group.id, userStatus);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '활동 상태 변경 실패');
    }
  };

  const renderUserDisplayWithBadge = (userObj: any) => {
    if (!userObj) return null;
    const member = group?.members?.find((m: any) => m.user.id === userObj.id);
    const roleLabel = member ? ROLE_LABELS[member.role] : (userObj.role ? ROLE_LABELS[userObj.role] : '회원');
    const formattedName = formatUserDisplayName(userObj);

    return (
      <span className="user-display-badge-container">
        <span className="user-display-name-text">
          {formattedName}
        </span>
        <span className="user-role-pill-badge">{roleLabel}</span>
      </span>
    );
  };

  const formatCommentAuthorBadge = (authorInput: any) => {
    if (typeof authorInput === 'object' && authorInput !== null) {
      return renderUserDisplayWithBadge(authorInput);
    }
    if (typeof authorInput === 'string') {
      const parts = authorInput.split('/');
      if (parts.length >= 3) {
        const year = parts[0];
        const name = parts[1];
        const role = parts[2];
        return (
          <span className="user-display-badge-container">
            <span className="user-display-name-text">
              👨 {year} {name}
            </span>
            <span className="user-role-pill-badge">{role}</span>
          </span>
        );
      }
    }
    return <span className="user-display-name-text">{String(authorInput)}</span>;
  };

  const getMemberHeaderInfo = (userObj: any) => {
    if (!group || !group.members) return formatUserDisplayName(userObj);
    const member = group.members.find((m: any) => m.user.id === userObj.id);
    const roleLabel = member ? ROLE_LABELS[member.role] : '회원';
    return `${formatUserDisplayName(userObj)}/${roleLabel}`;
  };

  const feedItems = (() => {
    if (!group) return [];
    const items = announcements.map((ann) => {
      const isNotice = ann.title.startsWith('[공지]') || ann.title.startsWith('📢');
      return {
        feedType: isNotice ? ('notice' as const) : ('post' as const),
        id: ann.id,
        title: ann.title,
        content: ann.content,
        createdAt: new Date(ann.createdAt),
        author: ann.author,
        isNotice,
        raw: ann,
      };
    });
    // Sort descending by date/createdAt
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  })();

  const filteredFeedItems = feedFilter === 'announcements'
    ? feedItems.filter(item => item.isNotice)
    : feedItems;

  const roleEmoji = (role: string) => {
    if (role === 'PRESIDENT') return '👑 ';
    if (role === 'VICE_PRESIDENT') return '🥈 ';
    if (role === 'SECRETARY') return '📋 ';
    if (role === 'OFFICER') return '⭐ ';
    return '';
  };

  const formatMemberNameWithEmoji = (mUser: any) => {
    return formatUserDisplayName(mUser);
  };

  const formatHistoryDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleQuickVote = async (e: React.MouseEvent, eventId: string, choice: VoteChoice) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.castVote(eventId, choice);
      setMessage(choice === 'ATTEND' ? '⚽ 참석 투표가 즉시 반영되었습니다!' : choice === 'ABSENT' ? '🚫 불참으로 투표되었습니다.' : '⏰ 늦참으로 투표되었습니다.');
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const sortedMembers = [...group.members].sort((a: any, b: any) => {
    const orderA = ROLE_SORT_ORDER[a.role] ?? 99;
    const orderB = ROLE_SORT_ORDER[b.role] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.user.displayName.localeCompare(b.user.displayName, 'ko');
  });

  const transferCandidates = sortedMembers.filter(
    (m: any) => m.role !== 'PRESIDENT',
  );

  const hasBankAccount = Boolean(
    group.bankName || group.bankAccountNumber || group.bankAccountHolder,
  );

  const prevMonth = () => {
    if (payMonth === 1) {
      setPayYear(prev => prev - 1);
      setPayMonth(12);
    } else {
      setPayMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (payMonth === 12) {
      setPayYear(prev => prev + 1);
      setPayMonth(1);
    } else {
      setPayMonth(prev => prev + 1);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim() || !id) return;
    try {
      const finalTitle =
        postType === 'NOTICE' && !announcementTitle.startsWith('[공지]')
          ? `[공지] ${announcementTitle}`
          : announcementTitle;

      await api.createAnnouncement({
        title: finalTitle,
        content: announcementContent,
        groupId: id,
      });
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setWritingAnnouncement(false);
      const ann = await api.listAnnouncements(id);
      setAnnouncements(ann);
    } catch (err) {
      alert(err instanceof Error ? err.message : '게시글 등록 실패');
    }
  };

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;
    const fileList = Array.from(files);
    setUploadingMedia(true);
    try {
      if (fileList.length === 1) {
        const uploaded = await api.uploadGalleryFile(fileList[0]);
        await api.createGroupMedia(id, {
          url: uploaded.url,
          fileType: uploaded.fileType,
        });
      } else {
        const uploadedList = await api.uploadMultipleGalleryFiles(fileList);
        for (const uploaded of uploadedList) {
          await api.createGroupMedia(id, {
            url: uploaded.url,
            fileType: uploaded.fileType,
          });
        }
      }
      const med = await api.getGroupMedia(id);
      setMediaFiles(med);
    } catch (err) {
      alert(err instanceof Error ? err.message : '미디어 업로드 실패');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = async (mediaId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!id) return;
    if (!window.confirm('이 사진을 정말 삭제하시겠습니까?')) {
      return;
    }
    try {
      await api.deleteGroupMedia(id, mediaId);
      const med = await api.getGroupMedia(id);
      setMediaFiles(med);
      if (selectedMediaIndex !== null) {
        setSelectedMediaIndex(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '사진 삭제 실패');
    }
  };

  // Emojis for member activity status
  // Member activity status labels and options
  const userStatusLabels: Record<string, string> = {
    ACTIVE: '🟢 정상',
    HEALTHY: '🟢 정상',
    INACTIVE_INJURED: '🔴 장기간 참석 불가능 (부상)',
    INJURED: '🔴 장기간 참석 불가능 (부상)',
    INACTIVE_BUSINESS_TRIP: '🔴 장기간 참석 불가능 (출장)',
    INACTIVE_CHILDCARE: '🔴 장기간 참석 불가능 (육아)',
    INACTIVE_WORK: '🔴 장기간 참석 불가능 (업무)',
    INACTIVE_OTHER: '🔴 장기간 참석 불가능 (기타)',
    UNAVAILABLE: '🔴 장기간 참석 불가능 (기타)',
  };

  const INACTIVE_REASON_OPTIONS = [
    { value: 'INJURED', label: '🩹 부상' },
    { value: 'BUSINESS_TRIP', label: '💼 출장' },
    { value: 'CHILDCARE', label: '👶 육아' },
    { value: 'WORK', label: '🏢 업무' },
    { value: 'OTHER', label: '📝 기타' },
  ];

  return (
    <div className="group-detail">
      {/* Header Bar */}
      <div className="group-detail-header-bar">
        <BackButton onClick={() => navigate('/')} label="홈" />
      </div>

      {/* Group Info Section */}
      <div className="group-hero-section">
        <div className="group-hero-main-info">
          <GroupAvatar
            src={group.profileImageUrl}
            name={group.name}
            size={76}
            radius={22}
            className="group-detail-cover-avatar"
          />
          <div className="group-detail-title-info">
            <div className="group-detail-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
              <h1 className="group-detail-title-name" style={{ margin: 0 }}>{group.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {isOfficer && (
                  <Link
                    to={`/groups/${group.id}/edit`}
                    className="group-detail-edit-icon-btn"
                    title="모임 설정 수정"
                    aria-label="모임 설정 수정"
                    style={{
                      background: 'var(--grey-100)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--ink-dark)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ✏️
                  </Link>
                )}
                <button
                  type="button"
                  className="group-detail-invite-btn"
                  onClick={handleCopyInvite}
                  style={{
                    background: 'var(--grey-100)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--ink-dark)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0
                  }}
                >
                  ✉️ {copied ? '링크 복사됨!' : '초대'}
                </button>
              </div>
            </div>
            <div className="group-detail-subtitle" style={{ marginTop: '6px' }}>
              <span className="visibility-icon">{group.isPublic ? '🌍 공개' : '🔒 비공개'}</span>
              <span className="separator-dot">·</span>
              <span className="leader-info">
                {(() => {
                  const president = group.members.find((m: any) => m.role === 'PRESIDENT');
                  if (president) {
                    const birthText = president.user.birthYear ? String(president.user.birthYear % 100).padStart(2, '0') : '';
                    return `리더 ${birthText ? birthText + '/' : ''}${president.user.displayName}/회장`;
                  }
                  return '리더 없음';
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="info-banner" style={{ margin: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage('')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              marginLeft: '8px',
              padding: '0 4px'
            }}
            title="닫기"
          >
            ✕
          </button>
        </div>
      )}

      {!isApproved && (
        <div className="group-preview-container">
          {/* 1. Group Introduction Card */}
          <div className="info-card">
            <h3 className="info-card-title">📖 모임 소개</h3>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink-dark)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {group.description || '등록된 모임 소개글이 없습니다.'}
            </p>
          </div>

          {/* 2. Group Specs / Info Summary */}
          <div className="info-card">
            <h3 className="info-card-title">ℹ️ 모임 기본 정보</h3>
            <div className="info-details-list">
              <div className="info-detail-row">
                <span className="info-detail-label">🏷️ 종목/카테고리</span>
                <span className="info-detail-val" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  {group.customSportName || group.category}
                </span>
              </div>
              <div className="info-detail-row">
                <span className="info-detail-label">📍 활동 지역</span>
                <span className="info-detail-val">
                  {group.activityRegion || '지역 미설정'}
                </span>
              </div>
              <div className="info-detail-row">
                <span className="info-detail-label">👥 회원 수</span>
                <span className="info-detail-val">
                  {group.members.length}명
                  {group.maxMembers ? ` (정원 ${group.maxMembers}명)` : ''}
                </span>
              </div>
              <div className="info-detail-row">
                <span className="info-detail-label">💰 정기 회비</span>
                <span className="info-detail-val">
                  {group.monthlyFee
                    ? `월 ${group.monthlyFee.toLocaleString()}원${group.dueDay ? ` (${group.dueDay === 31 ? '매월 말일' : `매월 ${group.dueDay}일`} 마감)` : ''}`
                    : group.dueDay
                    ? `${group.dueDay === 31 ? '매월 말일' : `매월 ${group.dueDay}일`} 마감`
                    : '회비 미설정'}
                  {group.officerFeeExempt && ' (운영진 면제)'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Arenas / Venues if any */}
          {group.arenas && group.arenas.length > 0 && (
            <div className="info-card">
              <h3 className="info-card-title">🏟️ 주요 활동 구장</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.arenas.map((arena: any, idx: number) => (
                  <div key={arena.id || idx} style={{ padding: '10px 12px', background: 'var(--grey-50)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink-dark)', marginBottom: '2px' }}>
                      {arena.placeName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      {arena.address}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Join CTA Action Banner */}
          <div className="group-preview-join-card">
            {!user ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/login')}
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800 }}
              >
                로그인하고 가입 신청하기
              </button>
            ) : !membership ? (
              <button
                type="button"
                className="btn-primary"
                onClick={handleJoin}
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800 }}
              >
                🌱 모임 가입 신청하기
              </button>
            ) : membership?.status === 'PENDING' ? (
              <div className="join-status-box">
                <p className="info-banner" style={{ margin: '0 0 10px 0', textAlign: 'center' }}>
                  ⏳ 가입 승인 대기 중입니다. 회장의 승인을 기다려 주세요.
                </p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleCancelJoin}
                  style={{ width: '100%' }}
                >
                  신청 취소
                </button>
              </div>
            ) : membership?.status === 'REJECTED' ? (
              <div className="join-status-box">
                <p className="info-banner info-banner--warn" style={{ margin: '0 0 10px 0', textAlign: 'center' }}>
                  가입이 거절되었습니다.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleJoin}
                  style={{ width: '100%' }}
                >
                  다시 가입 신청하기
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {isApproved && (
        <>
          {/* Tab Selector */}
          <nav className="group-detail-tab-navigation" aria-label="상세 탭 메뉴">
            <button
              type="button"
              className={`tab-navigation-btn${activeTab === 'posts' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              게시글
            </button>
            <button
              type="button"
              className={`tab-navigation-btn${activeTab === 'events' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              일정
            </button>
            {SHOW_GALLERY && (
              <button
                type="button"
                className={`tab-navigation-btn${activeTab === 'gallery' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('gallery')}
              >
                사진첩
              </button>
            )}
            <button
              type="button"
              className={`tab-navigation-btn${activeTab === 'members' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              멤버
            </button>
            <button
              type="button"
              className={`tab-navigation-btn${activeTab === 'payments' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              회비
            </button>
            <button
              type="button"
              className={`tab-navigation-btn${activeTab === 'officers' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('officers')}
            >
              이력
            </button>
            <button
              type="button"
              className={`tab-navigation-btn${activeTab === 'info' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              정보
            </button>
          </nav>

          {/* 1. 게시글 탭 (Posts Feed) */}
          {activeTab === 'posts' && (
            <div className="tab-content-posts">
              {/* Filter chips */}
              <div className="feed-filter-row">
                <button
                  type="button"
                  className={`feed-filter-chip ${feedFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFeedFilter('all')}
                >
                  전체글
                </button>
                <button
                  type="button"
                  className={`feed-filter-chip ${feedFilter === 'announcements' ? 'is-active' : ''}`}
                  onClick={() => setFeedFilter('announcements')}
                >
                  📢 공지사항
                </button>
              </div>

              {/* Write post modal popup */}
              {writingAnnouncement && (
                <div
                  className="post-write-modal-backdrop"
                  onClick={() => {
                    setWritingAnnouncement(false);
                    setAnnouncementTitle('');
                    setAnnouncementContent('');
                  }}
                >
                  <div className="post-write-modal-card" onClick={(e) => e.stopPropagation()}>
                    <div className="post-write-modal-header">
                      <h3 className="post-write-modal-title">
                        {postType === 'NOTICE' ? '📢 새 공지사항 등록' : '📝 새 게시글 작성'}
                      </h3>
                      <button
                        type="button"
                        className="post-write-modal-close"
                        onClick={() => {
                          setWritingAnnouncement(false);
                          setAnnouncementTitle('');
                          setAnnouncementContent('');
                        }}
                        title="닫기"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCreateAnnouncement} className="post-write-modal-body">
                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label className="post-write-field-label">제목</label>
                        <input
                          type="text"
                          placeholder={postType === 'NOTICE' ? '공지 제목을 입력하세요...' : '게시글 제목을 입력하세요...'}
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          required
                          autoComplete="off"
                          className="post-write-input"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="post-write-field-label">내용</label>
                        <textarea
                          placeholder={postType === 'NOTICE' ? '공지 내용을 입력하세요...' : '모임 회원들과 공유할 내용을 자유롭게 작성해보세요...'}
                          value={announcementContent}
                          onChange={(e) => setAnnouncementContent(e.target.value)}
                          required
                          rows={6}
                          className="post-write-textarea"
                        />
                      </div>

                      <div className="post-write-modal-actions">
                        <button
                          type="button"
                          className="post-write-btn-cancel"
                          onClick={() => {
                            setWritingAnnouncement(false);
                            setAnnouncementTitle('');
                            setAnnouncementContent('');
                          }}
                        >
                          취소
                        </button>
                        <button type="submit" className="post-write-btn-submit">
                          등록
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Feed Items List */}
              {filteredFeedItems.length === 0 ? (
                <p className="feed-empty-text">작성된 글이 없습니다.</p>
              ) : (
                <div className="feed-list">
                  {filteredFeedItems.map((item) => {
                    return (
                      <div key={`${item.feedType}-${item.id}`} className="feed-card">
                        {/* Post Header */}
                        <div className="feed-card-header">
                          {item.author.profileImageUrl ? (
                            <img src={item.author.profileImageUrl} alt="" className="feed-card-avatar" />
                          ) : (
                            <div className="feed-card-avatar-fallback">{item.author.displayName[0]}</div>
                          )}
                          <div className="feed-card-meta">
                            <span className="feed-card-author-name">
                              {formatCommentAuthorBadge(item.author)}
                            </span>
                            <div className="feed-card-time-row">
                              <span className="feed-card-time">
                                {item.createdAt.toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {item.isNotice ? (
                                <span className="feed-card-badge">중요공지</span>
                              ) : (
                                <span className="feed-card-badge feed-card-badge--general">일반글</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Post Body Content */}
                        <div className="feed-card-body">
                          <h3 className="feed-announcement-title">{item.title}</h3>
                          <p className="feed-card-text">{item.content}</p>
                        </div>

                        {/* Post Footer info */}
                        <div className="feed-card-footer">
                          <span className="feed-footer-stat">
                            댓글 {getAnnouncementComments(item.id).length}
                          </span>
                        </div>

                        {/* Direct 4-Emoji Reaction Bar */}
                        <div className="feed-reaction-bar">
                          {REACTION_OPTIONS.map(({ type, emoji }) => {
                            const itemMap = reactionsMap[item.id] || {
                              LIKE: { count: 0, active: false },
                              BEST: { count: 0, active: false },
                              DISLIKE: { count: 0, active: false },
                              CHECK: { count: 0, active: false },
                            };
                            const reaction = itemMap[type] || { count: 0, active: false };
                            return (
                              <button
                                key={type}
                                type="button"
                                className={`feed-reaction-btn${reaction.active ? ' is-active' : ''}`}
                                onClick={() => handleToggleReaction(item.id, type)}
                              >
                                <span className="feed-reaction-emoji">{emoji}</span>
                                {reaction.count > 0 && (
                                  <span className="feed-reaction-count">{reaction.count}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Inline Comments Thread */}
                        <div className="feed-comments-thread">
                          <div className="feed-comments-list">
                            {getAnnouncementComments(item.id).map((c) => (
                              <div key={c.id} className="feed-comment-item">
                                <div className="feed-comment-avatar-fallback">👤</div>
                                <div className="feed-comment-body">
                                  <div className="feed-comment-author-row">
                                    <span className="feed-comment-author">
                                      {formatCommentAuthorBadge(c.author)}
                                    </span>
                                    <span className="feed-comment-time">{c.time}</span>
                                  </div>
                                  <p className="feed-comment-content">{c.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="feed-comment-input-row">
                            <input
                              id={`input-${item.id}`}
                              type="text"
                              placeholder="댓글을 입력하세요..."
                              className="feed-comment-input"
                              value={commentInputs[item.id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                  e.preventDefault();
                                  handleAddAnnouncementComment(item.id, commentInputs[item.id] || '');
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="feed-comment-submit-btn"
                              onClick={() => handleAddAnnouncementComment(item.id, commentInputs[item.id] || '')}
                            >
                              등록
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. 일정 탭 (Events List View) */}
          {activeTab === 'events' && (
            <div className="tab-content-events">
              <div className="event-sub-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--grey-50)', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEventSubTab('upcoming')}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: eventSubTab === 'upcoming' ? 'var(--surface)' : 'transparent',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: eventSubTab === 'upcoming' ? 'var(--accent)' : 'var(--ink-muted)',
                    cursor: 'pointer',
                    boxShadow: eventSubTab === 'upcoming' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  진행 중 일정 ({upcomingEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEventSubTab('past')}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: eventSubTab === 'past' ? 'var(--surface)' : 'transparent',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: eventSubTab === 'past' ? 'var(--accent)' : 'var(--ink-muted)',
                    cursor: 'pointer',
                    boxShadow: eventSubTab === 'past' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  지난 일정 ({pastEvents.length})
                </button>
              </div>

              {(eventSubTab === 'upcoming' ? upcomingEvents : pastEvents).length === 0 ? (
                <p className="empty-inline">조건에 맞는 일정이 없습니다.</p>
              ) : (
                <ul className="event-list">
                  {(eventSubTab === 'upcoming' ? upcomingEvents : pastEvents).map((ev) => (
                    <li key={ev.id} style={{ marginBottom: '10px' }}>
                      <div className="event-item-card-wrapper" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', boxShadow: 'var(--shadow-1)' }}>
                        <Link to={`/events/${ev.id}`} className="event-item" style={{ border: 'none', padding: 0, background: 'transparent', margin: 0 }}>
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '14.5px', color: 'var(--ink-dark)' }}>{ev.title}</strong>
                            {ev.status === 'CANCELLED' && (
                              <span className="status-cancelled" style={{ marginLeft: '6px' }}>취소됨</span>
                            )}
                            <span className="event-meta" style={{ display: 'block', marginTop: '4px', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                              📅 {formatEventDate(ev.date)}{' '}
                              {formatEventTimeRange(ev.startTime, ev.endTime)}{' '}
                              · 📍 {ev.location}
                            </span>
                          </div>
                          <span className="vote-pill" style={{ flexShrink: 0, fontSize: '12px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: 'var(--blue-50)', color: 'var(--accent)' }}>
                            투표 {ev._count?.votes ?? 0}명
                          </span>
                        </Link>
                        {ev.status === 'ACTIVE' && (
                          <div className="quick-vote-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--grey-100)' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-tertiary)' }}>원터치 투표:</span>
                            <button
                              type="button"
                              className="quick-vote-pill quick-vote-pill--attend"
                              onClick={(e) => handleQuickVote(e, ev.id, 'ATTEND')}
                              title="원터치 참석 투표"
                            >
                              ⚽ 참석
                            </button>
                            <button
                              type="button"
                              className="quick-vote-pill quick-vote-pill--absent"
                              onClick={(e) => handleQuickVote(e, ev.id, 'ABSENT')}
                              title="원터치 불참 투표"
                            >
                              🚫 불참
                            </button>
                            <button
                              type="button"
                              className="quick-vote-pill quick-vote-pill--late"
                              onClick={(e) => handleQuickVote(e, ev.id, 'LATE')}
                              title="원터치 늦참 투표"
                            >
                              ⏰ 늦참
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 3. 사진첩 탭 (Gallery View - Currently hidden via feature flag) */}
          {SHOW_GALLERY && activeTab === 'gallery' && (
            <div className="tab-content-gallery">

              {uploadingMedia && (
                <div style={{ padding: '16px', background: 'var(--blue-50)', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>
                  ⏳ 미디어를 업로드하는 중입니다. 잠시만 기다려 주세요...
                </div>
              )}

              {mediaFiles.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '45vh', color: 'var(--ink-muted)' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>업로드된 사진이나 동영상이 없습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {mediaFiles.map((m, idx) => (
                    <div
                      key={m.id}
                        className="gallery-item"
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '12px',
                          background: 'var(--grey-100)',
                          aspectRatio: '1/1',
                          boxShadow: 'var(--shadow-1)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedMediaIndex(idx)}
                      >
                        {m.fileType === 'VIDEO' ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <video
                              src={m.url}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, pointerEvents: 'none' }}>
                              ▶ Video
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: '100%' }}>
                            <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}

                        <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
                          {m.uploadedBy?.profileImageUrl ? (
                            <img src={m.uploadedBy.profileImageUrl} alt="" style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
                          ) : (
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', color: '#333', display: 'grid', placeItems: 'center', fontSize: '8px', fontWeight: 700 }}>
                              {m.uploadedBy?.displayName?.[0] || 'U'}
                            </div>
                          )}
                          <span style={{ fontSize: '10px', color: '#fff', fontWeight: 600 }}>{m.uploadedBy?.displayName}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. 멤버 탭 (Members View) */}
          {activeTab === 'members' && (
            <div className="tab-content-members">
              {/* 1. My Activity Status */}
              {(() => {
                const myMembershipRecord = group.members.find((m: any) => m.userId === user?.id);
                const rawStatus = myMembershipRecord?.userStatus || 'ACTIVE';
                const isInactive = rawStatus.startsWith('INACTIVE_') || rawStatus === 'INJURED' || rawStatus === 'UNAVAILABLE';
                const currentMainStatus = isInactive ? 'INACTIVE' : 'ACTIVE';

                let currentReason = 'INJURED';
                if (rawStatus === 'INJURED' || rawStatus === 'INACTIVE_INJURED') currentReason = 'INJURED';
                else if (rawStatus === 'INACTIVE_BUSINESS_TRIP') currentReason = 'BUSINESS_TRIP';
                else if (rawStatus === 'INACTIVE_CHILDCARE') currentReason = 'CHILDCARE';
                else if (rawStatus === 'INACTIVE_WORK') currentReason = 'WORK';
                else if (rawStatus === 'INACTIVE_OTHER' || rawStatus === 'UNAVAILABLE') currentReason = 'OTHER';

                const handleSelectMainStatus = async (mainType: 'ACTIVE' | 'INACTIVE') => {
                  if (mainType === 'ACTIVE') {
                    await handleUpdateMyStatus('ACTIVE');
                  } else {
                    await handleUpdateMyStatus(`INACTIVE_${currentReason}`);
                  }
                };

                const handleSelectReason = async (reasonKey: string) => {
                  await handleUpdateMyStatus(`INACTIVE_${reasonKey}`);
                };

                return (
                  <section className="compact-activity-status-card">
                    <div className="compact-activity-status-header">
                      <span className="compact-activity-status-label">내 활동 상태</span>
                      <span className={`compact-activity-status-badge ${currentMainStatus === 'ACTIVE' ? 'is-active' : 'is-inactive'}`}>
                        {currentMainStatus === 'ACTIVE'
                          ? '🟢 정상 활동'
                          : `🔴 ${INACTIVE_REASON_OPTIONS.find((o) => o.value === currentReason)?.label || '장기 불참'}`}
                      </span>
                    </div>
                    <div className="compact-activity-controls-row">
                      <div className="compact-segmented-toggle">
                        <button
                          type="button"
                          className={`compact-toggle-btn ${currentMainStatus === 'ACTIVE' ? 'is-selected' : ''}`}
                          onClick={() => handleSelectMainStatus('ACTIVE')}
                        >
                          <span>🟢 정상</span>
                        </button>
                        <button
                          type="button"
                          className={`compact-toggle-btn ${currentMainStatus === 'INACTIVE' ? 'is-selected' : ''}`}
                          onClick={() => handleSelectMainStatus('INACTIVE')}
                        >
                          <span>🔴 장기 불참</span>
                        </button>
                      </div>
                      {currentMainStatus === 'INACTIVE' && (
                        <div className="compact-reason-wrapper">
                          <select
                            id="inactive-reason-select"
                            className="compact-reason-select"
                            value={currentReason}
                            onChange={(e) => handleSelectReason(e.target.value)}
                            aria-label="불참 사유 선택"
                          >
                            {INACTIVE_REASON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

              {/* 2. Join Requests (Officers only) */}
              {isOfficer && group.pendingRequests.length > 0 && (
                <section className="section-block">
                  <h2 className="tab-section-title">가입 신청 ({group.pendingRequests.length})</h2>
                  <p className="section-desc">회장/운영진이 승인·거절할 수 있어요.</p>
                  <ul className="member-list">
                    {group.pendingRequests.map((m: any) => (
                      <li key={m.id} className="member-item-card">
                        <Link to={`/profile/${m.user.id}`} className="member-item-card__left">
                          {m.user.profileImageUrl ? (
                            <img src={m.user.profileImageUrl} alt="" className="member-item-card__avatar" />
                          ) : (
                            <div className="member-item-card__avatar-fallback">{m.user.displayName[0]}</div>
                          )}
                          <div className="member-item-card__info">
                            <div className="member-item-card__name-row">
                              <span className="member-item-card__name">
                                {formatMemberNameWithEmoji(m.user)}
                              </span>
                            </div>
                            {m.user.phoneNumber && (
                              <span className="member-item-card__phone">
                                {formatPhoneNumber(m.user.phoneNumber)}
                              </span>
                            )}
                          </div>
                        </Link>
                        <div className="member-item-card__right">
                          <button
                            type="button"
                            className="btn-sm btn-primary"
                            onClick={() => handleApprove(m.user.id, 'APPROVED')}
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            className="btn-sm btn-ghost"
                            onClick={() => handleApprove(m.user.id, 'REJECTED')}
                          >
                            거절
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 3. Members List */}
              {(() => {
                const officerCount = sortedMembers.filter(
                  (m: any) =>
                    m.role === 'PRESIDENT' ||
                    m.role === 'VICE_PRESIDENT' ||
                    m.role === 'SECRETARY' ||
                    m.role === 'OFFICER'
                ).length;

                const regularMemberCount = sortedMembers.filter((m: any) => m.role === 'MEMBER').length;

                const injuredCount = sortedMembers.filter(
                  (m: any) =>
                    m.userStatus === 'INJURED' ||
                    m.userStatus === 'INACTIVE_INJURED' ||
                    m.userStatus?.startsWith('INACTIVE_') ||
                    m.userStatus === 'UNAVAILABLE'
                ).length;

                const filteredMembers = sortedMembers.filter((m: any) => {
                  const isStaff =
                    m.role === 'PRESIDENT' ||
                    m.role === 'VICE_PRESIDENT' ||
                    m.role === 'SECRETARY' ||
                    m.role === 'OFFICER';
                  const isInjured =
                    m.userStatus === 'INJURED' ||
                    m.userStatus === 'INACTIVE_INJURED' ||
                    m.userStatus?.startsWith('INACTIVE_') ||
                    m.userStatus === 'UNAVAILABLE';

                  if (memberFilter === 'officer') return isStaff;
                  if (memberFilter === 'member') return m.role === 'MEMBER';
                  if (memberFilter === 'injured') return isInjured;
                  return true;
                });

                return (
                  <section className="section-block">
                    <div className="member-list-filter-header">
                      <h2 className="tab-section-title" style={{ margin: 0 }}>
                        회원 목록 ({filteredMembers.length}명)
                      </h2>
                      <div className="member-filter-pills-bar">
                        <button
                          type="button"
                          className={`member-filter-pill ${memberFilter === 'all' ? 'is-active' : ''}`}
                          onClick={() => setMemberFilter('all')}
                        >
                          전체 ({sortedMembers.length})
                        </button>
                        <button
                          type="button"
                          className={`member-filter-pill ${memberFilter === 'officer' ? 'is-active' : ''}`}
                          onClick={() => setMemberFilter('officer')}
                        >
                          운영진 ({officerCount})
                        </button>
                        <button
                          type="button"
                          className={`member-filter-pill ${memberFilter === 'member' ? 'is-active' : ''}`}
                          onClick={() => setMemberFilter('member')}
                        >
                          회원 ({regularMemberCount})
                        </button>
                        <button
                          type="button"
                          className={`member-filter-pill member-filter-pill--injured ${memberFilter === 'injured' ? 'is-active' : ''}`}
                          onClick={() => setMemberFilter('injured')}
                        >
                          부상자 ({injuredCount})
                        </button>
                      </div>
                    </div>

                    {filteredMembers.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '36px 0', color: 'var(--ink-muted)', fontSize: '13px' }}>
                        해당 조건의 회원이 없습니다.
                      </p>
                    ) : (
                      <ul className="member-list">
                        {filteredMembers.map((m: any) => {
                          const isPresidentRole = m.role === 'PRESIDENT';
                          const isStaff = m.role === 'VICE_PRESIDENT' || m.role === 'SECRETARY' || m.role === 'OFFICER';
                          const badgeClass = isPresidentRole
                            ? 'member-item-card__badge--president'
                            : isStaff
                              ? 'member-item-card__badge--officer'
                              : '';

                    return (
                      <li key={m.id} className="member-item-card">
                        <Link to={`/profile/${m.user.id}`} className="member-item-card__left">
                          {m.user.profileImageUrl ? (
                            <img src={m.user.profileImageUrl} alt="" className="member-item-card__avatar" />
                          ) : (
                            <div className="member-item-card__avatar-fallback">{m.user.displayName[0]}</div>
                          )}
                          <div className="member-item-card__info">
                            <div className="member-item-card__name-row">
                              <span className="member-item-card__name">
                                {roleEmoji(m.role)}
                                {formatMemberNameWithEmoji(m.user)}
                              </span>
                              <span className={`member-item-card__badge ${badgeClass}`}>
                                {ROLE_LABELS[m.role]}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                              {m.userStatus && (
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                                  상태: {userStatusLabels[m.userStatus] || m.userStatus}
                                </span>
                              )}
                              {m.user.phoneNumber && (
                                <span className="member-item-card__phone">
                                  · {formatPhoneNumber(m.user.phoneNumber)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>

                        <div className="member-item-card__right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isPresident && m.role === 'PRESIDENT' && (
                            <span className="member-list__transfer">
                              {!showTransfer ? (
                                <button
                                  type="button"
                                  className="btn-sm btn-outline"
                                  onClick={() => setShowTransfer(true)}
                                >
                                  회장 양도
                                </button>
                              ) : (
                                <span className="transfer-panel">
                                  <select
                                    className="role-select"
                                    value={transferTargetId}
                                    onChange={(e) => setTransferTargetId(e.target.value)}
                                  >
                                    <option value="">회원 선택</option>
                                    {transferCandidates.map((c) => (
                                      <option key={c.id} value={c.user.id}>
                                        {formatMemberDisplayName(c.user)}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="btn-sm btn-primary"
                                    disabled={!transferTargetId}
                                    onClick={handleTransfer}
                                  >
                                    확인
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-sm btn-ghost"
                                    onClick={() => {
                                      setShowTransfer(false);
                                      setTransferTargetId('');
                                    }}
                                  >
                                    취소
                                  </button>
                                </span>
                              )}
                            </span>
                          )}
                          {isPresident && m.role !== 'PRESIDENT' && (
                            <select
                              className="role-select"
                              value={m.role}
                              onChange={(e) => handleSetRole(m.user.id, e.target.value)}
                              aria-label={`${m.user.displayName} 역할 변경`}
                            >
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {isOfficer && m.user.id !== user?.id && m.role !== 'PRESIDENT' && (isPresident || m.role === 'MEMBER') && (
                            <button
                              type="button"
                              className="btn-sm btn-outline"
                              style={{ 
                                color: '#dc3545', 
                                borderColor: '#dc3545',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleKick(m.user.id, m.user.displayName)}
                            >
                              강퇴
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })()}
        </div>
      )}

          {/* 5. 회비 탭 (Payments Board View) */}
          {activeTab === 'payments' && (
            <div className="tab-content-payments">
              <div className="payments-board">
                {/* Compact Payments Control Header */}
                <div className="compact-payments-header-card">
                  {/* Top Row: Month Picker & Filter Group */}
                  <div className="compact-payments-top-row">
                    <div className="compact-month-picker">
                      <button type="button" onClick={prevMonth} className="compact-month-btn" title="이전달">‹</button>
                      <span className="compact-month-title">{payYear}년 {payMonth}월</span>
                      <button type="button" onClick={nextMonth} className="compact-month-btn" title="다음달">›</button>
                    </div>

                    {paymentData && (() => {
                      const totalCount = paymentData.payments.length;
                      const paidCount = paymentData.payments.filter((p: any) => p.isPaid).length;
                      const unpaidCount = paymentData.payments.filter((p: any) => !p.isPaid).length;

                      return (
                        <div className="compact-payment-filter-group">
                          <button
                            type="button"
                            onClick={() => setPaymentFilter('all')}
                            className={`compact-filter-pill ${paymentFilter === 'all' ? 'is-active' : ''}`}
                          >
                            전체 {totalCount}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentFilter('paid')}
                            className={`compact-filter-pill compact-filter-pill--paid ${paymentFilter === 'paid' ? 'is-active' : ''}`}
                          >
                            납부 {paidCount}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentFilter('unpaid')}
                            className={`compact-filter-pill compact-filter-pill--unpaid ${paymentFilter === 'unpaid' ? 'is-active' : ''}`}
                          >
                            미납 {unpaidCount}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Middle Row: Full-width Dues Completion Progress Card */}
                  {paymentData && (() => {
                    const totalCount = paymentData.payments.length;
                    const paidCount = paymentData.payments.filter((p: any) => p.isPaid).length;
                    const unpaidCount = paymentData.payments.filter((p: any) => !p.isPaid).length;
                    const pct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

                    return (
                      <div className="compact-dues-progress-card" style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-dark)' }}>💰 {payYear}년 {payMonth}월 완납 현황</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#10b981' }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--grey-200)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', fontWeight: 700 }}>
                          <span style={{ color: '#10b981' }}>✅ 완납 {paidCount}명</span>
                          <span style={{ color: '#ef4444' }}>⏳ 미납 {unpaidCount}명</span>
                          <span style={{ color: 'var(--ink-muted)' }}>총 {totalCount}명</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bottom Row: Fee Info & Remind Action */}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(group.monthlyFee || group.dueDay) && (
                      <div className="compact-dues-notice-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                        <span>💡 {group.monthlyFee ? `월 ` + group.monthlyFee.toLocaleString() + `원` : ''}{group.dueDay ? ` (${group.dueDay === 31 ? '매월 말일' : `매월 ${group.dueDay}일`} 납부)` : ''}</span>
                        {group.officerFeeExempt && (
                          <span className="compact-dues-notice-badge">운영진 면제</span>
                        )}
                      </div>
                    )}

                    {isOfficer && (
                      <div style={{ marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={handleRemindUnpaid}
                          style={{
                            width: '100%',
                            fontSize: '13px',
                            fontWeight: 700,
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#ef4444',
                            color: '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
                          }}
                        >
                          📣 미납 회원 1초 독촉 알림 발송
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {paymentData && (() => {
                  const filteredPayments = paymentData.payments.filter((p: any) => {
                    if (paymentFilter === 'paid') return p.isPaid;
                    if (paymentFilter === 'unpaid') return !p.isPaid;
                    return true;
                  });

                  return (
                    <>
                      {filteredPayments.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-muted)', fontSize: '13px' }}>
                          {paymentFilter === 'paid'
                            ? '납부 완료된 회원이 없습니다.'
                            : paymentFilter === 'unpaid'
                            ? '미납된 회원이 없습니다.'
                            : '등록된 회비 데이터가 없습니다.'}
                        </p>
                      ) : (
                        <div className="payments-grid">
                          {filteredPayments.map((p: any) => {
                            return (
                              <div key={p.userId} className="payment-checklist-item">
                                <div className="payment-member-info">
                                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                                    {formatMemberNameWithEmoji(p)}
                                  </span>
                                  {p.isExempt && <span className="payment-exempt-badge">면제</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {p.isPaid && p.paidByName && (
                                    <span
                                      className="payment-recorder-name"
                                      style={{
                                        fontSize: '11.5px',
                                        color: 'var(--ink-muted, #64748b)',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {p.isExempt ? '임원면제' : `${p.paidByName} 확인`}
                                    </span>
                                  )}
                                  {isOfficer ? (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePayment(p.userId)}
                                      disabled={p.isExempt}
                                      className={`payment-toggle-btn${p.isPaid ? ' is-paid' : ''}`}
                                    >
                                      {p.isPaid ? '납부완료' : '미납'}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: p.isPaid ? 'var(--green-500)' : 'var(--red-500)' }}>
                                      {p.isPaid ? '납부완료' : '미납'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 6. 이력 탭 (Officer Histories View) */}
          {activeTab === 'officers' && (
            <div className="tab-content-officers">
              <div className="officers-history-section">
                <h2 className="tab-section-title">역대 운영진 이력</h2>
                {group.officerHistories && group.officerHistories.length === 0 ? (
                  <p className="empty-inline">이력이 존재하지 않습니다.</p>
                ) : (
                  <div className="officer-history-list">
                    {group.officerHistories.map((h: any) => (
                      <div key={h.id} className="officer-history-item">
                        <span className="officer-history-period">
                          {formatHistoryDate(h.startDate)} ~ {h.endDate ? formatHistoryDate(h.endDate) : '현재'}
                        </span>
                        <div className="officer-history-details">
                          <span className="officer-history-role">
                            {roleEmoji(h.role)} {ROLE_LABELS[h.role]}
                          </span>
                          <span>{formatMemberNameWithEmoji(h.user)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. 정보 탭 (Info / Settings View) */}
          {activeTab === 'info' && (
            <div className="tab-content-info">
              <div className="info-main-panel">
                {/* Basic information details */}
                <div className="info-card">
                  <h3 className="info-card-title">모임 기본 정보</h3>
                  <div className="info-detail-row">
                    <span className="info-detail-label">카테고리</span>
                    <span className="info-detail-val">
                      {formatCategoryEmoji(group.category)}{' '}
                      {group.category === '기타' && group.customSportName
                        ? group.customSportName
                        : normalizeCategory(group.category)}
                    </span>
                  </div>
                  {group.activityRegion && (
                    <div className="info-detail-row">
                      <span className="info-detail-label">활동 지역</span>
                      <span className="info-detail-val">{group.activityRegion}</span>
                    </div>
                  )}
                  <div className="info-detail-row">
                    <span className="info-detail-label">공개 여부</span>
                    <span className="info-detail-val">{group.isPublic ? '공개 모임' : '비공개 모임'}</span>
                  </div>
                  {group.description && (
                    <div className="info-detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span className="info-detail-label">모임 소개</span>
                      <p className="info-detail-desc-text">{group.description}</p>
                    </div>
                  )}
                </div>

                {/* Bank accounts information */}
                {hasBankAccount && (
                  <div className="info-card">
                    <h3 className="info-card-title">💵 모임 회비 통장</h3>
                    {group.bankName && (
                      <div className="info-detail-row">
                        <span className="info-detail-label">은행</span>
                        <span className="info-detail-val">{group.bankName}</span>
                      </div>
                    )}
                    {group.bankAccountNumber && (
                      <div className="info-detail-row">
                        <span className="info-detail-label">계좌번호</span>
                        <span className="info-detail-val group-hero__bank-account" style={{ border: 'none', padding: 0 }}>
                          <span>{group.bankAccountNumber}</span>
                          <button
                            type="button"
                            className="btn-sm btn-outline"
                            onClick={handleCopyAccountNumber}
                            style={{ marginLeft: '8px' }}
                          >
                            {accountCopied ? '복사됨' : '복사'}
                          </button>
                        </span>
                      </div>
                    )}
                    {group.bankAccountHolder && (
                      <div className="info-detail-row">
                        <span className="info-detail-label">예금주</span>
                        <span className="info-detail-val">{group.bankAccountHolder}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Settings Admin panel */}
                {isOfficer && (
                  <div className="info-card">
                    <h3 className="info-card-title">⚙️ 관리자 설정</h3>
                    <Link to={`/groups/${group.id}/edit`} className="info-menu-action-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <span>✏️ 모임 설정 수정 (정보/계좌 등)</span>
                      <span className="arrow-indicator">〉</span>
                    </Link>
                  </div>
                )}

                {/* Dissolve Group Action (President only, bottom right) */}
                {isPresident && (
                  <div className="group-dissolve-footer-row">
                    <button
                      type="button"
                      className="btn-dissolve-group"
                      onClick={handleDissolveGroup}
                    >
                      💥 모임 해체하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Action Button (FAB) popover & triggers for ALL approved members on posts & events tabs */}
      {membership?.status === 'APPROVED' && (activeTab === 'posts' || activeTab === 'events') && (
        <div className="fab-menu-container">
          {showWriteMenu && (
            <>
              <div
                className="fab-backdrop"
                onClick={() => setShowWriteMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 990 }}
              />
              <div className="fab-menu-popover" style={{ zIndex: 995 }}>
                <button
                  type="button"
                  className="fab-popover-item"
                  onClick={() => {
                    setActiveTab('posts');
                    setPostType('GENERAL');
                    setAnnouncementTitle('');
                    setAnnouncementContent('');
                    setWritingAnnouncement(true);
                    setShowWriteMenu(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  📝 게시글 작성
                </button>
                {isOfficer && (
                  <>
                    <button
                      type="button"
                      className="fab-popover-item"
                      onClick={() => {
                        setActiveTab('posts');
                        setPostType('NOTICE');
                        setAnnouncementTitle('');
                        setAnnouncementContent('');
                        setWritingAnnouncement(true);
                        setShowWriteMenu(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      📢 공지글 작성
                    </button>
                    <Link
                      to={`/groups/${group.id}/events/new`}
                      className="fab-popover-item"
                      style={{ textDecoration: 'none' }}
                      onClick={() => setShowWriteMenu(false)}
                    >
                      <span>📅</span> 일정/투표 등록
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
          <button
            type="button"
            className={`fab-button ${showWriteMenu ? 'is-active' : ''}`}
            onClick={() => setShowWriteMenu(!showWriteMenu)}
            title="글쓰기"
          >
            ✏️
          </button>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="fab-menu-container">
          <label
            className="fab-button"
            title="사진 업로드"
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 0 }}
          >
            📷
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleUploadMedia}
              disabled={uploadingMedia}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      {/* In-App Fullscreen Gallery Lightbox Modal */}
      {selectedMediaIndex !== null && mediaFiles[selectedMediaIndex] && (
        <div
          className="media-lightbox-overlay"
          onClick={() => setSelectedMediaIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="media-lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div className="media-lightbox-uploader">
              {mediaFiles[selectedMediaIndex].uploadedBy?.profileImageUrl ? (
                <img
                  src={mediaFiles[selectedMediaIndex].uploadedBy.profileImageUrl}
                  alt=""
                  className="media-lightbox-uploader-avatar"
                />
              ) : (
                <div className="media-lightbox-uploader-fallback">
                  {mediaFiles[selectedMediaIndex].uploadedBy?.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="media-lightbox-uploader-info">
                <span className="media-lightbox-uploader-name">
                  {mediaFiles[selectedMediaIndex].uploadedBy?.displayName}
                </span>
                <span className="media-lightbox-index-badge">
                  {selectedMediaIndex + 1} / {mediaFiles.length}
                </span>
              </div>
            </div>
            <div className="media-lightbox-header-actions">
              {(isOfficer ||
                mediaFiles[selectedMediaIndex].uploadedById === user?.id ||
                mediaFiles[selectedMediaIndex].uploadedBy?.id === user?.id) && (
                <button
                  type="button"
                  className="media-lightbox-delete-btn"
                  onClick={() => handleDeleteMedia(mediaFiles[selectedMediaIndex].id)}
                  title="사진 삭제"
                >
                  🗑️ 삭제
                </button>
              )}
              <button
                type="button"
                className="media-lightbox-close-btn"
                onClick={() => setSelectedMediaIndex(null)}
                title="닫기"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="media-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {mediaFiles[selectedMediaIndex].fileType === 'VIDEO' ? (
              <video
                src={mediaFiles[selectedMediaIndex].url}
                controls
                autoPlay
                className="media-lightbox-media-elem"
              />
            ) : (
              <img
                src={mediaFiles[selectedMediaIndex].url}
                alt="확대 사진"
                className="media-lightbox-media-elem"
              />
            )}

            {mediaFiles.length > 1 && (
              <>
                {selectedMediaIndex > 0 && (
                  <button
                    type="button"
                    className="media-lightbox-nav-btn media-lightbox-prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMediaIndex(selectedMediaIndex - 1);
                    }}
                    title="이전 사진"
                  >
                    ‹
                  </button>
                )}
                {selectedMediaIndex < mediaFiles.length - 1 && (
                  <button
                    type="button"
                    className="media-lightbox-nav-btn media-lightbox-next"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMediaIndex(selectedMediaIndex + 1);
                    }}
                    title="다음 사진"
                  >
                    ›
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
