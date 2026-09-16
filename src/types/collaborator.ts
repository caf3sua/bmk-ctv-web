export interface ServiceContractPeriod {
  startDate: string | null;
  endDate: string | null;
}

export interface ChecklistFileItem {
  name: string;
  updatedDate?: string | null;
}

export interface Checklist {
  cccd: {
    checked: boolean;
    file: ChecklistFileItem | null;
  };
  ckt: {
    checked: boolean;
    file: ChecklistFileItem | null;
  };
  hddv: {
    contract_date: ServiceContractPeriod[];
    files: ChecklistFileItem[];
  };
  bbtl: {
    date: string | null;
    file: ChecklistFileItem | null;
  };
}

export interface Collaborator {
  employeeCode: string;
  fullName: string;
  taxCode: string;
  dob: string | null;
  idNumber: string;
  email: string;
  phone: string;
  address: string;
  checklist: Checklist;
  createdAt: string;
  updatedAt: string;
}

export type CollaboratorInput = Omit<Collaborator, 'createdAt' | 'updatedAt'>;

export const emptyChecklist = (): Checklist => ({
  cccd: {
    checked: false,
    file: null,
  },
  ckt: {
    checked: false,
    file: null,
  },
  hddv: {
    contract_date: [{ startDate: null, endDate: null }],
    files: [],
  },
  bbtl: {
    date: null,
    file: null,
  },
});

export const emptyCollaborator = (): CollaboratorInput => ({
  employeeCode: '',
  fullName: '',
  taxCode: '',
  dob: null,
  idNumber: '',
  email: '',
  phone: '',
  address: '',
  checklist: emptyChecklist(),
});
