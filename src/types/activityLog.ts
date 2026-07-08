export type ActivityAction =
  | 'login'
  | 'logout'
  | 'create_collaborator'
  | 'update_collaborator'
  | 'delete_collaborator'
  | 'import_collaborators'
  | 'export_collaborators';

export type ActivityResult = 'success' | 'error' | 'fail';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  result: ActivityResult;
  fullName: string;
  username: string;
  message: string;
  createdAt: string;
}
