export interface ServiceContract {
  startDate: string | null;
  endDate: string | null;
}

export interface Checklist {
  submittedIdCard: boolean;
  serviceContract: ServiceContract;
  submittedTaxCommitment: boolean;
  liquidationDate: string | null;
  submittedCV: boolean;
  submittedResidenceInfo: boolean;
  submittedDegree: boolean;
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
  submittedIdCard: false,
  serviceContract: { startDate: null, endDate: null },
  submittedTaxCommitment: false,
  liquidationDate: null,
  submittedCV: false,
  submittedResidenceInfo: false,
  submittedDegree: false,
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
