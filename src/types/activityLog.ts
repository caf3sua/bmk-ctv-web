export type ActivityAction =
  | 'login'
  | 'logout'
  | 'create_collaborator'
  | 'update_collaborator'
  | 'delete_collaborator'
  | 'import_collaborators'
  | 'export_collaborators'
  | 'export_collaborators_doisoat'
  | 'upload_collaborator_document'
  | 'delete_collaborator_document';

export type ActivityResult = 'success' | 'error' | 'fail';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  result: ActivityResult;
  fullName: string;
  username: string;
  message: string;
  employeeCode?: string | null;
  createdAt: string;
}

