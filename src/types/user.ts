import type { StaffRole } from './backorder';

export type ManagedUser = {
  id: string;
  username: string;
  prefix: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateManagedUserInput = {
  username: string;
  prefix: string;
  firstName: string;
  lastName: string;
  password: string;
  role: StaffRole;
};

export type UpdateManagedUserInput = {
  userId: string;
  prefix: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  isActive: boolean;
};
