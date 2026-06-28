import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const roles = ['admin', 'sub-admin', 'staff'] as const;
type StaffRole = (typeof roles)[number];

const PROFILE_COLUMNS = 'id, username, prefix, f_name, l_name, role, is_active, created_at, updated_at';

type RequestBody =
  | { action: 'list' }
  | {
      action: 'create';
      username: string;
      prefix: string;
      firstName: string;
      lastName: string;
      password: string;
      role: StaffRole;
    }
  | {
      action: 'update';
      userId: string;
      prefix: string;
      firstName: string;
      lastName: string;
      role: StaffRole;
      isActive: boolean;
    }
  | { action: 'set_active'; userId: string; isActive: boolean }
  | { action: 'reset_password'; userId: string; password: string }
  | { action: 'update_self'; prefix: string; firstName: string; lastName: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('ชื่อผู้ใช้ต้องมี 3-32 ตัว และใช้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง');
  }
  return username;
}

function validatePassword(value: string) {
  if (value.length < 4 || value.length > 64) {
    throw new Error('รหัสผ่านต้องมี 4-64 ตัว');
  }
}

function nameParts(body: { prefix?: string; firstName?: string; lastName?: string }) {
  const prefix = (body.prefix || '').trim();
  const firstName = (body.firstName || '').trim();
  const lastName = (body.lastName || '').trim();
  if (!firstName) throw new Error('กรุณากรอกชื่อ');
  return { prefix, firstName, lastName };
}

function composeName(prefix: string, firstName: string, lastName: string) {
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return `${prefix}${name}`.trim();
}

