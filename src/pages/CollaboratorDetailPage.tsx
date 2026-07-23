import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Layout from '../components/Layout';
import ProfileStatusBadge from '../components/ProfileStatusBadge';
import { ApiError } from '../services/api/client';
import {
  createCollaborator,
  deleteCollaborator,
  getCollaborator,
  updateCollaborator,
} from '../services/api/collaborators';
import { emptyCollaborator, type CollaboratorInput, type ServiceContractPeriod } from '../types/collaborator';
import { getChecklistProgress } from '../utils/checklist';
import { formatDate } from '../utils/date';

type TabKey = 'info' | 'checklist';

export default function CollaboratorDetailPage() {
  const { employeeCode } = useParams<{ employeeCode: string }>();
  const isNew = employeeCode === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState<CollaboratorInput>(emptyCollaborator());
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setError(null);
    setNotFound(false);
    setActiveTab('info');

    if (isNew || !employeeCode) {
      setForm(emptyCollaborator());
      setCreatedAt(null);
      setUpdatedAt(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getCollaborator(employeeCode)
      .then((c) => {
        setForm(c);
        setCreatedAt(c.createdAt);
        setUpdatedAt(c.updatedAt);
      })
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

  function addServiceContract() {
    setForm((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        serviceContracts: [...prev.checklist.serviceContracts, { startDate: null, endDate: null }],
      },
    }));
  }

  function removeServiceContract(index: number) {
    setForm((prev) => {
      if (prev.checklist.serviceContracts.length <= 1) return prev;
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          serviceContracts: prev.checklist.serviceContracts.filter((_, i) => i !== index),
        },
      };
    });
  }

  function updateServiceContract(index: number, patch: Partial<ServiceContractPeriod>) {
    setForm((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        serviceContracts: prev.checklist.serviceContracts.map((period, i) =>
          i === index ? { ...period, ...patch } : period,
        ),
      },
    }));
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

  const progress = getChecklistProgress(form.checklist);

  return (
    <Layout>
      <Link to="/collaborators" className="text-sm text-primary font-semibold hover:underline">
        &larr; Danh sách hồ sơ cộng tác viên
      </Link>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger font-medium">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="mt-4 rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
          {isNew ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-primary">Thêm cộng tác viên mới</h1>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={form.fullName || employeeCode || '?'} size="lg" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{form.fullName || employeeCode}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <ProfileStatusBadge checklist={form.checklist} />
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">Mã NV: {employeeCode}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="btn-danger-outline"
                >
                  Xóa hồ sơ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 border-b border-border-subtle/60">
          <nav className="flex gap-6">
            <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')}>
              Thông tin cá nhân
            </TabButton>
            <TabButton active={activeTab === 'checklist'} onClick={() => setActiveTab('checklist')}>
              Checklist hồ sơ
            </TabButton>
          </nav>
        </div>

        <div className="mt-4">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {!isNew && (
                <div className="space-y-4 lg:col-span-1">
                  <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tóm tắt</h2>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-medium">Ngày tạo hồ sơ</dt>
                        <dd className="font-semibold text-slate-800 font-mono">{formatDate(createdAt)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 font-medium">Cập nhật lần cuối</dt>
                        <dd className="font-semibold text-slate-800 font-mono">{formatDate(updatedAt)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tiến độ checklist hồ sơ</p>
                    <p className="mt-2 font-mono text-3xl font-bold text-slate-900">
                      {progress.done}/{progress.total}
                    </p>
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-page">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(progress.done / progress.total) * 100}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('checklist')}
                      className="mt-3 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Xem chi tiết checklist &rarr;
                    </button>
                  </div>
                </div>
              )}

              <section
                className={`rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card ${
                  isNew ? 'lg:col-span-3' : 'lg:col-span-2'
                }`}
              >
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Thông tin cá nhân</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Mã nhân viên" required>
                    <input
                      type="text"
                      required
                      disabled={!isNew}
                      value={form.employeeCode}
                      onChange={(e) => updateField('employeeCode', e.target.value)}
                      className="input disabled:bg-slate-100/50 disabled:text-slate-400 disabled:border-slate-200"
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
                      className="input font-mono"
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
                      className="input font-mono"
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
                      className="input font-mono"
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
            </div>
          )}

          {activeTab === 'checklist' && (
            <section className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Checklist hồ sơ</h2>
              <div className="mt-4 overflow-x-auto rounded-xl border border-border-subtle/60">
                <table className="min-w-full divide-y divide-border-subtle/60 text-sm">
                  <thead className="bg-page">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Loại hồ sơ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Thông tin
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60">
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">CCCD</td>
                      <td className="px-4 py-3">
                        <CheckboxField
                          label="Đã nộp"
                          checked={form.checklist.submittedIdCard}
                          onChange={(checked) => updateChecklistField('submittedIdCard', checked)}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-700">
                        Hợp đồng dịch vụ
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-3">
                          {form.checklist.serviceContracts.map((period, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                Từ
                                <input
                                  type="date"
                                  value={period.startDate ?? ''}
                                  onChange={(e) =>
                                    updateServiceContract(index, { startDate: e.target.value || null })
                                  }
                                  className="input w-auto font-mono"
                                />
                              </label>
                              <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                Đến
                                <input
                                  type="date"
                                  value={period.endDate ?? ''}
                                  onChange={(e) =>
                                    updateServiceContract(index, { endDate: e.target.value || null })
                                  }
                                  className="input w-auto font-mono"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeServiceContract(index)}
                                disabled={form.checklist.serviceContracts.length <= 1}
                                title={
                                  form.checklist.serviceContracts.length <= 1
                                    ? 'Phải giữ ít nhất 1 hợp đồng dịch vụ'
                                    : 'Xóa hợp đồng này'
                                }
                                className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                              >
                                Xóa
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addServiceContract}
                            className="text-sm font-semibold text-primary hover:underline cursor-pointer inline-block"
                          >
                            + Thêm hợp đồng
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">Cam kết thuế</td>
                      <td className="px-4 py-3">
                        <CheckboxField
                          label="Đã nộp"
                          checked={form.checklist.submittedTaxCommitment}
                          onChange={(checked) => updateChecklistField('submittedTaxCommitment', checked)}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">Biên bản thanh lý</td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={form.checklist.liquidationDate ?? ''}
                          onChange={(e) => updateChecklistField('liquidationDate', e.target.value || null)}
                          className="input w-auto font-mono"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">CV</td>
                      <td className="px-4 py-3">
                        <CheckboxField
                          label="Đã nộp"
                          checked={form.checklist.submittedCV}
                          onChange={(checked) => updateChecklistField('submittedCV', checked)}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">Thông tin cư trú</td>
                      <td className="px-4 py-3">
                        <CheckboxField
                          label="Đã nộp"
                          checked={form.checklist.submittedResidenceInfo}
                          onChange={(checked) => updateChecklistField('submittedResidenceInfo', checked)}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">Bằng cấp</td>
                      <td className="px-4 py-3">
                        <CheckboxField
                          label="Đã nộp"
                          checked={form.checklist.submittedDegree}
                          onChange={(checked) => updateChecklistField('submittedDegree', checked)}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            to="/collaborators"
            className="btn-outline-dark"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </div>
      </form>
    </Layout>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
        active ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
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
    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent accent-accent cursor-pointer"
      />
      {label}
    </label>
  );
}
