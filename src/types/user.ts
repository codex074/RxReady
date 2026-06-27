import type { StaffRole } from './backorder';

export type ManagedUser = {
  id: string;
  username: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateManagedUserInput = {
  username: string;
  displayName: string;
  password: string;
  role: StaffRole;
};

export type UpdateManagedUserInput = {
  userId: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
};
