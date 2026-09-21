export interface TpBankContractItem {
  contractNumber: string;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  status?: string | null;
  year?: number | null;
  period?: string | null;
  hrbp?: string | null;
  note?: string | null;
}

export interface TpBankInfo {
  contractCount?: number | null;
  contracts: TpBankContractItem[];
}

export interface BmkHrInfo {
  contractCount: number;
  idCardCount: number;
  liquidationCount: number;
  taxCommitmentCount: number;
}

export interface BmkSystemInfo {
  contractCount: number;
  idCardCount: number;
  liquidationCount: number;
  taxCommitmentCount: number;
}

export interface ReconciliationResultDetail {
  contract?: 'success' | 'failed' | null;
  idCard?: 'success' | 'failed' | null;
  liquidation?: 'success' | 'failed' | null;
  taxCommitment?: 'success' | 'failed' | null;
}

export type ReconciliationSource = 'bmk_system' | 'bmk_hr' | 'tpbank' | string;

export interface ReconciliationRecord {
  id: string;
  employeeCode: string;
  fullName: string;
  idNumber?: string | null;
  createdSource?: ReconciliationSource | null;
  isBmkSystemExist?: boolean;
  isSynced?: boolean;
  departmentLevel1?: string | null;
  position?: string | null;
  employmentStatus?: string | null;
  onboardDate?: string | null;
  offboardDate?: string | null;
  tpbankInfo: TpBankInfo;
  bmkHrInfo: BmkHrInfo;
  bmkSystemInfo: BmkSystemInfo;
  result?: ReconciliationResultDetail | null;
  reconciliationStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface ReconciliationListResponse {
  items: ReconciliationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListReconciliationParams {
  keyword?: string;
  employment_status?: string;
  reconciliation_status?: string;
  created_source?: string;
  is_synced?: string;
  result_status?: string;
  page?: number;
  page_size?: number;
}

export interface SyncSystemInfoResult {
  status: string;
  message: string;
  totalProcessed: number;
}

export interface ImportHrBmkResult {
  status: string;
  message: string;
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
}

