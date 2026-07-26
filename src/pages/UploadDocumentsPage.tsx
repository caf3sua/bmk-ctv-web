import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import Layout from '../components/Layout';
import { uploadCollaboratorDocument } from '../services/api/collaborators';

type FileStatus = 'new' | 'processing' | 'success' | 'fail';

interface UploadItem {
  id: string;
  file: File;
  name: string;
  status: FileStatus;
  message: string;
}

const DOCUMENT_TYPES = [
  { id: 'idCard', label: 'Căn cước công dân (CCCD)' },
  { id: 'serviceContract', label: 'Hợp đồng dịch vụ (HDDV)' },
  { id: 'taxCommitment', label: 'Cam kết thuế (CKT)' },
  { id: 'liquidation', label: 'Biên bản thanh lý (BBTL)' },
];

export default function UploadDocumentsPage() {
  const [docType, setDocType] = useState<string>('idCard');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const addFiles = (fileList: FileList) => {
    const newItems: UploadItem[] = Array.from(fileList).map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random()}`,
      file,
      name: file.name,
      status: 'new',
      message: 'Chờ tải lên',
    }));
    setItems(newItems);
  };

  const onButtonClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const clearList = () => {
    if (uploading) return;
    setItems([]);
  };

  const startUpload = async () => {
    if (items.length === 0 || uploading) return;
    setUploading(true);

    const currentItems = [...items];

    for (let i = 0; i < currentItems.length; i++) {
      if (currentItems[i].status === 'success') continue;

      currentItems[i] = {
        ...currentItems[i],
        status: 'processing',
        message: 'Đang tải lên và phân tích...',
      };
      setItems([...currentItems]);

      try {
        const result = await uploadCollaboratorDocument(currentItems[i].file, docType);
        if (result.status === 'success') {
          currentItems[i] = {
            ...currentItems[i],
            status: 'success',
            message: result.message,
          };
        } else {
          currentItems[i] = {
            ...currentItems[i],
            status: 'fail',
            message: result.message,
          };
        }
      } catch (err: any) {
        currentItems[i] = {
          ...currentItems[i],
          status: 'fail',
          message: err.message || 'Lỗi kết nối hoặc lỗi server',
        };
      }
      setItems([...currentItems]);
    }

    setUploading(false);
  };

  const getStatusBadge = (status: FileStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Mới
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
            Đang xử lý
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Thành công
          </span>
        );
      case 'fail':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Thất bại
          </span>
        );
    }
  };

  return (
    <Layout>
      <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Upload loại hồ sơ</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Chọn loại hồ sơ và kéo thả các tệp tin để cập nhật tự động cho cộng tác viên dựa vào mã số trong tên tệp.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left column: options & actions */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">1. Chọn loại hồ sơ</h2>
            <div className="mt-4 space-y-3">
              {DOCUMENT_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-sm font-medium transition-all cursor-pointer ${
                    docType === type.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="docType"
                    value={type.id}
                    checked={docType === type.id}
                    disabled={uploading}
                    onChange={(e) => setDocType(e.target.value)}
                    className="h-4 w-4 text-accent focus:ring-accent accent-accent"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card space-y-3">
            <button
              onClick={startUpload}
              disabled={uploading || items.length === 0}
              className="btn-primary w-full py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Đang xử lý tải lên...' : 'Bắt đầu tải lên'}
            </button>
            <button
              onClick={clearList}
              disabled={uploading || items.length === 0}
              className="btn-outline-dark w-full py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xóa danh sách
            </button>
          </div>
        </div>

        {/* Right column: Drag and drop & Results */}
        <div className="space-y-6 lg:col-span-3">
          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
              isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-300 hover:border-slate-400 bg-white'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={onButtonClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={uploading}
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:text-slate-500 shadow-sm border border-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Kéo thả các tệp tin vào đây hoặc <span className="text-primary hover:underline">nhấp để duyệt tệp</span>
            </p>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">
              Tên tệp phải chứa mã CTV. Ví dụ: <code className="bg-slate-100 px-1 rounded">CCCD_CTV001.pdf</code> hoặc <code className="bg-slate-100 px-1 rounded">HDDV_CTV002.docx</code>.
            </p>
          </div>

          {/* Table list */}
          <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Danh sách tệp tin tải lên</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border-subtle/60">
              <table className="min-w-full divide-y divide-border-subtle/60 text-sm">
                <thead className="bg-page">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">
                      STT
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tên file
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">
                      Trạng thái
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Thông điệp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400 font-medium">
                        Chưa có tệp tin nào được chọn. Hãy kéo thả file để bắt đầu.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700 break-all">{item.name}</td>
                        <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-600 max-w-xs sm:max-w-sm md:max-w-md break-words">
                          {item.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
