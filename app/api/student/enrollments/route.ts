import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { requireStudentOrStaffSession } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Fetch all active enrolled course IDs for authenticated student (or target student for staff)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    const session = await requireStudentOrStaffSession(studentId);
    if (!session) {
      return NextResponse.json({ success: false, enrolledCourseIds: [], error: 'Unauthorized' }, { status: 401 });
    }

    const targetStudentId = session.isStaff && studentId?.trim() ? studentId.trim() : session.id;

    const { data, error } = await supabaseAdmin
      .from('course_enrollments')
      .select('course_id, is_active, payment_method, enrolled_at')
      .eq('student_id', targetStudentId)
      .eq('is_active', true);

    if (error) {
      console.error('API /api/student/enrollments GET error:', error);
      return NextResponse.json({ success: false, enrolledCourseIds: [], error: error.message });
    }

    const ids = Array.from(new Set((data || []).map(r => r.course_id)));
    return NextResponse.json({ success: true, enrolledCourseIds: ids, enrollments: data || [] });
  } catch (err: any) {
    console.error('API /api/student/enrollments exception:', err);
    return NextResponse.json({ success: false, enrolledCourseIds: [], error: err?.message });
  }
}

// POST: Add or update an enrollment (students can self-enroll ONLY in explicitly free courses)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, courseId, paymentMethod = 'free', amountPaid = 0 } = body;

    if (!courseId) {
      return NextResponse.json({ success: false, message: 'Missing courseId' }, { status: 400 });
    }

    const session = await requireStudentOrStaffSession(studentId);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cleanStudentId = session.isStaff && studentId?.trim() ? studentId.trim() : session.id;
    const cleanCourseId = courseId.trim();

    if (!session.isStaff) {
      const { data: courseRow } = await supabaseAdmin
        .from('courses')
        .select('is_free, price')
        .eq('id', cleanCourseId)
        .maybeSingle();

      if (!courseRow || !(courseRow.is_free === true || Number(courseRow.price) === 0)) {
        return NextResponse.json(
          { success: false, message: 'هذا الكورس مدفوع ويتطلب كود تفعيل معتمد من المعلم' },
          { status: 403 }
        );
      }
    }

    const { data: existing } = await supabaseAdmin
      .from('course_enrollments')
      .select('id')
      .eq('student_id', cleanStudentId)
      .eq('course_id', cleanCourseId)
      .maybeSingle();

    const finalMethod = session.isStaff ? paymentMethod : 'free';
    const finalPaid = session.isStaff ? (Number(amountPaid) || 0) : 0;

    if (existing) {
      await supabaseAdmin
        .from('course_enrollments')
        .update({
          is_active: true,
          payment_method: finalMethod,
          amount_paid: finalPaid,
          enrolled_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('course_enrollments')
        .insert({
          id: crypto.randomUUID(),
          student_id: cleanStudentId,
          course_id: cleanCourseId,
          payment_method: finalMethod,
          amount_paid: finalPaid,
          is_active: true,
          enrolled_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({ success: true, courseId: cleanCourseId });
  } catch (err: any) {
    console.error('API /api/student/enrollments POST exception:', err);
    return NextResponse.json({ success: false, message: err?.message }, { status: 500 });
  }
}
