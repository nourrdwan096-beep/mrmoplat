import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { supabase } from '@/lib/supabaseClient';
import {
  requireStaffSession,
  canAssistantAccessCoursePerm,
  canAssistantAccessAnyCoursePerm,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Fetch codes for a specific course or allowed courses (staff-only + granular perm check)
export async function GET(req: NextRequest) {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized', codes: [] }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!staff.isTeacher && courseId) {
      if (!canAssistantAccessAnyCoursePerm(staff, courseId, ['canGenerateCodes', 'canViewCourseStudents'])) {
        return NextResponse.json({ success: false, error: 'Forbidden', codes: [] }, { status: 403 });
      }
    }

    const client = supabaseAdmin || supabase;
    let query = client
      .from('course_activation_codes')
      .select('*, courses(id, title, price)')
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    } else if (!staff.isTeacher && !staff.assistantMatrix?.canManageAllCourses) {
      const allowed = (staff.assistantMatrix?.assignedCourseIds || []).filter((cid) =>
        canAssistantAccessAnyCoursePerm(staff, cid, ['canGenerateCodes', 'canViewCourseStudents'])
      );
      if (allowed.length === 0) {
        return NextResponse.json({ success: true, codes: [] });
      }
      query = query.in('course_id', allowed);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('API /api/course-codes GET error:', error.message);
      return NextResponse.json({ success: false, error: error.message, codes: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, codes: data || [] });
  } catch (err: any) {
    console.error('API /api/course-codes GET fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message, codes: [] }, { status: 200 });
  }
}

// POST: Insert or Upsert activation codes (staff-only + canGenerateCodes check)
export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const codes = Array.isArray(body?.codes) ? body.codes : [];

    if (codes.length === 0) {
      return NextResponse.json({ success: false, message: 'No codes provided' }, { status: 400 });
    }

    if (!staff.isTeacher) {
      for (const c of codes) {
        const cid = c.courseId || c.course_id;
        if (!cid || !canAssistantAccessCoursePerm(staff, cid, 'canGenerateCodes')) {
          return NextResponse.json({ success: false, error: 'غير مصرح للمساعد بإصدار أكواد لهذا الكورس' }, { status: 403 });
        }
      }
    }

    const client = supabaseAdmin || supabase;

    const payload = codes.map((c: any) => ({
      id: c.id,
      course_id: c.courseId || c.course_id,
      code: String(c.code).trim().toUpperCase(),
      batch_name: c.batchName || c.batch_name || 'دفعة عامة',
      is_used: Boolean(c.isUsed || c.is_used || false),
      created_by: staff.id,
    }));

    const { data, error } = await client
      .from('course_activation_codes')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('API /api/course-codes POST error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: staff.id,
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'GENERATE_ACTIVATION_CODES',
        target_entity: 'course_activation_codes',
        target_id: payload[0]?.course_id || null,
        details: { count: payload.length, batchName: payload[0]?.batch_name },
      }]);
    } catch {}

    return NextResponse.json({ success: true, inserted: data?.length || payload.length, data });
  } catch (err: any) {
    console.error('API /api/course-codes POST fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 200 });
  }
}

// DELETE: Remove an activation code by ID (staff-only + canDeleteCodes check)
export async function DELETE(req: NextRequest) {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Code ID is required' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    const { data: codeRow } = await client
      .from('course_activation_codes')
      .select('id, course_id, code')
      .eq('id', id)
      .maybeSingle();

    if (!staff.isTeacher) {
      if (!codeRow?.course_id || !canAssistantAccessCoursePerm(staff, codeRow.course_id, 'canDeleteCodes')) {
        return NextResponse.json({ success: false, error: 'غير مصرح للمساعد بحذف أكواد هذا الكورس' }, { status: 403 });
      }
    }

    const { error } = await client
      .from('course_activation_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('API /api/course-codes DELETE error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: staff.id,
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'DELETE_ACTIVATION_CODE',
        target_entity: 'course_activation_codes',
        target_id: id,
        details: { courseId: codeRow?.course_id, code: codeRow?.code },
      }]);
    } catch {}

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('API /api/course-codes DELETE fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 200 });
  }
}
