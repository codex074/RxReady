import type { ProfileRow } from '../types/database';
import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
} from '../types/user';
import { requireSupabase } from '../lib/supabase';

type FunctionResponse = {
  users?: ProfileRow[];
  user?: ProfileRow;
  success?: boolean;
  error?: string;
};

function toManagedUser(profile: ProfileRow): ManagedUser {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

async function invokeAdminUsers(body: Record<string, unknown>): Promise<FunctionResponse> {
  const result = await requireSupabase().functions.invoke<FunctionResponse>('admin-users', {
    body,
  });
  if (result.error) {
    const context = 'context' in result.error ? result.error.context : null;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as FunctionResponse | null;
      if (payload?.error) throw new Error(payload.error);
    }
    throw result.error;
  }
  if (result.data?.error) throw new Error(result.data.error);
  return result.data || {};
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const data = await invokeAdminUsers({ action: 'list' });
  return (data.users || []).map(toManagedUser);
}

export async function createManagedUser(
  input: CreateManagedUserInput,
): Promise<ManagedUser> {
  const data = await invokeAdminUsers({ action: 'create', ...input });
  if (!data.user) throw new Error('ไม่พบข้อมูลผู้ใช้ที่สร้าง');
  return toManagedUser(data.user);
}

export async function updateManagedUser(
  input: UpdateManagedUserInput,
): Promise<ManagedUser> {
  const data = await invokeAdminUsers({ action: 'update', ...input });
  if (!data.user) throw new Error('ไม่พบข้อมูลผู้ใช้ที่แก้ไข');
  return toManagedUser(data.user);
}

export async function resetManagedUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  await invokeAdminUsers({ action: 'reset_password', userId, password });
}
