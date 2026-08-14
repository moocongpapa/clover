import { BANK_OPTIONS } from '../api';

type BankAccountFieldsProps = {
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  disabled?: boolean;
};

export default function BankAccountFields({
  bankName = '',
  bankAccountNumber = '',
  bankAccountHolder = '',
  disabled = false,
}: BankAccountFieldsProps) {
  return (
    <fieldset
      className={`form-section ${disabled ? 'is-disabled' : ''}`}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <legend className="form-section__title">모임 통장</legend>
        {disabled && (
          <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
            회비 없음 설정 시 비활성화
          </span>
        )}
      </div>
      <p className="form-section__hint">
        {disabled
          ? '정기 회비가 없는 모임은 계좌 정보를 등록하지 않습니다.'
          : '회비·회식비 등 정산에 사용할 계좌를 등록해요.'}
      </p>

      <div className="form-group">
        <label htmlFor="bankName">은행</label>
        <select id="bankName" name="bankName" defaultValue={bankName} disabled={disabled}>
          <option value="">선택 안 함</option>
          {BANK_OPTIONS.map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="bankAccountNumber">계좌번호</label>
        <input
          id="bankAccountNumber"
          name="bankAccountNumber"
          defaultValue={bankAccountNumber}
          placeholder="숫자만 입력 (- 없이)"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
        />
      </div>

      <div className="form-group">
        <label htmlFor="bankAccountHolder">예금주</label>
        <input
          id="bankAccountHolder"
          name="bankAccountHolder"
          defaultValue={bankAccountHolder}
          placeholder="예금주 이름"
          disabled={disabled}
        />
      </div>
    </fieldset>
  );
}

function readOptionalField(fd: FormData, key: string) {
  const value = (fd.get(key) as string | null)?.trim();
  return value || null;
}

export function readBankAccountFromForm(fd: FormData) {
  return {
    bankName: readOptionalField(fd, 'bankName'),
    bankAccountNumber: readOptionalField(fd, 'bankAccountNumber'),
    bankAccountHolder: readOptionalField(fd, 'bankAccountHolder'),
  };
}
