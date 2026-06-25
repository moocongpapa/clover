import { BANK_OPTIONS } from '../api';

type BankAccountFieldsProps = {
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
};

export default function BankAccountFields({
  bankName = '',
  bankAccountNumber = '',
  bankAccountHolder = '',
}: BankAccountFieldsProps) {
  return (
    <fieldset className="form-section">
      <legend className="form-section__title">모임 통장</legend>
      <p className="form-section__hint">회비·회식비 등 정산에 사용할 계좌를 등록해요.</p>

      <div className="form-group">
        <label htmlFor="bankName">은행</label>
        <select id="bankName" name="bankName" defaultValue={bankName}>
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
        />
      </div>

      <div className="form-group">
        <label htmlFor="bankAccountHolder">예금주</label>
        <input
          id="bankAccountHolder"
          name="bankAccountHolder"
          defaultValue={bankAccountHolder}
          placeholder="예금주 이름"
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
