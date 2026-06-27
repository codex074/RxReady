import { requireSupabase, supabase } from '../lib/supabase';
import type { ProfileRow } from '../types/database';
import type { StaffUser } from '../types/backorder';

function profileToUser(profile: ProfileRow): StaffUser {
  return {
    id: profile.id,
    name: profile.display_name || profile.username || 'เจ้าหน้าที่',
    role: profile.role,
    username: profile.username,
  };
}

function normalizeUsername(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
    throw new Error('ชื่อผู้ใช้ต้องมี 3-32 ตัว และใช้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง');
  }
  return normalized;
}

function authCredentials(username: string, pin: string) {
  const normalizedUsername = normalizeUsername(username);
  return {
    email: `${normalizedUsername}@usc-rxready.vercel.app`,
    // Supabase enforces a longer password while staff continue using the requested PIN.
    password: `RxReady#${pin}`,
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
    .select('id, username, display_name, role, is_active, created_at, updated_at')
    .eq('id', session.user.id)
    .single<ProfileRow>();

  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data.is_active) {
    await supabase.auth.signOut();
    throw new Error('บัญชีผู้ใช้นี้ถูกปิดใช้งาน');
  }

  return profileToUser(profileResult.data);
}

export async function signIn(username: string, pin: string): Promise<StaffUser> {
  const client = requireSupabase();
  const result = await client.auth.signInWithPassword(authCredentials(username, pin));
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
