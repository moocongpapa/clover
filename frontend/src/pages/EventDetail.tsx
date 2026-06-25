import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  api,
  formatEventSchedule,
  formatMemberDisplayName,
  formatTeamLabel,
  groupVotesByChoice,
  TEAM_COUNT_OPTIONS,
  VOTE_LABELS,
  type EventDetail,
  type EventTeamsResult,
  type VoteChoice,
  type VoteResults,
} from '../api';
import './GroupDetail.css';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [votes, setVotes] = useState<VoteResults | null>(null);
  const [teams, setTeams] = useState<EventTeamsResult | null>(null);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [teamCount, setTeamCount] = useState<number>(2);

  const load = () => {
    if (!id) return;
    Promise.all([api.getEvent(id), api.getVotes(id), api.getEventTeams(id)])
      .then(([e, v, t]) => {
        setEvent(e);
        setVotes(v);
        setTeams(t);
        if (t.split) setTeamCount(t.split.teamCount);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const handleVote = async (choice: VoteChoice) => {
    if (!id) return;
    setVoting(true);
    try {
      await api.castVote(id, choice);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '투표 실패');
    } finally {
      setVoting(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !confirm('일정을 삭제하시겠습니까?')) return;
    await api.cancelEvent(id);
    load();
  };

  const handleSplitTeams = async () => {
    if (!id || !teams) return;

    if (!teams.canSplit) {
      alert('모임 시작 30분 전부터만 사용할 수 있습니다.');
      return;
    }

    const attendeeCount =
      (votes?.counts.ATTEND ?? 0) + (votes?.counts.LATE ?? 0);
    if (
      !confirm(
        `참석·늦참 ${attendeeCount}명을 ${teamCount}개 그룹으로 무작위 나눌까요?` +
          (teams.split ? '\n기존 그룹 배정은 새로 갱신됩니다.' : ''),
      )
    ) {
      return;
    }

    setSplitting(true);
    setError('');
    try {
      await api.splitEventTeams(id, teamCount);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '그룹 나누기 실패');
    } finally {
      setSplitting(false);
    }
  };

  if (error && !event) return <p className="form-error">{error}</p>;
  if (!event || !votes || !teams) return <p className="loading-text">불러오는 중…</p>;

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
    <div>
      <p className="breadcrumb">
        <Link to={`/groups/${event.group.id}`}>{event.group.name}</Link>
      </p>

      <header className="event-detail-header">
        <div className="event-detail-header__top">
          <h1>
            {event.title}
            {event.status === 'CANCELLED' && (
              <span className="status-cancelled">취소됨</span>
            )}
          </h1>
          {event.status === 'ACTIVE' && (
            <button
              type="button"
              className="btn-danger event-detail-header__delete"
              onClick={handleCancel}
            >
              일정 삭제
            </button>
          )}
        </div>
        <p className="event-detail-header__desc">{event.description}</p>

        <div className="event-detail-meta">
          <p className="event-detail-meta__line">
            {formatEventSchedule(event.date, event.startTime, event.endTime)}
          </p>
          <p className="event-detail-meta__line">{event.location}</p>
        </div>
      </header>

      <section className="vote-section">
        <div className="vote-section__head">
          <h2>참석 투표</h2>
          {myChoice && (
            <span className={`vote-my-badge vote-my-badge--${myChoice.toLowerCase()}`}>
              {VOTE_LABELS[myChoice]}
            </span>
          )}
        </div>

        {!votes.myVote && !locked && (
          <p className="vote-hint">참석 여부를 선택해 주세요</p>
        )}

        {locked ? (
          <p className="vote-locked-banner">{voteLockMessage}</p>
        ) : (
          <div className="vote-segment" role="group" aria-label="참석 투표">
            {(['ATTEND', 'ABSENT', 'LATE'] as VoteChoice[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`vote-segment__btn vote-segment__btn--${c.toLowerCase()}${
                  myChoice === c ? ' is-selected' : ''
                }`}
                disabled={voting}
                onClick={() => handleVote(c)}
              >
                <span className="vote-segment__label">{VOTE_LABELS[c]}</span>
                <span className="vote-segment__count">({votes.counts[c]})</span>
              </button>
            ))}
          </div>
        )}

        {locked && (
          <div className="vote-segment vote-segment--readonly" aria-hidden>
            {(['ATTEND', 'ABSENT', 'LATE'] as VoteChoice[]).map((c) => (
              <div
                key={c}
                className={`vote-segment__btn vote-segment__btn--${c.toLowerCase()}${
                  myChoice === c ? ' is-selected' : ''
                }`}
              >
                <span className="vote-segment__label">{VOTE_LABELS[c]}</span>
                <span className="vote-segment__count">({votes.counts[c]})</span>
              </div>
            ))}
          </div>
        )}

        <div className="vote-section__subhead">
          <h3>투표 현황</h3>
          <span className="vote-section__total">{votes.votes.length}명</span>
        </div>

        {votes.votes.length === 0 ? (
          <p className="vote-empty">아직 투표한 회원이 없습니다</p>
        ) : (
          <table className="vote-status-table">
            <tbody>
              {votesByChoice.map(({ choice, label, voters }) => (
                <tr
                  key={choice}
                  className={`vote-status-table__row vote-status-table__row--${choice.toLowerCase()}`}
                >
                  <th scope="row" className="vote-status-table__head">
                    <span className="vote-status-table__label">{label}</span>
                    <span className="vote-status-table__count">
                      {voters.length}
                    </span>
                  </th>
                  <td
                    className={`vote-status-table__names${
                      voters.length === 0
                        ? ' vote-status-table__names--empty'
                        : ''
                    }`}
                  >
                    {voters.length > 0
                      ? voters.map((v) => v.user.displayName).join(', ')
                      : '없음'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="vote-section__subhead vote-section__subhead--nonvoters">
          <h3>미투표</h3>
          <span className="vote-section__total">{votes.nonVoters.length}명</span>
        </div>

        {votes.nonVoters.length === 0 ? (
          <p className="vote-empty">모든 회원이 투표했습니다</p>
        ) : (
          <p className="vote-nonvoters__names">
            {votes.nonVoters
              .map((user) => formatMemberDisplayName(user))
              .join(', ')}
          </p>
        )}
      </section>

      {event.status !== 'CANCELLED' && (
        <section className="team-section">
          <div className="team-section__head">
            <h2>그룹 나누기</h2>
            {teams.myTeam && (
              <span className="team-my-badge">
                내 그룹 · {formatTeamLabel(teams.myTeam)}
              </span>
            )}
          </div>

          {teams.canManage && (
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
          )}

          {!teams.canManage && !teams.split && (
            <p className="team-hint">운영진이 그룹을 나누면 여기에 표시됩니다.</p>
          )}

          {teams.split && (
            <>
              <p className="team-meta">
                {teams.split.createdBy.displayName}님이{' '}
                {new Date(teams.split.createdAt).toLocaleString('ko-KR')}에 배정
              </p>
              <div className="team-grid">
                {teams.teams.map((team) => (
                  <article
                    key={team.label}
                    className={`team-card${
                      teams.myTeam === team.label ? ' is-mine' : ''
                    }`}
                  >
                    <h3 className="team-card__title">
                      {formatTeamLabel(team.label)}
                      <span className="team-card__count">{team.members.length}명</span>
                    </h3>
                    <p className="team-card__members">
                      {team.members.length > 0
                        ? team.members.map((m) => m.displayName).join(', ')
                        : '없음'}
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
