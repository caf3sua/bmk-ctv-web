import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { listUploadHistories, downloadUploadHistoryFile } from '../services/api/uploadHistory';
import type { UploadHistory } from '../types/uploadHistory';
import { formatDateTime } from '../utils/date';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function UploadHistoryPage() {
  const [histories, setHistories] = useState<UploadHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'fail'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    listUploadHistories()
      .then(setHistories)
      .catch((err) => console.error('Lỗi khi tải lịch sử upload:', err))
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return histories.filter((h) => {
      const matchesKeyword =
        !term ||
        h.filename.toLowerCase().includes(term) ||
        h.uploadedBy.toLowerCase().includes(term) ||
        h.username.toLowerCase().includes(term) ||
        h.message.toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'all' || h.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [histories, keyword, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function handleDownload(id: string, filename: string) {
    if (downloadingId) return;
    setDownloadingId(id);
    try {
      await downloadUploadHistoryFile(id, filename);
    } catch (err) {
      alert('Không thể tải xuống file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch sử Upload file</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} / {histories.length} tệp tin đã upload
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Làm mới
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo tên file, người upload, thông báo..."
          className="input w-full max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'fail')}
          className="input w-auto"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="success">Thành công</option>
          <option value="fail">Thất bại</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="input w-auto"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} dòng / trang
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border-subtle bg-white shadow-sm">
        <table className="min-w-full divide-y divide-border-subtle text-sm">
          <thead className="bg-page">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Thời gian</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tên file</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Người upload</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Số dòng xử lý</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Thông báo</th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Không tìm thấy lịch sử upload nào.
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((history) => (
                <tr key={history.id} className="hover:bg-page">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(history.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-emerald-600 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      <span className="truncate max-w-[200px] block" title={history.filename}>
                        {history.filename}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${
                        history.status === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${history.status === 'success' ? 'bg-green-600' : 'bg-red-600'}`} />
                      {history.status === 'success' ? 'Thành công' : 'Thất bại'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                    <div className="text-sm font-medium">{history.uploadedBy}</div>
                    <div className="text-xs text-slate-500 font-mono">@{history.username}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                    {history.status === 'success' ? (
                      <div>
                        <div className="font-semibold text-slate-700">
                          {history.rowsProcessed} dòng
                        </div>
                        <div className="text-xs text-slate-500">
                          Mới: <span className="text-green-600 font-medium">{history.createdCount}</span> | Sửa:{' '}
                          <span className="text-blue-600 font-medium">{history.updatedCount}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-md">
                    <div className={expandedIds[history.id] ? "whitespace-pre-line text-xs font-mono text-slate-700 max-h-60 overflow-y-auto" : "truncate max-w-xs"} title={history.message}>
                      {history.message}
                    </div>
                    {history.message.includes('\n') && (
                      <button
                        onClick={() => toggleExpand(history.id)}
                        className="text-xs text-primary hover:underline mt-1 block font-medium"
                      >
                        {expandedIds[history.id] ? 'Thu gọn' : 'Xem chi tiết'}
                      </button>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={downloadingId !== null}
                      onClick={() => handleDownload(history.id, history.filename)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-subtle bg-white text-slate-700 shadow-sm hover:bg-slate-50 ${
                        downloadingId !== null ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {downloadingId === history.id ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Tải file
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-500">
            Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} trên{' '}
            {filtered.length} tệp tin
          </p>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </Layout>
  );
}