function validateRole(value: string): asserts value is StaffRole {
  if (!roles.includes(value as StaffRole)) {
    throw new Error('สิทธิ์ผู้ใช้ไม่ถูกต้อง');
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Edge Function configuration is incomplete');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice('Bearer '.length);
    const authResult = await adminClient.auth.getUser(token);
    if (authResult.error || !authResult.data.user) return json({ error: 'Unauthorized' }, 401);

    const callerResult = await adminClient
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', authResult.data.user.id)
      .single();
    if (callerResult.error || !callerResult.data?.is_active) {
      return json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, 403);
    }

    const body = (await request.json()) as RequestBody;

    const callerId = callerResult.data.id;

    async function auditLog(action: string, detail: Record<string, unknown>) {
      await adminClient.from('audit_logs').insert({
        action,
        actor_id: callerId,
        actor_type: 'staff',
        detail,
      });
    }

    if (body.action === 'update_self') {
      const { prefix, firstName, lastName } = nameParts(body);
      const updateResult = await adminClient
        .from('profiles')
        .update({ prefix, f_name: firstName, l_name: lastName })
        .eq('id', callerId)
        .select(PROFILE_COLUMNS)
        .single();
      if (updateResult.error) throw updateResult.error;
      await auditLog('self_update_profile', { name: composeName(prefix, firstName, lastName) });
      return json({ user: updateResult.data });
    }

    if (callerResult.data.role !== 'admin') {
      return json({ error: 'ไม่มีสิทธิ์จัดการผู้ใช้' }, 403);
    }

    if (body.action === 'list') {
      const result = await adminClient
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .order('created_at', { ascending: true });
      if (result.error) throw result.error;
      return json({ users: result.data });
    }

    if (body.action === 'create') {
      const username = normalizeUsername(body.username);
      const { prefix, firstName, lastName } = nameParts(body);
      validatePassword(body.password);
      validateRole(body.role);

      const existing = await adminClient
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }, 409);

      const authCreate = await adminClient.auth.admin.createUser({
        email: `${username}@usc-rxready.vercel.app`,
        password: `RxReady#${body.password}`,
        email_confirm: true,
        user_metadata: { username, prefix, f_name: firstName, l_name: lastName },
      });
      if (authCreate.error || !authCreate.data.user) {
        throw authCreate.error || new Error('สร้างบัญชีไม่สำเร็จ');
      }

      const profileResult = await adminClient.from('profiles').upsert({
        id: authCreate.data.user.id,
        username,
        prefix,
        f_name: firstName,
        l_name: lastName,
        role: body.role,
        is_active: true,
      }).select(PROFILE_COLUMNS).single();

      if (profileResult.error) {
        await adminClient.auth.admin.deleteUser(authCreate.data.user.id);
        throw profileResult.error;
      }
      await auditLog('admin_create_user', { targetUserId: authCreate.data.user.id, username, name: composeName(prefix, firstName, lastName), role: body.role });
      return json({ user: profileResult.data }, 201);
    }

    if (body.action === 'update') {
      const { prefix, firstName, lastName } = nameParts(body);
      validateRole(body.role);

      const targetResult = await adminClient
        .from('profiles')
        .select('id, username, role, is_active')
        .eq('id', body.userId)
        .single();
      if (targetResult.error) throw targetResult.error;

      const removesActiveAdmin =
        targetResult.data.role === 'admin' &&
        targetResult.data.is_active &&
        (body.role !== 'admin' || !body.isActive);
      if (body.userId === callerId && removesActiveAdmin) {
        return json({ error: 'ไม่สามารถลดสิทธิ์หรือปิดบัญชีของตนเองได้' }, 409);
      }
      if (removesActiveAdmin) {
        const countResult = await adminClient
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('is_active', true);
        if (countResult.error) throw countResult.error;
        if ((countResult.count || 0) <= 1) {
          return json({ error: 'ไม่สามารถลดสิทธิ์หรือปิด admin คนสุดท้ายได้' }, 409);
        }
      }

      const updateResult = await adminClient
        .from('profiles')
        .update({
          prefix,
          f_name: firstName,
          l_name: lastName,
          role: body.role,
          is_active: body.isActive,
        })
        .eq('id', body.userId)
        .select(PROFILE_COLUMNS)
        .single();
      if (updateResult.error) throw updateResult.error;
      await auditLog('admin_update_user', {
        targetUserId: body.userId,
        username: targetResult.data.username,
        name: composeName(prefix, firstName, lastName),
        role: body.role,
        isActive: body.isActive,
        prevRole: targetResult.data.role,
        prevIsActive: targetResult.data.is_active,
      });
      return json({ user: updateResult.data });
    }

    if (body.action === 'set_active') {
      const targetResult = await adminClient
        .from('profiles')
        .select('id, username, role, is_active')
        .eq('id', body.userId)
        .single();
      if (targetResult.error) throw targetResult.error;

      if (!body.isActive) {
        if (body.userId === callerId) {
          return json({ error: 'ไม่สามารถปิดบัญชีของตนเองได้' }, 409);
        }
        if (targetResult.data.role === 'admin' && targetResult.data.is_active) {
          const countResult = await adminClient
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin')
            .eq('is_active', true);
          if (countResult.error) throw countResult.error;
          if ((countResult.count || 0) <= 1) {
            return json({ error: 'ไม่สามารถปิด admin คนสุดท้ายได้' }, 409);
          }
        }
      }

      const updateResult = await adminClient
        .from('profiles')
        .update({ is_active: body.isActive })
        .eq('id', body.userId)
        .select(PROFILE_COLUMNS)
        .single();
      if (updateResult.error) throw updateResult.error;
      await auditLog(body.isActive ? 'admin_activate_user' : 'admin_deactivate_user', {
        targetUserId: body.userId,
        username: targetResult.data.username,
      });
      return json({ user: updateResult.data });
    }

    if (body.action === 'reset_password') {
      const targetResult = await adminClient
        .from('profiles')
        .select('username')
        .eq('id', body.userId)
        .single();
      validatePassword(body.password);
      const result = await adminClient.auth.admin.updateUserById(body.userId, {
        password: `RxReady#${body.password}`,
      });
      if (result.error) throw result.error;
      await auditLog('admin_reset_password', {
        targetUserId: body.userId,
        username: targetResult.data?.username ?? null,
      });
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return json({ error: message }, 400);
  }
});
