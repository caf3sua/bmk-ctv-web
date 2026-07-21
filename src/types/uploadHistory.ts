export interface UploadHistory {
  id: string;
  filename: string;
  s3Key: string;
  s3Bucket: string;
  uploadedBy: string;
  username: string;
  rowsProcessed: number;
  createdCount: number;
  updatedCount: number;
  status: 'success' | 'fail';
  message: string;
  createdAt: string;
}
