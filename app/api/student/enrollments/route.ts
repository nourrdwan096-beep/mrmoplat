import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Fetch all active enrolled course IDs for a student
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId || !studentId.trim()) {
      return NextResponse.json({ success: true, enrolledCourseIds: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('course_enrollments')
      .select('course_id, is_active, payment_method, enrolled_at')
      .eq('student_id', studentId.trim())
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

// POST: Add or update an enrollment (e.g. for free courses, wallet, etc.)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, courseId, paymentMethod = 'free', amountPaid = 0 } = body;

    if (!studentId || !courseId) {
      return NextResponse.json({ success: false, message: 'Missing studentId or courseId' }, { status: 400 });
    }

    const cleanStudentId = studentId.trim();
    const cleanCourseId = courseId.trim();

    const { data: existing } = await supabaseAdmin
      .from('course_enrollments')
      .select('id')
      .eq('student_id', cleanStudentId)
      .eq('course_id', cleanCourseId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('course_enrollments')
        .update({
          is_active: true,
          payment_method: paymentMethod,
          amount_paid: Number(amountPaid) || 0,
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
          payment_method: paymentMethod,
          amount_paid: Number(amountPaid) || 0,
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
