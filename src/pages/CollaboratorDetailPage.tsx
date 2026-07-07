import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { ApiError } from '../services/api/client';
import {
  createCollaborator,
  deleteCollaborator,
  getCollaborator,
  updateCollaborator,
} from '../services/api/collaborators';
import { emptyCollaborator, type CollaboratorInput } from '../types/collaborator';

export default function CollaboratorDetailPage() {
  const { employeeCode } = useParams<{ employeeCode: string }>();
  const isNew = employeeCode === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState<CollaboratorInput>(emptyCollaborator());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isNew || !employeeCode) return;
    setLoading(true);
    getCollaborator(employeeCode)
      .then((c) => setForm(c))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError('Không thể tải dữ liệu cộng tác viên');
      })
      .finally(() => setLoading(false));
  }, [employeeCode, isNew]);

  function updateField<K extends keyof CollaboratorInput>(key: K, value: CollaboratorInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateChecklistField<K extends keyof CollaboratorInput['checklist']>(
    key: K,
    value: CollaboratorInput['checklist'][K],
  ) {
    setForm((prev) => ({ ...prev, checklist: { ...prev.checklist, [key]: value } }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isNew) {
        await createCollaborator(form);
      } else if (employeeCode) {
        await updateCollaborator(employeeCode, form);
      }
      navigate('/collaborators');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lưu dữ liệu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employeeCode || isNew) return;
    if (!window.confirm(`Xóa hồ sơ cộng tác viên "${form.fullName || employeeCode}"?`)) return;
    setSaving(true);
    try {
      await deleteCollaborator(employeeCode);
      navigate('/collaborators');
    } catch {
      setError('Xóa dữ liệu thất bại');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Không tìm thấy cộng tác viên.</p>
        <Link to="/collaborators" className="mt-2 inline-block text-sm text-primary hover:underline">
          &larr; Quay lại danh sách
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <Link to="/collaborators" className="text-sm text-primary hover:underline">
            &larr; Danh sách hồ sơ cộng tác viên
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {isNew ? 'Thêm cộng tác viên mới' : form.fullName || employeeCode}
          </h1>
        </div>
        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
          >
            Xóa hồ sơ
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Thông tin cá nhân</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mã nhân viên" required>
              <input
                type="text"
                required
                disabled={!isNew}
                value={form.employeeCode}
                onChange={(e) => updateField('employeeCode', e.target.value)}
                className="input disabled:bg-slate-100 disabled:text-slate-500"
              />
            </Field>
            <Field label="Họ tên">
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Mã số thuế">
              <input
                type="text"
                value={form.taxCode}
                onChange={(e) => updateField('taxCode', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Ngày sinh">
              <input
                type="date"
                value={form.dob ?? ''}
                onChange={(e) => updateField('dob', e.target.value || null)}
                className="input"
              />
            </Field>
            <Field label="Số CCCD">
              <input
                type="text"
                value={form.idNumber}
                onChange={(e) => updateField('idNumber', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Địa chỉ">
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Checklist nộp hồ sơ</h2>
          <div className="mt-4 space-y-4">
            <CheckboxField
              label="Đã nộp CCCD"
              checked={form.checklist.submittedIdCard}
              onChange={(checked) => updateChecklistField('submittedIdCard', checked)}
            />

            <div className="rounded-lg border border-border-subtle p-4">
              <p className="text-sm font-medium text-slate-700">Hợp đồng dịch vụ</p>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ngày bắt đầu">
                  <input
                    type="date"
                    value={form.checklist.serviceContract.startDate ?? ''}
                    onChange={(e) =>
                      updateChecklistField('serviceContract', {
                        ...form.checklist.serviceContract,
                        startDate: e.target.value || null,
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Ngày kết thúc">
                  <input
                    type="date"
                    value={form.checklist.serviceContract.endDate ?? ''}
                    onChange={(e) =>
                      updateChecklistField('serviceContract', {
                        ...form.checklist.serviceContract,
                        endDate: e.target.value || null,
                      })
                    }
                    className="input"
                  />
                </Field>
              </div>
            </div>

            <CheckboxField
              label="Đã nộp cam kết thuế"
              checked={form.checklist.submittedTaxCommitment}
              onChange={(checked) => updateChecklistField('submittedTaxCommitment', checked)}
            />

            <Field label="Biên bản thanh lý (ngày)">
              <input
                type="date"
                value={form.checklist.liquidationDate ?? ''}
                onChange={(e) => updateChecklistField('liquidationDate', e.target.value || null)}
                className="input max-w-xs"
              />
            </Field>

            <CheckboxField
              label="Đã nộp CV"
              checked={form.checklist.submittedCV}
              onChange={(checked) => updateChecklistField('submittedCV', checked)}
            />
            <CheckboxField
              label="Đã nộp thông tin cư trú"
              checked={form.checklist.submittedResidenceInfo}
              onChange={(checked) => updateChecklistField('submittedResidenceInfo', checked)}
            />
            <CheckboxField
              label="Đã nộp bằng cấp"
              checked={form.checklist.submittedDegree}
              onChange={(checked) => updateChecklistField('submittedDegree', checked)}
            />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            to="/collaborators"
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </div>
      </form>
    </Layout>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary"
      />
      {label}
    </label>
  );
}
