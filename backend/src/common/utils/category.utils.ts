import { PrismaClient } from '@prisma/client';

export const CATEGORY_OPTIONS = [
  { value: '스포츠/피트니스', emoji: '⚽' },
  { value: '아웃도어/여행', emoji: '🏕️' },
  { value: '건강/웰빙', emoji: '🧘' },
  { value: '취미/공예', emoji: '🎨' },
  { value: '문화/예술', emoji: '🎭' },
  { value: '음악/공연', emoji: '🎵' },
  { value: '독서/글쓰기', emoji: '📚' },
  { value: '음식/맛집', emoji: '🍽️' },
  { value: 'IT/개발', emoji: '💻' },
  { value: '비즈니스/커리어', emoji: '💼' },
  { value: '스터디/교육', emoji: '🎓' },
  { value: '게임/엔터테인먼트', emoji: '🎮' },
  { value: '봉사/커뮤니티', emoji: '🤝' },
  { value: '가족/육아', emoji: '👨‍👩‍👧' },
  { value: '반려동물', emoji: '🐾' },
  { value: '기타', emoji: '✨' },
] as const;

export const VALID_CATEGORIES: string[] = CATEGORY_OPTIONS.map((c) => c.value);

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  운동: '스포츠/피트니스',
  풋살: '스포츠/피트니스',
  축구: '스포츠/피트니스',
  야구: '스포츠/피트니스',
  농구: '스포츠/피트니스',
  테니스: '스포츠/피트니스',
  탁구: '스포츠/피트니스',
  수영: '스포츠/피트니스',
  배드민턴: '스포츠/피트니스',
  러닝: '스포츠/피트니스',
  요가: '건강/웰빙',
  독서: '독서/글쓰기',
  개발: 'IT/개발',
  음악: '음악/공연',
  여행: '아웃도어/여행',
  요리: '음식/맛집',
  사진: '취미/공예',
  보드게임: '게임/엔터테인먼트',
};

export function normalizeCategory(category: string): string {
  if (VALID_CATEGORIES.includes(category)) {
    return category;
  }
  return LEGACY_CATEGORY_MAP[category] ?? '기타';
}

export async function migrateLegacyCategories(prisma: PrismaClient) {
  const groups = await prisma.group.findMany({
    select: { id: true, category: true },
  });

  for (const group of groups) {
    const normalized = normalizeCategory(group.category);
    if (normalized !== group.category) {
      await prisma.group.update({
        where: { id: group.id },
        data: { category: normalized },
      });
    }
  }
}
