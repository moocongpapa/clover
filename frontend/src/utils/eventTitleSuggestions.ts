import { normalizeCategory } from '../api';

type TemplateFn = (keyword: string) => string;

const CATEGORY_TEMPLATES: Record<string, TemplateFn[]> = {
  '스포츠/피트니스': [
    (kw) => `건강과 친목을 위한 ${kw} 경기`,
    (kw) => `함께하는 ${kw} 모임`,
    (kw) => `주말 ${kw} 번개`,
  ],
  '아웃도어/여행': [
    (kw) => `${kw} 함께 떠나요`,
    (kw) => `친목 ${kw} 나들이`,
    (kw) => `주말 ${kw} 코스`,
  ],
  '건강/웰빙': [
    (kw) => `몸과 마음을 위한 ${kw}`,
    (kw) => `함께하는 ${kw} 시간`,
    (kw) => `아침 ${kw} 루틴`,
  ],
  '취미/공예': [
    (kw) => `${kw} 함께 즐기기`,
    (kw) => `친목 ${kw} 클래스`,
    (kw) => `이번 주 ${kw} 모임`,
  ],
  '문화/예술': [
    (kw) => `${kw} 감상 모임`,
    (kw) => `함께하는 ${kw} 체험`,
    (kw) => `친목 ${kw} 데이`,
  ],
  '음악/공연': [
    (kw) => `${kw} 함께 듣기`,
    (kw) => `친목 ${kw} 라이브`,
    (kw) => `이번 주 ${kw} 세션`,
  ],
  '독서/글쓰기': [
    (kw) => `이번 주 ${kw} 토론`,
    (kw) => `${kw} 함께 읽기`,
    (kw) => `친목 ${kw} 북클럽`,
  ],
  '음식/맛집': [
    (kw) => `${kw} 맛집 탐방`,
    (kw) => `함께하는 ${kw} 식사`,
    (kw) => `친목 ${kw} 모임`,
  ],
  'IT/개발': [
    (kw) => `${kw} 스터디`,
    (kw) => `함께하는 ${kw} 세션`,
    (kw) => `이번 주 ${kw} 정리`,
  ],
  '비즈니스/커리어': [
    (kw) => `${kw} 네트워킹`,
    (kw) => `함께하는 ${kw} 세미나`,
    (kw) => `친목 ${kw} 토크`,
  ],
  '스터디/교육': [
    (kw) => `${kw} 스터디`,
    (kw) => `함께하는 ${kw} 학습`,
    (kw) => `이번 주 ${kw} 정리`,
  ],
  '게임/엔터테인먼트': [
    (kw) => `${kw} 함께하기`,
    (kw) => `친목 ${kw} 번개`,
    (kw) => `주말 ${kw} 모임`,
  ],
  '봉사/커뮤니티': [
    (kw) => `${kw} 봉사 활동`,
    (kw) => `함께하는 ${kw} 나눔`,
    (kw) => `친목 ${kw} 프로젝트`,
  ],
  '가족/육아': [
    (kw) => `가족과 함께하는 ${kw}`,
    (kw) => `${kw} 육아 모임`,
    (kw) => `친목 ${kw} 데이`,
  ],
  반려동물: [
    (kw) => `${kw} 산책 모임`,
    (kw) => `반려견 ${kw} 모임`,
    (kw) => `함께하는 ${kw} 시간`,
  ],
  기타: [
    (kw) => `함께하는 ${kw} 모임`,
    (kw) => `친목 ${kw} 번개`,
    (kw) => `이번 주 ${kw} 일정`,
  ],
};

const KEYWORD_TEMPLATES: Record<string, TemplateFn[]> = {
  풋살: [
    (kw) => `건강과 친목을 위한 ${kw} 경기`,
    (kw) => `주말 ${kw} 매치`,
    (kw) => `함께하는 ${kw} 모임`,
  ],
  축구: [
    (kw) => `건강과 친목을 위한 ${kw} 경기`,
    (kw) => `주말 ${kw} 친선전`,
    (kw) => `함께하는 ${kw} 모임`,
  ],
  농구: [
    (kw) => `건강과 친목을 위한 ${kw} 경기`,
    (kw) => `3대3 ${kw} 모임`,
    (kw) => `주말 ${kw} 번개`,
  ],
  러닝: [
    (kw) => `함께 뛰는 ${kw} 크루`,
    (kw) => `건강을 위한 ${kw} 모임`,
    (kw) => `주말 ${kw} 러닝`,
  ],
  요가: [
    (kw) => `몸과 마음을 위한 ${kw}`,
    (kw) => `아침 ${kw} 클래스`,
    (kw) => `함께하는 ${kw} 시간`,
  ],
  독서: [
    (kw) => `이번 주 ${kw} 토론`,
    (kw) => `${kw} 함께 읽기`,
    (kw) => `친목 ${kw} 북클럽`,
  ],
  스터디: [
    (kw) => `${kw} 함께하기`,
    (kw) => `이번 주 ${kw} 정리`,
    (kw) => `친목 ${kw} 세션`,
  ],
};

function extractKeyword(input: string): string {
  return input.trim().split(/\s+/).filter(Boolean).pop() ?? '';
}

export function getEventTitleSuggestions(
  category: string,
  input: string,
): string[] {
  const keyword = extractKeyword(input);
  if (keyword.length < 2) return [];

  const normalizedCategory = normalizeCategory(category);
  const keywordLower = keyword.toLowerCase();

  const keywordMatch = Object.entries(KEYWORD_TEMPLATES).find(
    ([key]) => keywordLower.includes(key.toLowerCase()) || key.toLowerCase().includes(keywordLower),
  );

  const templates = [
    ...(keywordMatch?.[1] ?? []),
    ...(CATEGORY_TEMPLATES[normalizedCategory] ?? CATEGORY_TEMPLATES.기타),
  ];

  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const build of templates) {
    const title = build(keyword);
    if (title === input.trim() || seen.has(title)) continue;
    seen.add(title);
    suggestions.push(title);
    if (suggestions.length >= 3) break;
  }

  return suggestions;
}
