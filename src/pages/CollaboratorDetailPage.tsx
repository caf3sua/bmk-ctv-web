import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import ConfirmModal from '../components/ConfirmModal';
import CollaboratorActivityTimeline from '../components/CollaboratorActivityTimeline';
import Layout from '../components/Layout';
import ProfileStatusBadge from '../components/ProfileStatusBadge';
import { ApiError } from '../services/api/client';
import {
  createCollaborator,
  deleteCollaborator,
  getCollaborator,
  updateCollaborator,
  downloadCollaboratorDocument,
  deleteCollaboratorDocument,
} from '../services/api/collaborators';
import { emptyCollaborator, type CollaboratorInput, type ServiceContractPeriod } from '../types/collaborator';
import { getChecklistProgress, parseUploadedFileMeta } from '../utils/checklist';
import { formatDate, formatDateTime } from '../utils/date';

type TabKey = 'info' | 'checklist' | 'history';

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
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<{ fileKey: string; filename: string } | null>(null);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);
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



  function addServiceContract() {
    setForm((prev) => {
      const hddv = prev.checklist.hddv || { contract_date: [], files: [] };
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          hddv: {
            ...hddv,
            contract_date: [...(hddv.contract_date || []), { startDate: null, endDate: null }],
          },
        },
      };
    });
  }

  function removeServiceContract(index: number) {
    setForm((prev) => {
      const hddv = prev.checklist.hddv || { contract_date: [], files: [] };
      if ((hddv.contract_date || []).length <= 1) return prev;
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          hddv: {
            ...hddv,
            contract_date: (hddv.contract_date || []).filter((_, i) => i !== index),
          },
        },
      };
    });
  }

  function updateServiceContract(index: number, patch: Partial<ServiceContractPeriod>) {
    setForm((prev) => {
      const hddv = prev.checklist.hddv || { contract_date: [], files: [] };
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          hddv: {
            ...hddv,
            contract_date: (hddv.contract_date || []).map((period, i) =>
              i === index ? { ...period, ...patch } : period,
            ),
          },
        },
      };
    });
  }

  function updateCccdChecked(checked: boolean) {
    setForm((prev) => {
      const cccd = prev.checklist.cccd || { checked: false, file: null };
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          cccd: { ...cccd, checked },
        },
      };
    });
  }

  function updateCktChecked(checked: boolean) {
    setForm((prev) => {
      const ckt = prev.checklist.ckt || { checked: false, file: null };
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          ckt: { ...ckt, checked },
        },
      };
    });
  }

  function updateBbtlDate(date: string | null) {
    setForm((prev) => {
      const bbtl = prev.checklist.bbtl || { date: null, file: null };
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          bbtl: { ...bbtl, date },
        },
      };
    });
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

  function openConfirmDeleteProfile() {
    if (!employeeCode || isNew) return;
    setConfirmDeleteProfile(true);
  }

  async function executeDeleteProfile() {
    if (!employeeCode || isNew) return;
    setSaving(true);
    try {
      await deleteCollaborator(employeeCode);
      navigate('/collaborators');
    } catch {
      setError('Xóa dữ liệu thất bại');
      setSaving(false);
      setConfirmDeleteProfile(false);
    }
  }

  const downloadDocument = async (docType: string, fullS3Key: string) => {
    if (!employeeCode || isNew) return;
    try {
      const { filename } = parseUploadedFileMeta(fullS3Key, `${docType}_document`);
      await downloadCollaboratorDocument(employeeCode, docType, filename, fullS3Key);
    } catch {
      alert('Không thể tải tệp tin');
    }
  };

  const openConfirmDeleteContractFile = (fileKey: string, defaultName?: string) => {
    const { filename } = parseUploadedFileMeta(fileKey, defaultName);
    setConfirmDeleteFile({ fileKey, filename });
  };

  const handleConfirmDeleteContractFile = async () => {
    if (!confirmDeleteFile) return;
    const { fileKey } = confirmDeleteFile;

    if (!employeeCode || isNew) {
      setForm((prev) => {
        const hddv = prev.checklist.hddv || { contract_date: [], files: [] };
        return {
          ...prev,
          checklist: {
            ...prev.checklist,
            hddv: {
              ...hddv,
              files: (hddv.files || []).filter((f) => (typeof f === 'string' ? f : f.name) !== fileKey),
            },
          },
        };
      });
      setConfirmDeleteFile(null);
      return;
    }

    setDeletingFile(fileKey);
    try {
      await deleteCollaboratorDocument(employeeCode, 'serviceContract', fileKey);
      setForm((prev) => {
        const hddv = prev.checklist.hddv || { contract_date: [], files: [] };
        return {
          ...prev,
          checklist: {
            ...prev.checklist,
            hddv: {
              ...hddv,
              files: (hddv.files || []).filter((f) => (typeof f === 'string' ? f : f.name) !== fileKey),
            },
          },
        };
      });
      setConfirmDeleteFile(null);
    } catch (err) {
      alert('Không thể xóa tệp tin: ' + (err instanceof Error ? err.message : 'Đã có lỗi xảy ra'));
    } finally {
      setDeletingFile(null);
    }
  };

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
                  onClick={openConfirmDeleteProfile}
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
            {!isNew && (
              <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                Lịch sử
              </TabButton>
            )}
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
                        <div className="flex items-center justify-between gap-3">
                          <CheckboxField
                            label="Đã nộp"
                            checked={form.checklist.cccd?.checked || false}
                            onChange={(checked) => updateCccdChecked(checked)}
                          />
                          {form.checklist.cccd?.file?.name && (
                            <div className="flex items-center gap-3">
                              {form.checklist.cccd.file.updatedDate && (
                                <span className="text-[11px] text-slate-400 font-mono" title={`Ngày tải lên: ${formatDateTime(form.checklist.cccd.file.updatedDate)}`}>
                                  {formatDateTime(form.checklist.cccd.file.updatedDate)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => downloadDocument('idCard', form.checklist.cccd.file!.name)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-3.5 w-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Tải file
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-700">
                        Hợp đồng dịch vụ
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-3">
                          {(form.checklist.hddv?.contract_date || []).map((period, index) => (
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
                                disabled={(form.checklist.hddv?.contract_date || []).length <= 1}
                                title={
                                  (form.checklist.hddv?.contract_date || []).length <= 1
                                    ? 'Phải giữ ít nhất 1 hợp đồng dịch vụ'
                                    : 'Xóa hợp đồng này'
                                }
                                className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                              >
                                Xóa
                              </button>
                            </div>
                          ))}
                          <div className="flex flex-col gap-2 pt-1">
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={addServiceContract}
                                className="text-sm font-semibold text-primary hover:underline cursor-pointer inline-block"
                              >
                                + Thêm hợp đồng
                              </button>
                            </div>
                            {/* Render files upload list */}
                            {((form.checklist.hddv?.files || [])).length > 0 && (
                              <div className="flex flex-col gap-1.5 mt-1 border-t border-slate-100 pt-2">
                                {form.checklist.hddv.files.map((item, index) => {
                                  const fileKey = typeof item === 'string' ? item : item.name;
                                  const updatedDate = typeof item === 'object' && item !== null ? item.updatedDate : null;
                                  const defaultName = `Hợp đồng ${index + 1}`;
                                  const { filename: displayFilename, uploadDate: parsedDate } = parseUploadedFileMeta(fileKey, defaultName);
                                  const uploadDate = updatedDate ? formatDateTime(updatedDate) : parsedDate;
                                  return (
                                    <div key={fileKey} className="flex items-center justify-between gap-4 text-xs">
                                      <span className="text-slate-600 font-medium truncate max-w-[200px]" title={fileKey}>
                                        {displayFilename}
                                      </span>
                                      <div className="flex items-center gap-3">
                                        {uploadDate && (
                                          <span
                                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono"
                                            title={`Ngày tải lên: ${uploadDate}`}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-slate-400">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                            </svg>
                                            {uploadDate}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => downloadDocument('serviceContract', fileKey)}
                                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-3.5 w-3.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                          </svg>
                                          Tải xuống
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openConfirmDeleteContractFile(fileKey, defaultName)}
                                          disabled={deletingFile === fileKey}
                                          className="inline-flex items-center gap-1 font-semibold text-danger hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-3.5 w-3.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                          </svg>
                                          {deletingFile === fileKey ? 'Đang xóa...' : 'Xóa'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">Cam kết thuế</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <CheckboxField
                            label="Đã nộp"
                            checked={form.checklist.ckt?.checked || false}
                            onChange={(checked) => updateCktChecked(checked)}
                          />
                          {form.checklist.ckt?.file?.name && (
                            <div className="flex items-center gap-3">
                              {form.checklist.ckt.file.updatedDate && (
                                <span className="text-[11px] text-slate-400 font-mono" title={`Ngày tải lên: ${formatDateTime(form.checklist.ckt.file.updatedDate)}`}>
                                  {formatDateTime(form.checklist.ckt.file.updatedDate)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => downloadDocument('taxCommitment', form.checklist.ckt.file!.name)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-3.5 w-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Tải file
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">Biên bản thanh lý</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="date"
                            value={form.checklist.bbtl?.date ?? ''}
                            onChange={(e) => updateBbtlDate(e.target.value || null)}
                            className="input w-auto font-mono"
                          />
                          {form.checklist.bbtl?.file?.name && (
                            <div className="flex items-center gap-3">
                              {form.checklist.bbtl.file.updatedDate && (
                                <span className="text-[11px] text-slate-400 font-mono" title={`Ngày tải lên: ${formatDateTime(form.checklist.bbtl.file.updatedDate)}`}>
                                  {formatDateTime(form.checklist.bbtl.file.updatedDate)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => downloadDocument('liquidation', form.checklist.bbtl.file!.name)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-3.5 w-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Tải file biên bản
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'history' && employeeCode && (
            <CollaboratorActivityTimeline employeeCode={employeeCode} />
          )}
        </div>

        {activeTab !== 'history' && (
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
        )}
      </form>

      <ConfirmModal
        isOpen={Boolean(confirmDeleteFile)}
        title="Xác nhận xóa Hợp đồng dịch vụ"
        message={
          <span>
            Bạn có chắc chắn muốn xóa file{' '}
            <span className="font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-xs inline-block max-w-[280px] truncate align-bottom">
              "{confirmDeleteFile?.filename}"
            </span>{' '}
            không?
          </span>
        }
        note="Lưu ý: Tệp tin sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục."
        confirmLabel={deletingFile ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
        cancelLabel="Hủy bỏ"
        variant="danger"
        loading={Boolean(deletingFile)}
        onConfirm={handleConfirmDeleteContractFile}
        onCancel={() => {
          if (!deletingFile) setConfirmDeleteFile(null);
        }}
      />

      <ConfirmModal
        isOpen={confirmDeleteProfile}
        title="Xác nhận xóa hồ sơ cộng tác viên"
        message={
          <span>
            Bạn có chắc chắn muốn xóa toàn bộ hồ sơ của cộng tác viên{' '}
            <span className="font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-xs">
              "{form.fullName || employeeCode}"
            </span>{' '}
            không?
          </span>
        }
        note="Lưu ý: Toàn bộ thông tin cá nhân và checklist hồ sơ sẽ bị xóa vĩnh viễn khỏi hệ thống."
        confirmLabel={saving ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
        cancelLabel="Hủy bỏ"
        variant="danger"
        loading={saving}
        onConfirm={executeDeleteProfile}
        onCancel={() => {
          if (!saving) setConfirmDeleteProfile(false);
        }}
      />
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
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 text-sm text-slate-700 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent accent-accent ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      />
      {label}
    </label>
  );
}
