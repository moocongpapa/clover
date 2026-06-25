const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface User {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  kakaoId?: string;
  gender?: 'MALE' | 'FEMALE' | null;
  birthYear?: number | null;
  phoneNumber?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }

  return res.json();
}

export const api = {
  getKakaoUrl: () => request<{ url: string | null }>('/auth/kakao/url'),
  kakaoCallback: (code: string) =>
    request<AuthResponse>('/auth/kakao/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  devLogin: (displayName: string) =>
    request<AuthResponse>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),
  getMe: () => request<User>('/auth/me'),

  listGroups: (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const q = params.toString();
    return request<Group[]>(`/groups${q ? `?${q}` : ''}`);
  },
  myGroups: () => request<MyGroup[]>('/groups/mine'),
  getGroup: (id: string) => request<GroupDetail>(`/groups/${id}`),
  createGroup: (data: CreateGroupInput) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id: string, data: UpdateGroupInput) =>
    request<Group>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadGroupImage: async (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('image', file);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/uploads/group-image`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `업로드 실패 (${res.status})`);
    }
    return res.json() as Promise<{ url: string; filename: string }>;
  },
  joinGroup: (id: string) =>
    request('/groups/' + id + '/join', { method: 'POST' }),
  cancelJoinGroup: (id: string) =>
    request(`/groups/${id}/join/cancel`, { method: 'POST' }),
  joinByInvite: (code: string) => request(`/groups/join/${code}`),
  leaveGroup: (id: string) =>
    request(`/groups/${id}/leave`, { method: 'POST' }),
  updateMember: (
    groupId: string,
    userId: string,
    data: { status?: string; role?: string },
  ) =>
    request(`/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  transferPresident: (groupId: string, newPresidentUserId: string) =>
    request(`/groups/${groupId}/transfer-president`, {
      method: 'POST',
      body: JSON.stringify({ newPresidentUserId }),
    }),

  listEvents: (groupId: string) =>
    request<Event[]>(`/groups/${groupId}/events`),
  getEvent: (id: string) => request<EventDetail>(`/events/${id}`),
  createEvent: (groupId: string, data: CreateEventInput) =>
    request<Event>(`/groups/${groupId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEvent: (id: string, data: CreateEventInput) =>
    request<Event>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  cancelEvent: (id: string) =>
    request(`/events/${id}/cancel`, { method: 'POST' }),

  getEventTeams: (eventId: string) =>
    request<EventTeamsResult>(`/events/${eventId}/teams`),
  splitEventTeams: (eventId: string, teamCount: number) =>
    request<EventTeamsResult>(`/events/${eventId}/teams/split`, {
      method: 'POST',
      body: JSON.stringify({ teamCount }),
    }),

  castVote: (eventId: string, choice: VoteChoice) =>
    request(`/events/${eventId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ choice }),
    }),
  getVotes: (eventId: string) =>
    request<VoteResults>(`/events/${eventId}/votes`),

  getCalendar: () => request<CalendarEvent[]>('/calendar'),
  getNotifications: () => request<NotificationItem[]>('/notifications'),
  getRegions: () => request<RegionsData>('/regions'),
};

export type VoteChoice = 'ATTEND' | 'ABSENT' | 'LATE';

export interface Group {
  id: string;
  name: string;
  description: string;
  profileImageUrl: string | null;
  category: string;
  activitySido?: string | null;
  activitySigungu?: string | null;
  activityDistrict?: string | null;
  activityTown?: string | null;
  activityRegion?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  isPublic: boolean;
  inviteCode: string;
  _count?: { members: number };
  myMembership?: { status: string; role: string } | null;
}

export interface MyGroup extends Group {
  myRole: string;
  memberCount: number;
}

export interface GroupMember {
  id: string;
  role: string;
  status: string;
  user: User;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
  myMembership: GroupMember | null;
  pendingRequests: GroupMember[];
  _count: { members: number; events: number };
}

export interface CreateGroupInput {
  name: string;
  description: string;
  profileImageUrl?: string;
  category: string;
  isPublic: boolean;
  activitySido: string;
  activitySigungu: string;
  activityDistrict?: string;
  activityTown?: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
}

export interface UpdateGroupInput {
  name: string;
  description: string;
  profileImageUrl?: string | null;
  category: string;
  isPublic: boolean;
  activitySido: string;
  activitySigungu: string;
  activityDistrict?: string;
  activityTown?: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
}

export interface RegionDistrict {
  name: string;
  towns: string[];
}

export interface RegionSigungu {
  name: string;
  districts: RegionDistrict[];
  towns: string[];
}

export interface RegionSido {
  name: string;
  sigungu: RegionSigungu[];
}

