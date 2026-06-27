import type { User } from '@supabase/supabase-js';
import { requireSupabase, supabase } from '../lib/supabase';
import type { ProfileRow } from '../types/database';
import type { StaffUser } from '../types/backorder';

function profileToUser(profile: ProfileRow, authUser: User): StaffUser {
  return {
    id: profile.id,
    name: profile.display_name || authUser.email || 'เจ้าหน้าที่',
    role: profile.role,
    email: profile.email || authUser.email || '',
  };
}

export async function getCurrentUser(): Promise<StaffUser | null> {
  if (!supabase) return null;

  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  const session = sessionResult.data.session;
  if (!session) return null;

  const profileResult = await supabase
    .from('profiles')
    .select('id, display_name, email, role, is_active, created_at, updated_at')
    .eq('id', session.user.id)
    .single<ProfileRow>();

  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data.is_active) {
    await supabase.auth.signOut();
    throw new Error('บัญชีผู้ใช้นี้ถูกปิดใช้งาน');
  }

  return profileToUser(profileResult.data, session.user);
}

export async function signIn(email: string, password: string): Promise<StaffUser> {
  const client = requireSupabase();
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;

  const user = await getCurrentUser();
  if (!user) throw new Error('ไม่พบข้อมูลเจ้าหน้าที่');
  return user;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const result = await supabase.auth.signOut();
  if (result.error) throw result.error;
}
