import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const code = searchParams.get('code');

    let query = supabaseAdmin
      .from('course_activation_codes')
      .select('*, courses(id, title, price)')
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (code) {
      query = query.ilike('code', code.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.warn('API /api/codes GET error:', error.message);
      return NextResponse.json({ success: false, error: error.message, codes: [] }, { status: 500 });
    }

    return NextResponse.json({ success: true, codes: data || [] });
  } catch (err: any) {
    console.warn('API /api/codes GET exception:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error', codes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { codes } = body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ success: false, error: 'No codes provided' }, { status: 400 });
    }

    // Insert into Supabase using admin client (bypasses RLS)
    const recordsToInsert = codes.map((c: any) => ({
      id: c.id,
      course_id: c.courseId || c.course_id,
      code: c.code,
      batch_name: c.batchName || c.batch_name,
      is_used: Boolean(c.isUsed || c.is_used),
      created_by: c.createdBy || null,
      created_at: c.createdAt || new Date().toISOString(),
    }));

    const { data, error } = await supabaseAdmin
      .from('course_activation_codes')
      .upsert(recordsToInsert, { onConflict: 'code' })
      .select();

    if (error) {
      console.warn('API /api/codes POST error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.warn('API /api/codes POST exception:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Code id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('course_activation_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('API /api/codes DELETE error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