export interface RegionsData {
  meta: { updatedAt: string; source: string; version: number };
  tree: RegionSido[];
}

export interface Event {
  id: string;
  groupId: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  description: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdBy: User;
  _count?: { votes: number };
}

export interface EventDetail extends Event {
  group: { id: string; name: string };
}

export interface CreateEventInput {
  title: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  description: string;
}

export interface VoteResults {
  event: {
    id: string;
    title: string;
    status: string;
    date: string;
    startTime: string;
    voteLocked: boolean;
    hasTeamSplit?: boolean;
  };
  counts: { ATTEND: number; ABSENT: number; LATE: number };
  votes: Array<{
    id: string;
    choice: VoteChoice;
    choiceLabel: string;
    user: User;
  }>;
  myVote: { choice: VoteChoice } | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  status: string;
  group: { id: string; name: string; category: string };
  myVote: VoteChoice | null;
  voteCount: number;
  voteCounts: { ATTEND: number; ABSENT: number; LATE: number };
  myTeam: string | null;
  voteLocked: boolean;
  isPast: boolean;
}

export interface EventTeamsResult {
  split: {
    teamCount: number;
    createdAt: string;
    createdBy: User;
  } | null;
  teams: Array<{
    label: string;
    members: User[];
  }>;
  myTeam: string | null;
  canManage: boolean;
  canSplit: boolean;
}

export const TEAM_COUNT_OPTIONS = [2, 3, 4] as const;

export function formatTeamLabel(label: string) {
  return `${label}조`;
}

export interface NotificationItem {
  id: string;
  type: string;
  sentAt: string;
  event: { id: string; title: string; date: string; startTime: string };
}

export const VOTE_LABELS: Record<VoteChoice, string> = {
  ATTEND: '참석',
  ABSENT: '불참',
  LATE: '늦참',
};

export const VOTE_CHOICES: VoteChoice[] = ['ATTEND', 'ABSENT', 'LATE'];

export function groupVotesByChoice(votes: VoteResults['votes']) {
  return VOTE_CHOICES.map((choice) => ({
    choice,
    label: VOTE_LABELS[choice],
    voters: votes
      .filter((v) => v.choice === choice)
      .sort((a, b) =>
        a.user.displayName.localeCompare(b.user.displayName, 'ko'),
      ),
  }));
}

export function formatEventTimeRange(
  startTime: string,
  endTime?: string | null,
) {
  return endTime ? `${startTime} - ${endTime}` : startTime;
}

export function formatEventDate(date: string | Date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const ROLE_LABELS: Record<string, string> = {
  PRESIDENT: '회장',
  VICE_PRESIDENT: '부회장',
  SECRETARY: '총무',
  OFFICER: '일반',
  MEMBER: '회원',
};

export function formatMemberDisplayName(user: {
  displayName: string;
  gender?: 'MALE' | 'FEMALE' | null;
  birthYear?: number | null;
}) {
  const parts: string[] = [];

  if (user.gender === 'MALE') parts.push('👨');
  else if (user.gender === 'FEMALE') parts.push('👩');

  if (user.birthYear) {
    parts.push(String(user.birthYear % 100).padStart(2, '0'));
  }

  parts.push(user.displayName);
  return parts.join(' ');
}

export function formatPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export const OFFICER_ROLES = [
  'VICE_PRESIDENT',
  'SECRETARY',
  'OFFICER',
] as const;

export const ROLE_SORT_ORDER: Record<string, number> = {
  PRESIDENT: 0,
  VICE_PRESIDENT: 1,
  SECRETARY: 2,
  OFFICER: 3,
  MEMBER: 4,
};

export function isStaffRole(role: string) {
  return (
    role === 'PRESIDENT' ||
    OFFICER_ROLES.includes(role as (typeof OFFICER_ROLES)[number])
  );
}

export function isOfficerRole(role: string) {
  return isStaffRole(role) && role !== 'PRESIDENT';
}

export const ASSIGNABLE_ROLES = [
  { value: 'MEMBER', label: '일반 회원' },
  { value: 'VICE_PRESIDENT', label: '부회장' },
  { value: 'SECRETARY', label: '총무' },
  { value: 'OFFICER', label: '일반' },
] as const;

export const CATEGORIES = [
  '운동',
  '독서',
  '개발',
  '음악',
  '여행',
  '요리',
  '기타',
];

export const BANK_OPTIONS = [
  'KB국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  'NH농협은행',
  'IBK기업은행',
  '카카오뱅크',
  '토스뱅크',
  '케이뱅크',
  'SC제일은행',
  '대구은행',
  '부산은행',
  '경남은행',
  '광주은행',
  '전북은행',
  '제주은행',
  '수협은행',
  '신협',
  '새마을금고',
  '우체국',
] as const;
