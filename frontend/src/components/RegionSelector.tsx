import { useEffect, useMemo, useState } from 'react';
import { api, type RegionSido, type RegionsData } from '../api';
import './RegionSelector.css';

export interface RegionSelection {
  activitySido: string;
  activitySigungu: string;
  activityDistrict: string;
  activityTown: string;
}

interface RegionSelectorProps {
  value: RegionSelection;
  onChange: (value: RegionSelection) => void;
  required?: boolean;
}

const EMPTY: RegionSelection = {
  activitySido: '',
  activitySigungu: '',
  activityDistrict: '',
  activityTown: '',
};

export default function RegionSelector({
  value,
  onChange,
  required = true,
}: RegionSelectorProps) {
  const [tree, setTree] = useState<RegionSido[]>([]);
  const [meta, setMeta] = useState<RegionsData['meta'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRegions()
      .then((data) => {
        setTree(data.tree);
        setMeta(data.meta);
      })
      .finally(() => setLoading(false));
  }, []);

  const sido = useMemo(
    () => tree.find((item) => item.name === value.activitySido),
    [tree, value.activitySido],
  );

  const sigungu = useMemo(
    () => sido?.sigungu.find((item) => item.name === value.activitySigungu),
    [sido, value.activitySigungu],
  );

  const districts = sigungu?.districts ?? [];
  const hasDistricts = districts.length > 0;
  const towns = useMemo(() => {
    if (!sigungu) return [];
    if (hasDistricts) {
      const district = districts.find((d) => d.name === value.activityDistrict);
      return district?.towns ?? [];
    }
    return sigungu.towns;
  }, [sigungu, hasDistricts, districts, value.activityDistrict]);

  const update = (patch: Partial<RegionSelection>) => {
    onChange({ ...value, ...patch });
  };

  const handleSido = (activitySido: string) => {
    onChange({ ...EMPTY, activitySido });
  };

  const handleSigungu = (activitySigungu: string) => {
    onChange({
      activitySido: value.activitySido,
      activitySigungu,
      activityDistrict: '',
      activityTown: '',
    });
  };

  const handleDistrict = (activityDistrict: string) => {
    onChange({
      ...value,
      activityDistrict,
      activityTown: '',
    });
  };

  if (loading) {
    return <p className="region-selector__loading">지역 목록 불러오는 중…</p>;
  }

  return (
    <div className="region-selector">
      <div className="region-selector__row">
        <div className="form-group">
          <label htmlFor="activitySido">시·도 *</label>
          <select
            id="activitySido"
            value={value.activitySido}
            onChange={(e) => handleSido(e.target.value)}
            required={required}
          >
            <option value="">선택</option>
            {tree.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="activitySigungu">시·군·구 *</label>
          <select
            id="activitySigungu"
            value={value.activitySigungu}
            onChange={(e) => handleSigungu(e.target.value)}
            disabled={!value.activitySido}
            required={required}
          >
            <option value="">선택</option>
            {(sido?.sigungu ?? []).map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {hasDistricts && (
          <div className="form-group">
            <label htmlFor="activityDistrict">구·군</label>
            <select
              id="activityDistrict"
              value={value.activityDistrict}
              onChange={(e) => handleDistrict(e.target.value)}
              disabled={!value.activitySigungu}
            >
              <option value="">선택</option>
              {districts.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {towns.length > 0 && (
          <div className="form-group">
            <label htmlFor="activityTown">읍·면·동</label>
            <select
              id="activityTown"
              value={value.activityTown}
              onChange={(e) =>
                update({ activityTown: e.target.value })
              }
              disabled={hasDistricts ? !value.activityDistrict : !value.activitySigungu}
            >
              <option value="">선택</option>
              {towns.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {meta && (
        <p className="region-selector__meta">
          행정구역 기준일:{' '}
          {new Date(meta.updatedAt).toLocaleDateString('ko-KR')}
        </p>
      )}
    </div>
  );
}
