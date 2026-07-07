import seedData from '../../data/collaborators.json';
import type { Collaborator, CollaboratorInput } from '../../types/collaborator';
import { ApiError, delay, readStore, writeStore } from './client';

const STORE_KEY = 'bmk_ctv_collaborators';

function getAll(): Collaborator[] {
  return readStore<Collaborator[]>(STORE_KEY, seedData as Collaborator[]);
}

function saveAll(items: Collaborator[]): void {
  writeStore(STORE_KEY, items);
}

// GET /api/collaborators
export async function listCollaborators(): Promise<Collaborator[]> {
  return delay(getAll());
}

// GET /api/collaborators/:employeeCode
export async function getCollaborator(employeeCode: string): Promise<Collaborator> {
  const found = getAll().find((item) => item.employeeCode === employeeCode);
  if (!found) throw new ApiError(404, `Không tìm thấy cộng tác viên "${employeeCode}"`);
  return delay(found);
}

// POST /api/collaborators
export async function createCollaborator(input: CollaboratorInput): Promise<Collaborator> {
  const items = getAll();
  if (!input.employeeCode.trim()) {
    throw new ApiError(400, 'Mã nhân viên là bắt buộc');
  }
  if (items.some((item) => item.employeeCode === input.employeeCode)) {
    throw new ApiError(409, `Mã nhân viên "${input.employeeCode}" đã tồn tại`);
  }
  const now = new Date().toISOString();
  const created: Collaborator = { ...input, createdAt: now, updatedAt: now };
  saveAll([...items, created]);
  return delay(created);
}

// PUT /api/collaborators/:employeeCode
export async function updateCollaborator(
  originalEmployeeCode: string,
  input: CollaboratorInput,
): Promise<Collaborator> {
  const items = getAll();
  const index = items.findIndex((item) => item.employeeCode === originalEmployeeCode);
  if (index === -1) {
    throw new ApiError(404, `Không tìm thấy cộng tác viên "${originalEmployeeCode}"`);
  }
  if (
    input.employeeCode !== originalEmployeeCode &&
    items.some((item) => item.employeeCode === input.employeeCode)
  ) {
    throw new ApiError(409, `Mã nhân viên "${input.employeeCode}" đã tồn tại`);
  }
  const updated: Collaborator = {
    ...input,
    createdAt: items[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  const next = [...items];
  next[index] = updated;
  saveAll(next);
  return delay(updated);
}

// DELETE /api/collaborators/:employeeCode
export async function deleteCollaborator(employeeCode: string): Promise<void> {
  const items = getAll();
  const next = items.filter((item) => item.employeeCode !== employeeCode);
  if (next.length === items.length) {
    throw new ApiError(404, `Không tìm thấy cộng tác viên "${employeeCode}"`);
  }
  saveAll(next);
  return delay(undefined);
}
