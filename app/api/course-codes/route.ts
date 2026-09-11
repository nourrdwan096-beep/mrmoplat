import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Fetch codes for a specific course or all courses
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    const client = supabaseAdmin || supabase;
    let query = client
      .from('course_activation_codes')
      .select('*, courses(id, title, price)')
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
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

// POST: Insert or Upsert activation codes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const codes = Array.isArray(body?.codes) ? body.codes : [];

    if (codes.length === 0) {
      return NextResponse.json({ success: false, message: 'No codes provided' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    const payload = codes.map((c: any) => ({
      id: c.id,
      course_id: c.courseId || c.course_id,
      code: String(c.code).trim().toUpperCase(),
      batch_name: c.batchName || c.batch_name || 'دفعة عامة',
      is_used: Boolean(c.isUsed || c.is_used || false),
      created_by: c.createdBy || c.created_by || null,
    }));

    const { data, error } = await client
      .from('course_activation_codes')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('API /api/course-codes POST error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true, inserted: data?.length || payload.length, data });
  } catch (err: any) {
    console.error('API /api/course-codes POST fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 200 });
  }
}

// DELETE: Remove an activation code by ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Code ID is required' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;
    const { error } = await client
      .from('course_activation_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('API /api/course-codes DELETE error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('API /api/course-codes DELETE fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 200 });
  }
}
