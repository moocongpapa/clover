import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  api,
  formatCategoryEmoji,
  formatEventDate,
  formatEventTimeRange,
  ASSIGNABLE_ROLES,
  formatMemberDisplayName,
  formatPhoneNumber,
  isStaffRole,
  normalizeCategory,
  ROLE_LABELS,
  ROLE_SORT_ORDER,
  type Event,
} from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import './GroupDetail.css';

declare global {
  interface Window {
    kakao: any;
  }
}

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

  // Gallery States
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<GroupTab>('posts');
  const [eventSubTab, setEventSubTab] = useState<'upcoming' | 'past'>('upcoming');

  // New Feed States
  const [eventCommentsMap, setEventCommentsMap] = useState<Record<string, any[]>>({});
  const [eventVotesMap, setEventVotesMap] = useState<Record<string, any>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [feedFilter, setFeedFilter] = useState<'all' | 'announcements'>('all');
  const [showWriteMenu, setShowWriteMenu] = useState(false);

  // Month Picker State for Payments
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);

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
      return d.getTime() < Date.now();
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

  // Load comments and votes for all events when events list changes
  useEffect(() => {
    if (events.length > 0) {
      events.forEach((ev) => {
        api.getComments(ev.id)
          .then((res) => {
            setEventCommentsMap((prev) => ({ ...prev, [ev.id]: res }));
          })
          .catch(() => {});

        api.getVotes(ev.id)
          .then((res) => {
            setEventVotesMap((prev) => ({ ...prev, [ev.id]: res }));
          })
          .catch(() => {});
      });
    }
  }, [events]);

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

  const handleUpdateMyStatus = async (userStatus: string) => {
    try {
      await api.updateMyStatus(group.id, userStatus);
      load();
      setMessage('활동 상태가 업데이트되었습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '활동 상태 변경 실패');
    }
  };

  const getMemberHeaderInfo = (userObj: any) => {
    if (!group || !group.members) return userObj.displayName;
    const member = group.members.find((m: any) => m.user.id === userObj.id);
    const roleLabel = member ? ROLE_LABELS[member.role] : '회원';
    const birthYearText = userObj.birthYear ? `${String(userObj.birthYear % 100).padStart(2, '0')}` : '';
    return `${birthYearText ? birthYearText + '/' : ''}${userObj.displayName}/${roleLabel}`;
  };

  const handleAddFeedComment = async (eventId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await api.addComment(eventId, content);
      // Reload comments for this event
      const res = await api.getComments(eventId);
      setEventCommentsMap((prev) => ({ ...prev, [eventId]: res }));
      setCommentInputs((prev) => ({ ...prev, [eventId]: '' }));
    } catch (e) {
      alert(e instanceof Error ? e.message : '댓글 등록 실패');
    }
  };

  const handleVoteDirect = async (eventId: string, choice: 'ATTEND' | 'LATE' | 'ABSENT') => {
    try {
      const currentVote = eventVotesMap[eventId]?.myVote?.choice;
      if (currentVote === choice) {
        await api.cancelVote(eventId);
      } else {
        await api.castVote(eventId, choice);
      }
      // Reload votes for this event
      const res = await api.getVotes(eventId);
      setEventVotesMap((prev) => ({ ...prev, [eventId]: res }));

      // Reload event list to update general event stats (like total vote count)
      if (id) {
        const e = await api.listEvents(id);
        setEvents(e);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '투표 처리에 실패했습니다.');
    }
  };

  const feedItems = (() => {
    if (!group) return [];
    const items = [
      ...announcements.map((ann) => ({
        feedType: 'announcement' as const,
        id: ann.id,
        title: ann.title,
        content: ann.content,
        createdAt: new Date(ann.createdAt),
        author: ann.author,
        raw: ann,
      })),
      ...events.map((ev) => ({
        feedType: 'event' as const,
        id: ev.id,
        title: ev.title,
        content: ev.description,
        createdAt: new Date(ev.date),
        author: ev.createdBy,
        raw: ev,
      })),
    ];
    // Sort descending by date/createdAt
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  })();

  const filteredFeedItems = feedFilter === 'announcements'
    ? feedItems.filter(item => item.feedType === 'announcement')
    : feedItems;

  const roleEmoji = (role: string) => {
    if (role === 'PRESIDENT') return '👑 ';
    if (role === 'VICE_PRESIDENT') return '🥈 ';
    if (role === 'SECRETARY') return '📋 ';
    if (role === 'OFFICER') return '⭐ ';
    return '';
  };

  const formatMemberNameWithEmoji = (mUser: any) => {
    const genderEmoji = mUser.gender === 'MALE' ? '🙋‍♂️' : mUser.gender === 'FEMALE' ? '🙋‍♀️' : '👤';
    const birthYearTwoDigits = mUser.birthYear ? String(mUser.birthYear).slice(-2) : '';
    return `${genderEmoji} ${birthYearTwoDigits ? birthYearTwoDigits + ' ' : ''}${mUser.displayName}`;
  };

  const formatHistoryDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
      await api.createAnnouncement({
        title: announcementTitle,
        content: announcementContent,
        groupId: id,
      });
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setWritingAnnouncement(false);
      const ann = await api.listAnnouncements(id);
      setAnnouncements(ann);
    } catch (err) {
      alert(err instanceof Error ? err.message : '공지사항 등록 실패');
    }
  };

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingMedia(true);
    try {
      const uploaded = await api.uploadGalleryFile(file);
      await api.createGroupMedia(id, {
        url: uploaded.url,
        fileType: uploaded.fileType,
      });
      const med = await api.getGroupMedia(id);
      setMediaFiles(med);
    } catch (err) {
      alert(err instanceof Error ? err.message : '미디어 업로드 실패');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Emojis for member activity status
  const userStatusLabels: Record<string, string> = {
    HEALTHY: '🟢',
    INJURED: '🤕',
    UNAVAILABLE: '🚨',
  };

  return (
    <div className="group-detail">
      {/* Header Bar */}
      <div className="group-detail-header-bar">
        <button type="button" onClick={() => navigate('/')} className="header-back-btn">
          〈 뒤로가기
        </button>
        <div className="header-actions">
          <Link to={`/chat?groupId=${group.id}`} className="header-icon-btn" title="채팅">💬</Link>
        </div>
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

      {message && <p className="info-banner">{message}</p>}

      {!membership && (
        <button type="button" className="btn-primary" onClick={handleJoin} style={{ margin: '16px auto', display: 'block', width: '90%' }}>
          가입 신청
        </button>
      )}

      {membership?.status === 'PENDING' && (
        <div className="join-status-row" style={{ margin: '16px 12px' }}>
          <p className="info-banner">가입 승인 대기 중입니다. 회장이 확인할 때까지 기다려 주세요.</p>
          <button type="button" className="btn-ghost" onClick={handleCancelJoin}>
            신청 취소
          </button>
        </div>
      )}

      {membership?.status === 'REJECTED' && (
        <div className="join-status-row" style={{ margin: '16px 12px' }}>
          <p className="info-banner info-banner--warn">가입이 거절되었습니다.</p>
          <button type="button" className="btn-primary" onClick={handleJoin}>
            다시 신청
          </button>
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
            <button
              type="button"
              className={`tab-navigation-btn${activeTab === 'gallery' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              사진첩
            </button>
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

              {/* Write announcement inline form */}
              {writingAnnouncement && (
                <form onSubmit={handleCreateAnnouncement} className="feed-write-form">
                  <h3 className="feed-write-form-title">새 공지사항 등록</h3>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="제목을 입력하세요..."
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      required
                      className="feed-write-input"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <textarea
                      placeholder="공지 내용을 입력하세요..."
                      value={announcementContent}
                      onChange={(e) => setAnnouncementContent(e.target.value)}
                      required
                      rows={4}
                      className="feed-write-textarea"
                    />
                  </div>
                  <div className="feed-write-form-actions">
                    <button type="submit" className="btn-sm btn-primary">
                      등록 완료
                    </button>
                    <button type="button" className="btn-sm btn-ghost" onClick={() => setWritingAnnouncement(false)}>
                      취소
                    </button>
                  </div>
                </form>
              )}

              {/* Feed Items List */}
              {filteredFeedItems.length === 0 ? (
                <p className="feed-empty-text">작성된 글이 없습니다.</p>
              ) : (
                <div className="feed-list">
                  {filteredFeedItems.map((item) => {
                    const comments = eventCommentsMap[item.id] || [];

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
                              {getMemberHeaderInfo(item.author)}
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
                              {item.feedType === 'announcement' && (
                                <span className="feed-card-badge">중요공지</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Post Body Content */}
                        <div className="feed-card-body">
                          {item.feedType === 'announcement' && (
                            <h3 className="feed-announcement-title">{item.title}</h3>
                          )}
                          <p className="feed-card-text">{item.content}</p>

                          {/* Event Attachment Vote Card */}
                          {item.feedType === 'event' && (
                            <div className="feed-vote-box">
                              <div className="feed-vote-header">
                                <span className="feed-vote-status-badge">투표 중</span>
                                <span className="feed-vote-count-text">
                                  {item.raw._count?.votes ?? 0}명 참여
                                </span>
                              </div>
                              <Link to={`/events/${item.id}`} className="feed-vote-title-link">
                                <h4 className="feed-vote-title">{item.title}</h4>
                              </Link>
                              <div className="feed-vote-details">
                                📍 {item.raw.location} · 📅 {formatEventDate(item.raw.date)}
                              </div>
                              <div className="feed-vote-options">
                                {(() => {
                                  const votesRes = eventVotesMap[item.id];
                                  const myChoice = votesRes?.myVote?.choice;
                                  
                                  const votesList = votesRes?.votes || [];
                                  const attendCount = votesList.filter((v: any) => v.choice === 'ATTEND').length;
                                  const lateCount = votesList.filter((v: any) => v.choice === 'LATE').length;
                                  const absentCount = votesList.filter((v: any) => v.choice === 'ABSENT').length;

                                  return (
                                    <>
                                      <button
                                        type="button"
                                        className={`feed-vote-option-btn-item ${myChoice === 'ATTEND' ? 'is-selected' : ''}`}
                                        onClick={() => handleVoteDirect(item.id, 'ATTEND')}
                                      >
                                        <span className="feed-vote-option-dot" />
                                        <span className="feed-vote-option-label">참석</span>
                                        <span className="feed-vote-option-count">{attendCount}명</span>
                                      </button>
                                      <button
                                        type="button"
                                        className={`feed-vote-option-btn-item ${myChoice === 'LATE' ? 'is-selected' : ''}`}
                                        onClick={() => handleVoteDirect(item.id, 'LATE')}
                                      >
                                        <span className="feed-vote-option-dot" />
                                        <span className="feed-vote-option-label">늦참</span>
                                        <span className="feed-vote-option-count">{lateCount}명</span>
                                      </button>
                                      <button
                                        type="button"
                                        className={`feed-vote-option-btn-item ${myChoice === 'ABSENT' ? 'is-selected' : ''}`}
                                        onClick={() => handleVoteDirect(item.id, 'ABSENT')}
                                      >
                                        <span className="feed-vote-option-dot" />
                                        <span className="feed-vote-option-label">불참</span>
                                        <span className="feed-vote-option-count">{absentCount}명</span>
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                              <Link to={`/events/${item.id}`} className="feed-vote-action-btn">
                                투표 상세 보기
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Post Footer info */}
                        <div className="feed-card-footer">
                          <span className="feed-footer-stat">댓글 {item.feedType === 'event' ? comments.length : 2}</span>
                          <span className="feed-footer-stat">👁️ 28</span>
                        </div>

                        {/* Feed Comment Action Row */}
                        <div className="feed-comment-actions-bar">
                          <button type="button" className="feed-comment-action-btn-item">
                            😊 표정짓기
                          </button>
                          <button
                            type="button"
                            className="feed-comment-action-btn-item"
                            onClick={() => {
                              const inputEl = document.getElementById(`input-${item.id}`);
                              if (inputEl) inputEl.focus();
                            }}
                          >
                            💬 댓글쓰기
                          </button>
                        </div>

                        {/* Inline Comments Thread */}
                        <div className="feed-comments-thread">
                          {/* Announcement Mock Comments to match Naver Band mockup */}
                          {item.feedType === 'announcement' && (
                            <div className="feed-comments-list">
                              <div className="feed-comment-item">
                                <div className="feed-comment-avatar-fallback">👤</div>
                                <div className="feed-comment-body">
                                  <div className="feed-comment-author-row">
                                    <span className="feed-comment-author">95/최순용/회원</span>
                                    <span className="feed-comment-time">7월 6일 오전 9:22</span>
                                  </div>
                                  <p className="feed-comment-content">출산으로 인해 3달 쉬겠습니다.</p>
                                </div>
                              </div>
                              <div className="feed-comment-item">
                                <div className="feed-comment-avatar-fallback">👤</div>
                                <div className="feed-comment-body">
                                  <div className="feed-comment-author-row">
                                    <span className="feed-comment-author">88/이상헌/회원</span>
                                    <span className="feed-comment-time">7월 6일 오후 2:34</span>
                                  </div>
                                  <p className="feed-comment-content">대구 장기출장입니다.</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Event Real Comments */}
                          {item.feedType === 'event' && (
                            <>
                              {comments.length > 0 && (
                                <div className="feed-comments-list">
                                  {comments.map((comment: any) => (
                                    <div key={comment.id} className="feed-comment-item">
                                      {comment.user.profileImageUrl ? (
                                        <img src={comment.user.profileImageUrl} alt="" className="feed-comment-avatar" />
                                      ) : (
                                        <div className="feed-comment-avatar-fallback">{comment.user.displayName[0]}</div>
                                      )}
                                      <div className="feed-comment-body">
                                        <div className="feed-comment-author-row">
                                          <span className="feed-comment-author">
                                            {getMemberHeaderInfo(comment.user)}
                                          </span>
                                          <span className="feed-comment-time">
                                            {new Date(comment.createdAt).toLocaleDateString('ko-KR', {
                                              month: 'numeric',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                        <p className="feed-comment-content">{comment.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Submit comment form row */}
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
                                    if (e.key === 'Enter') {
                                      handleAddFeedComment(item.id, commentInputs[item.id] || '');
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="feed-comment-submit-btn"
                                  onClick={() => handleAddFeedComment(item.id, commentInputs[item.id] || '')}
                                >
                                  등록
                                </button>
                              </div>
                            </>
                          )}
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
                    <li key={ev.id}>
                      <Link to={`/events/${ev.id}`} className="event-item">
                        <div>
                          <strong>{ev.title}</strong>
                          {ev.status === 'CANCELLED' && (
                            <span className="status-cancelled">취소됨</span>
                          )}
                          <span className="event-meta">
                            {formatEventDate(ev.date)}{' '}
                            {formatEventTimeRange(ev.startTime, ev.endTime)}{' '}
                            · {ev.location}
                          </span>
                        </div>
                        <span className="vote-pill">
                          투표 {ev._count?.votes ?? 0}명
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 3. 사진첩 탭 (Gallery View) */}
          {activeTab === 'gallery' && (
            <div className="tab-content-gallery">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>사진첩 ({mediaFiles.length})</h2>
                <label className="btn-sm btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}>
                  📤 파일 업로드
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleUploadMedia}
                    disabled={uploadingMedia}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {uploadingMedia && (
                <div style={{ padding: '16px', background: 'var(--blue-50)', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>
                  ⏳ 미디어를 업로드하는 중입니다. 잠시만 기다려 주세요...
                </div>
              )}

              {mediaFiles.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-muted)' }}>업로드된 사진이나 동영상이 없습니다.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {mediaFiles.map((m) => (
                    <div key={m.id} className="gallery-item" style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', background: 'var(--grey-100)', aspectRatio: '1/1', boxShadow: 'var(--shadow-1)' }}>
                      {m.fileType === 'VIDEO' ? (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <video
                            src={m.url}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onClick={(e) => {
                              const video = e.currentTarget;
                              if (video.paused) {
                                video.play();
                                video.controls = true;
                              } else {
                                video.pause();
                                video.controls = false;
                              }
                            }}
                          />
                          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, pointerEvents: 'none' }}>
                            ▶ Video
                          </div>
                        </div>
                      ) : (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                          <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </a>
                      )}
                      <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
                        {m.uploadedBy.profileImageUrl ? (
                          <img src={m.uploadedBy.profileImageUrl} alt="" style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', color: '#333', display: 'grid', placeItems: 'center', fontSize: '8px', fontWeight: 700 }}>
                            {m.uploadedBy.displayName[0]}
                          </div>
                        )}
                        <span style={{ fontSize: '10px', color: '#fff', fontWeight: 600 }}>{m.uploadedBy.displayName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. 멤버 탭 (Members View) */}
          {activeTab === 'members' && (
            <div className="tab-content-members" style={{ padding: '0 12px' }}>
              {/* 1. My Activity Status */}
              <section className="section-block">
                <h2>내 활동 상태 설정</h2>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {Object.keys(userStatusLabels).map((statusKey) => {
                    const myMembershipRecord = group.members.find((m: any) => m.userId === user?.id);
                    const isSelected = myMembershipRecord?.userStatus === statusKey;
                    return (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => handleUpdateMyStatus(statusKey)}
                        className="filter-btn"
                        style={{
                          flex: 1,
                          background: isSelected ? 'var(--accent)' : 'var(--surface)',
                          color: isSelected ? 'var(--white)' : 'var(--ink-muted)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                          fontWeight: 700,
                        }}
                      >
                        {userStatusLabels[statusKey]}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 2. Join Requests (Officers only) */}
              {isOfficer && group.pendingRequests.length > 0 && (
                <section className="section-block">
                  <h2>가입 신청 ({group.pendingRequests.length})</h2>
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
              <section className="section-block">
                <h2>운영진 & 회원 ({sortedMembers.length}명)</h2>
                <ul className="member-list">
                  {sortedMembers.map((m: any) => {
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

                        <div className="member-item-card__right">
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
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}

          {/* 5. 회비 탭 (Payments Board View) */}
          {activeTab === 'payments' && (
            <div className="tab-content-payments" style={{ padding: '0 12px' }}>
              <div className="payments-board">
                <div className="month-picker-row">
                  <button type="button" onClick={prevMonth} className="month-nav-btn">이전달</button>
                  <span className="month-picker-value">{payYear}년 {payMonth}월</span>
                  <button type="button" onClick={nextMonth} className="month-nav-btn">다음달</button>
                </div>

                {group.dueDay && (
                  <div className="payments-meta-box">
                    💡 <strong>매월 {group.dueDay}일</strong>은 회비 납부일입니다.
                    {group.officerFeeExempt && <span style={{ marginLeft: '6px' }}> (운영진 회비 면제 적용 중)</span>}
                  </div>
                )}

                {paymentData && (
                  <div className="payments-grid">
                    {paymentData.payments.map((p: any) => {
                      return (
                        <div key={p.userId} className="payment-checklist-item">
                          <div className="payment-member-info">
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>
                              {formatMemberNameWithEmoji(p)}
                            </span>
                            {p.isExempt && <span className="payment-exempt-badge">면제</span>}
                          </div>
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. 이력 탭 (Officer Histories View) */}
          {activeTab === 'officers' && (
            <div className="tab-content-officers" style={{ padding: '0 12px' }}>
              <div className="officers-history-section">
                <h2>역대 운영진 이력</h2>
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
            <div className="tab-content-info" style={{ padding: '0 12px' }}>
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
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Action Button (FAB) popover & triggers */}
      {isOfficer && (
        <div className="fab-menu-container">
          {showWriteMenu && (
            <div className="fab-menu-popover">
              <button
                type="button"
                className="fab-popover-item"
                onClick={() => {
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
                style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}
              >
                📅 일정/투표 등록
              </Link>
            </div>
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
    </div>
  );
}
