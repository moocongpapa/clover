import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GroupAvatar from '../components/GroupAvatar';
import {
  api,
  formatEventSchedule,
  formatMemberDisplayName,
  formatTeamLabel,
  groupVotesByChoice,
  isStaffRole,
  TEAM_COUNT_OPTIONS,
  VOTE_LABELS,
  type EventDetail,
  type EventTeamsResult,
  type VoteChoice,
  type VoteResults,
} from '../api';
import { useAuth } from '../context/AuthContext';
import './GroupDetail.css';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [group, setGroup] = useState<any>(null);
  const [votes, setVotes] = useState<VoteResults | null>(null);
  const [teams, setTeams] = useState<EventTeamsResult | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [error, setError] = useState('');
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [locationCopied, setLocationCopied] = useState(false);
  const [teamsCopied, setTeamsCopied] = useState(false);
  const [nudging, setNudging] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  const [voting, setVoting] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [teamCount, setTeamCount] = useState<number>(2);
  const [splitMembers, setSplitMembers] = useState<Array<{
    userId: string;
    displayName: string;
    profileImageUrl: string | null;
    choice: VoteChoice;
    selected: boolean;
  }>>([]);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);

  useEffect(() => {
    if (teams && teams.splits && teams.splits.length > 0) {
      if (!selectedSplitId || !teams.splits.some(s => s.split.id === selectedSplitId)) {
        setSelectedSplitId(teams.splits[0].split.id);
      }
    } else {
      setSelectedSplitId(null);
    }
  }, [teams, selectedSplitId]);

  const load = () => {
    if (!id) return;
    Promise.all([
      api.getEvent(id),
      api.getVotes(id),
      api.getEventTeams(id),
      api.getComments(id),
    ])
      .then(([e, v, t, c]) => {
        setEvent(e);
        setVotes(v);
        setTeams(t);
        setComments(c);
        if (t.split) setTeamCount(t.split.teamCount);
        api.getGroup(e.groupId).then(setGroup).catch(() => null);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  useEffect(() => {
    if (!votes) return;
    const initialList = [
      ...votes.votes.map((v) => ({
        userId: v.user.id,
        displayName: v.user.displayName,
        profileImageUrl: v.user.profileImageUrl,
        choice: v.choice === 'ABSENT' ? ('ATTEND' as VoteChoice) : v.choice,
        selected: v.choice === 'ATTEND' || v.choice === 'LATE',
      })),
      ...votes.nonVoters.map((u) => ({
        userId: u.id,
        displayName: u.displayName,
        profileImageUrl: u.profileImageUrl,
        choice: 'ATTEND' as VoteChoice,
        selected: false,
      })),
    ];
    initialList.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
    setSplitMembers(initialList);
  }, [votes]);

  const handleVote = async (choice: VoteChoice) => {
    if (!id) return;
    setVoting(true);
    try {
      if (votes?.myVote?.choice === choice) {
        await api.cancelVote(id);
      } else {
        await api.castVote(id, choice);
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '투표 실패');
    } finally {
      setVoting(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    const reason = prompt('일정 취소 사유를 입력해 주세요 (선택/필수):\n예: 우천 예보로 인한 취소, 장소 예약 변경 등', '우천 예보로 인한 취소');
    if (reason === null) return;
    try {
      await api.cancelEvent(id, reason.trim() || undefined);
      alert('일정이 취소되었으며, 모임원들에게 취소 사유 알림이 발송되었습니다.');
      load();
    } catch (err) {
      console.error(err);
      alert('일정 취소 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!id || !event) return;
    if (!confirm(`'${event.title}' 일정을 정말로 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) return;
    try {
      await api.deleteEvent(id);
      alert('일정이 삭제되었습니다.');
      navigate(`/groups/${event.groupId}`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '일정 삭제 실패');
    }
  };

  const handleSplitTeams = async () => {
    if (!id || !teams) return;

    if (!teams.canSplit) {
      alert('모임 시작 1시간 전부터만 사용할 수 있습니다.');
      return;
    }

    const selectedMembers = splitMembers.filter((m) => m.selected);
    if (selectedMembers.length === 0) {
      alert('선택된 인원이 없습니다. 그룹을 나눌 인원을 최소 1명 이상 선택해 주세요.');
      return;
    }

    if (selectedMembers.length < teamCount) {
      alert(`선택된 인원(${selectedMembers.length}명)이 그룹 수(${teamCount}개)보다 적습니다.`);
      return;
    }

    if (
      !confirm(
        `선택된 ${selectedMembers.length}명을 ${teamCount}개 그룹으로 무작위 나눌까요?` +
          (teams.split ? '\n기존 그룹 배정은 새로 갱신됩니다.' : ''),
      )
    ) {
      return;
    }

    setSplitting(true);
    setError('');
    try {
      const payload = selectedMembers.map((m) => ({
        userId: m.userId,
        choice: m.choice,
      }));
      await api.splitEventTeams(id, teamCount, payload);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '그룹 나누기 실패');
    } finally {
      setSplitting(false);
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    setAddingComment(true);
    try {
      await api.addComment(id, commentText.trim());
      setCommentText('');
      const list = await api.getComments(id);
      setComments(list);
    } catch (err) {
      alert(err instanceof Error ? err.message : '댓글 등록 실패');
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id || !confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await api.deleteComment(id, commentId);
      const list = await api.getComments(id);
      setComments(list);
    } catch (err) {
      alert(err instanceof Error ? err.message : '댓글 삭제 실패');
    }
  };

  const formatToIcsDate = (dateStr: string, timeStr?: string | null) => {
    const parts = (dateStr || '').split('-');
    if (parts.length < 3) return '';
    const [y, m, d] = parts;
    const [hh, mm] = (timeStr || '00:00').split(':');
    return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}T${(hh || '00').padStart(2, '0')}${(mm || '00').padStart(2, '0')}00`;
  };

  const getGoogleCalendarUrl = (ev: EventDetail, groupName?: string) => {
    const title = encodeURIComponent(groupName ? `[${groupName}] ${ev.title}` : ev.title);
    const start = formatToIcsDate(ev.date, ev.startTime);
    const end = ev.endTime ? formatToIcsDate(ev.date, ev.endTime) : formatToIcsDate(ev.date, ev.startTime);
    const details = encodeURIComponent(ev.description || '');
    const location = encodeURIComponent(ev.location || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

  const exportIcsFile = (ev: EventDetail, groupName?: string) => {
    const title = groupName ? `[${groupName}] ${ev.title}` : ev.title;
    const start = formatToIcsDate(ev.date, ev.startTime);
    const end = ev.endTime ? formatToIcsDate(ev.date, ev.endTime) : formatToIcsDate(ev.date, ev.startTime);

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Clover Club//KR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:clover-event-${ev.id}@clover.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${ev.location || ''}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyLocation = () => {
    if (!event?.location) return;
    navigator.clipboard.writeText(event.location).then(() => {
      setLocationCopied(true);
      setTimeout(() => setLocationCopied(false), 2000);
    });
  };

  const handleCopyTeams = () => {
    if (!activeSplit || !event) return;
    const dateFormatted = formatEventSchedule(event.date, event.startTime, event.endTime);
    let text = `🏆 [${group?.name || '모임'}] ${event.title} 조 편성 결과\n`;
    text += `📅 일시: ${dateFormatted}\n`;
    if (event.location) text += `📍 장소: ${event.location}\n`;
    text += `\n`;

    activeSplit.teams.forEach((t) => {
      const label = formatTeamLabel(t.label);
      const memberNames = t.members.map((m) => formatMemberDisplayName(m)).join(', ');
      text += `⚽ ${label} (${t.members.length}명): ${memberNames || '없음'}\n`;
    });

    navigator.clipboard.writeText(text.trim()).then(() => {
      setTeamsCopied(true);
      setTimeout(() => setTeamsCopied(false), 2500);
    });
  };

  const handleNudgeUnvoted = async () => {
    if (!id || !votes || votes.nonVoters.length === 0) return;
    if (!confirm(`미투표 회원 ${votes.nonVoters.length}명에게 참석 투표 독려 알림을 발송하시겠습니까?`)) return;
    setNudging(true);
    try {
      const res = await api.nudgeUnvoted(id);
      alert(`미투표 회원 ${res.sentCount}명에게 투표 독려 알림을 발송했습니다!`);
    } catch (err: any) {
      alert(err.message || '알림 발송 실패');
    } finally {
      setNudging(false);
    }
  };

  if (error && !event) return <p className="form-error">{error}</p>;
  if (!event || !votes || !teams) return <p className="loading-text">불러오는 중…</p>;

  const activeSplit =
    teams?.splits?.find((s) => s.split.id === selectedSplitId) ||
    (teams?.split
      ? { split: teams.split, teams: teams.teams, myTeam: teams.myTeam }
      : null);

  const locked = votes.event.voteLocked || event.status === 'CANCELLED';
  const voteLockMessage =
    event.status === 'CANCELLED'
      ? '취소된 일정입니다'
      : votes.event.hasTeamSplit
        ? '그룹 나누기 후에는 투표할 수 없습니다'
        : votes.event.voteLocked
          ? '모임 시작 후에는 투표할 수 없습니다'
          : null;
  const myChoice = votes.myVote?.choice;
  const votesByChoice = groupVotesByChoice(votes.votes);

  return (
    <div className="event-detail-page">
      <div className="event-detail-group-nav">
        <Link to={`/groups/${event.group.id}`} className="group-nav-link">
          <GroupAvatar
            src={event.group.profileImageUrl}
            name={event.group.name}
            size={24}
            radius={6}
          />
          <span className="group-nav-name">{event.group.name}</span>
          <span className="group-nav-arrow">›</span>
        </Link>
      </div>

      <header className="event-detail-header">
        <div className="event-detail-header__top">
          <h1>
            {event.title}
            {event.status === 'CANCELLED' && (
              <span className="status-cancelled">취소됨</span>
            )}
          </h1>
          {(() => {
            const isStaff = group?.myMembership?.role ? isStaffRole(group.myMembership.role) : false;
            const canManage = isStaff || (event.createdBy && event.createdBy.id === user?.id);
            if (!canManage) return null;

            return (
              <div className="event-detail-header__actions">
                {event.status === 'ACTIVE' && (
                  <>
                    <Link
                      to={`/events/${event.id}/edit`}
                      className="icon-action-btn icon-action-btn--edit"
                      title="일정 수정"
                      aria-label="일정 수정"
                    >
                      ✏️
                    </Link>
                    <button
                      type="button"
                      className="icon-action-btn icon-action-btn--cancel"
                      onClick={handleCancel}
                      title="일정 취소 (사유 기록 및 알림 발송)"
                      aria-label="일정 취소"
                    >
                      🚫
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="icon-action-btn icon-action-btn--delete"
                  onClick={handleDeleteEvent}
                  title="일정 영구 삭제"
                  aria-label="일정 영구 삭제"
                >
                  🗑️
                </button>
              </div>
            );
          })()}
        </div>
        {event.status === 'CANCELLED' && (
          <div style={{
            marginTop: '12px',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '12px',
            color: '#ef4444',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <span>🚫 이 일정은 취소되었습니다.</span>
            {event.cancelReason && (
              <span style={{ display: 'block', marginTop: '4px', color: 'var(--ink-dark)', fontWeight: '700' }}>
                📌 취소 사유: {event.cancelReason}
              </span>
            )}
          </div>
        )}
        <p className="event-detail-header__desc">{event.description}</p>

        <div className="event-detail-meta">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <p className="event-detail-meta__line" style={{ margin: 0 }}>
              📅 {formatEventSchedule(event.date, event.startTime, event.endTime)}
            </p>
            {event.status === 'ACTIVE' && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    background: 'var(--grey-100)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  📅 캘린더 등록 ▾
                </button>
                {showCalendarMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: '4px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      zIndex: 50,
                      minWidth: '170px',
                    }}
                  >
                    <a
                      href={getGoogleCalendarUrl(event, group?.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowCalendarMenu(false)}
                      style={{
                        padding: '8px 10px',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        color: 'var(--ink)',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        textAlign: 'left',
                        display: 'block',
                      }}
                    >
                      구글 캘린더 추가 ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        exportIcsFile(event, group?.name);
                        setShowCalendarMenu(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        color: 'var(--ink)',
                        background: 'none',
                        border: 'none',
                        borderRadius: '6px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'block',
                        width: '100%',
                      }}
                    >
                      Apple / 기본 캘린더 (.ics) 📥
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p className="event-detail-meta__line" style={{ margin: 0 }}>
              📍 {event.location || '장소 미정'}
            </p>
            {event.location && event.location !== '미정' && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                <a
                  href={`https://map.kakao.com/link/search/${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    background: '#FEE500',
                    color: '#191919',
                    borderRadius: '8px',
                    textDecoration: 'none',
                  }}
                >
                  카카오맵 ↗
                </a>
                <a
                  href={`https://map.naver.com/v5/search/${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    background: '#03C75A',
                    color: '#ffffff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                  }}
                >
                  네이버 지도 ↗
                </a>
                <button
                  type="button"
                  onClick={handleCopyLocation}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: 'var(--grey-100)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {locationCopied ? '주소 복사됨! ✅' : '주소 복사 📋'}
                </button>
              </div>
            )}
          </div>
          {event.createdBy && (
            <div className="event-detail-creator">
              <span className="event-detail-creator__label">등록자:</span>
              <div className="event-detail-creator__user">
                {event.createdBy.profileImageUrl ? (
                  <img
                    src={event.createdBy.profileImageUrl}
                    alt=""
                    className="event-detail-creator__avatar"
                  />
                ) : (
                  <span className="event-detail-creator__avatar-fallback">
                    {event.createdBy.displayName[0]}
                  </span>
                )}
                <span className="event-detail-creator__name">
                  {formatMemberDisplayName(event.createdBy)}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="vote-section">
        <div className="vote-section__head">
          <div className="vote-section__head-title">
            <h2>참석 투표</h2>
            {myChoice && (
              <span className={`vote-my-badge vote-my-badge--${myChoice.toLowerCase()}`}>
                {VOTE_LABELS[myChoice]}
              </span>
            )}
          </div>
          <div className="vote-section__head-status">
            <h3>투표 현황</h3>
            <span className="vote-section__total">{votes.votes.length}명</span>
          </div>
        </div>

        {!votes.myVote && !locked && (
          <p className="vote-hint">참석 여부를 선택해 주세요</p>
        )}
        {locked && <p className="vote-locked-banner">{voteLockMessage}</p>}

        <div className="vote-row-pairs">
          {votesByChoice.map(({ choice, label, voters }) => (
            <div key={choice} className="vote-row-pair">
              <div className="vote-row-pair__left">
                <button
                  type="button"
                  className={`vote-segment__btn vote-segment__btn--${choice.toLowerCase()}${
                    myChoice === choice ? ' is-selected' : ''
                  }`}
                  disabled={voting || locked}
                  onClick={() => handleVote(choice)}
                >
                  <span className="vote-segment__label">{label}</span>
                  <span className="vote-segment__count">({votes.counts[choice]})</span>
                </button>
              </div>

              <div className="vote-row-pair__right">
                <div className={`vote-status-block vote-status-block--${choice.toLowerCase()}`}>
                  <div className="vote-status-block__content">
                    {voters.length > 0 ? (
                      <div className="vote-voter-list">
                        {voters.map((v) => (
                          <Link to={`/profile/${v.user.id}`} key={v.user.id} className="vote-voter-chip">
                            {v.user.profileImageUrl ? (
                              <img src={v.user.profileImageUrl} alt="" className="vote-voter-chip__avatar" />
                            ) : (
                              <span className="vote-voter-chip__avatar-fallback">{v.user.displayName[0]}</span>
                            )}
                            <span className="vote-voter-chip__name">{formatMemberDisplayName(v.user)}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="vote-voter-empty-text">투표한 회원이 없습니다</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="vote-section__subhead vote-section__subhead--nonvoters" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h3 style={{ margin: 0 }}>미투표</h3>
            <span className="vote-section__total">{votes.nonVoters.length}명</span>
          </div>
          {teams.canManage && votes.nonVoters.length > 0 && !locked && (
            <button
              type="button"
              onClick={handleNudgeUnvoted}
              disabled={nudging}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {nudging ? '알림 발송 중…' : '📢 미투표 회원 독려 알림'}
            </button>
          )}
        </div>

        {votes.nonVoters.length === 0 ? (
          <p className="vote-empty">모든 회원이 투표했습니다</p>
        ) : (
          <div className="vote-nonvoters-list">
            {votes.nonVoters.map((user) => (
              <Link to={`/profile/${user.id}`} key={user.id} className="vote-voter-chip vote-voter-chip--nonvoter">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className="vote-voter-chip__avatar" />
                ) : (
                  <span className="vote-voter-chip__avatar-fallback">{user.displayName[0]}</span>
                )}
                <span className="vote-voter-chip__name">{formatMemberDisplayName(user)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {event.status !== 'CANCELLED' && (
        <section className="team-section">
          <div className="team-section__head">
            <h2>그룹 나누기</h2>
            {activeSplit?.myTeam && (
              <span className="team-my-badge">
                내 그룹 · {formatTeamLabel(activeSplit.myTeam)}
              </span>
            )}
          </div>

          {teams.canManage && (
            <>
              <div className="team-split-controls">
                <label className="team-split-controls__label" htmlFor="team-count">
                  그룹 수
                </label>
                <div className="team-count-picker" id="team-count">
                  {TEAM_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`team-count-btn${teamCount === count ? ' is-selected' : ''}`}
                      disabled={splitting}
                      onClick={() => setTeamCount(count)}
                    >
                      {count}개
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-primary team-split-btn"
                  disabled={splitting}
                  onClick={handleSplitTeams}
                >
                  {teams.split ? '다시 나누기' : '그룹 나누기'}
                </button>
              </div>

              <div className="team-member-selector">
                <h4 className="team-member-selector__title">
                  그룹 나누기 대상자 설정 ({splitMembers.filter((m) => m.selected).length}명 선택됨)
                </h4>
                <div className="team-member-selector__list">
                  {splitMembers.map((member) => (
                    <div
                      key={member.userId}
                      className={`team-member-selector__item${member.selected ? ' is-selected' : ''}`}
                    >
                      <label className="team-member-selector__label">
                        <input
                          type="checkbox"
                          checked={member.selected}
                          onChange={(e) => {
                            setSplitMembers((prev) =>
                              prev.map((m) =>
                                m.userId === member.userId
                                  ? { ...m, selected: e.target.checked }
                                  : m
                              )
                            );
                          }}
                        />
                        <span className="team-member-selector__name">{member.displayName}</span>
                      </label>

                      {member.selected && (
                        <div className="team-member-selector__choice">
                          <button
                            type="button"
                            className={`choice-btn${member.choice === 'ATTEND' ? ' is-active' : ''}`}
                            onClick={() => {
                              setSplitMembers((prev) =>
                                prev.map((m) =>
                                  m.userId === member.userId
                                    ? { ...m, choice: 'ATTEND' as VoteChoice }
                                    : m
                                )
                              );
                            }}
                          >
                            참석
                          </button>
                          <button
                            type="button"
                            className={`choice-btn${member.choice === 'LATE' ? ' is-active' : ''}`}
                            onClick={() => {
                              setSplitMembers((prev) =>
                                prev.map((m) =>
                                  m.userId === member.userId
                                    ? { ...m, choice: 'LATE' as VoteChoice }
                                    : m
                                )
                              );
                            }}
                          >
                            늦참
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!teams.canManage && !activeSplit && (
            <p className="team-hint">운영진이 그룹을 나누면 여기에 표시됩니다.</p>
          )}

          {teams.splits && teams.splits.length > 0 && (
            <div className="team-splits-tabs">
              {teams.splits.map((s) => (
                <button
                  key={s.split.id}
                  type="button"
                  className={`team-split-tab-btn${selectedSplitId === s.split.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedSplitId(s.split.id)}
                >
                  {s.split.round}회차
                </button>
              ))}
            </div>
          )}

          {activeSplit && (
            <>
              <p className="team-meta">
                {activeSplit.split.createdBy.displayName}님이{' '}
                {new Date(activeSplit.split.createdAt).toLocaleString('ko-KR')}에 배정
                {activeSplit.split.round && ` (${activeSplit.split.round}회차)`}
              </p>
              <div className="team-grid">
                {activeSplit.teams.map((team) => (
                  <article
                    key={team.label}
                    className={`team-card${
                      activeSplit.myTeam === team.label ? ' is-mine' : ''
                    }`}
                  >
                    <h3 className="team-card__title">
                      {formatTeamLabel(team.label)}
                      <span className="team-card__count">{team.members.length}명</span>
                    </h3>
                    <div className="team-card__members">
                      {team.members.length > 0
                        ? team.members.map((m, idx) => (
                            <span key={m.id}>
                              <Link to={`/profile/${m.id}`} className="team-member-link">
                                {formatMemberDisplayName(m)}
                              </Link>
                              {idx < team.members.length - 1 ? ', ' : ''}
                            </span>
                          ))
                        : '없음'}
                    </div>
                  </article>
                ))}
              </div>
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleCopyTeams}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📋 {teamsCopied ? '단톡방 공유 텍스트 복사 완료! ✅' : '조 편성 결과 단톡방 공유 복사'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Comments section */}
      <section className="vote-section comments-section" style={{ marginTop: '24px' }}>
        <h2>댓글 ({comments.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          {comments.map((comment) => {
            const isCommentAuthor = comment.userId === user?.id;
            const canDelete = isCommentAuthor || teams.canManage;

            return (
              <div key={comment.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: 'var(--grey-50)', borderRadius: '12px' }}>
                {/* Left side: Avatar only */}
                <div style={{ flexShrink: 0 }}>
                  {comment.user.profileImageUrl ? (
                    <img src={comment.user.profileImageUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '12px', fontWeight: 700 }}>
                      {comment.user.displayName[0]}
                    </span>
                  )}
                </div>

                {/* Right side: Header (Name & Meta) and Body (Content) stacked vertically */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                  {/* Top Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                      {formatMemberDisplayName(comment.user)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: 'var(--ink-tertiary)', whiteSpace: 'nowrap' }}>
                        {new Date(comment.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger, #f44336)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--danger-soft, #ffebee)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Body Row */}
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)', whiteSpace: 'pre-wrap', lineHeight: 1.4, wordBreak: 'break-all' }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 작성해 보세요…"
            style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '13px', background: 'var(--grey-50)' }}
            disabled={addingComment}
          />
          <button
            type="submit"
            disabled={addingComment || !commentText.trim()}
            className="btn-primary"
            style={{ padding: '0 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}
          >
            등록
          </button>
        </form>
      </section>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
