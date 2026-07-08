import type { ActivityAction, ActivityResult } from '../types/activityLog';

const ACTION_LABELS: Record<ActivityAction, string> = {
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  create_collaborator: 'Tạo CTV',
  update_collaborator: 'Cập nhật CTV',
  delete_collaborator: 'Xóa CTV',
  import_collaborators: 'Nhập dữ liệu CTV',
  export_collaborators: 'Xuất dữ liệu CTV',
};

const RESULT_LABELS: Record<ActivityResult, string> = {
  success: 'Thành công',
  fail: 'Thất bại',
  error: 'Lỗi hệ thống',
};

export function actionLabel(action: ActivityAction): string {
  return ACTION_LABELS[action] ?? action;
}

export function resultLabel(result: ActivityResult): string {
  return RESULT_LABELS[result] ?? result;
}
