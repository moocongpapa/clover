import { formatCategoryEmoji, normalizeCategory } from '../api';

export default function CategoryBadge({
  category,
  className = 'group-category',
}: {
  category: string;
  className?: string;
}) {
  const normalized = normalizeCategory(category);
  const emoji = formatCategoryEmoji(normalized);

  return (
    <span className={className} title={normalized} aria-label={normalized}>
      {emoji}
    </span>
  );
}
