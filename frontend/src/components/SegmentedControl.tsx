import './SegmentedControl.css';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  name = 'segment',
}: SegmentedControlProps<T>) {
  return (
    <div className="segmented-control" role="tablist" aria-label={name}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={`segmented-control__item${value === opt.value ? ' is-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
