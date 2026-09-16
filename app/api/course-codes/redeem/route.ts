import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = body?.code;
    const studentId = body?.studentId;
    const targetCourseId = body?.targetCourseId;
    const studentInfo = body?.studentInfo || {};

    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return NextResponse.json({
        success: false,
        message: 'يرجى إدخال كود التفعيل المطبوع بشكل صحيح.'
      }, { status: 400 });
    }

    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      return NextResponse.json({
        success: false,
        message: 'يجب تسجيل الدخول كطالب أولاً لتفعيل الكود.'
      }, { status: 400 });
    }

    const cleanCode = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    const cleanStudentId = studentId.trim();

    // 1. Fetch code record with course info using supabaseAdmin
    const { data: codeRecord, error: codeError } = await supabaseAdmin
      .from('course_activation_codes')
      .select('*, courses(id, title, price, is_free)')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (codeError) {
      console.error('API redeem code error:', codeError);
      return NextResponse.json({
        success: false,
        message: 'حدث خطأ أثناء فحص الكود في قاعدة البيانات. يرجى المحاولة مرة أخرى.'
      }, { status: 500 });
    }

    if (!codeRecord) {
      return NextResponse.json({
        success: false,
        message: 'كود التفعيل غير صحيح أو غير مسجل بالمنصة. يرجى التأكد من كتابة الكود بدقة ومطابقته للبطاقة المطبوعة.'
      }, { status: 404 });
    }

    const courseData = codeRecord.courses || null;
    const codeCourseId = codeRecord.course_id;
    const courseTitle = courseData?.title || 'الكورس التعليمي';
    const coursePrice = Number(courseData?.price) || 0;

    // 2. Strict Cross-Course Guard:
    // If targetCourseId is provided, code MUST match the target course!
    if (targetCourseId && typeof targetCourseId === 'string' && targetCourseId.trim()) {
      const cleanTargetId = targetCourseId.trim();
      if (cleanTargetId !== codeCourseId) {
        return NextResponse.json({
          success: false,
          message: `عذراً، هذا الكود مطبوع ومخصص لكورس (${courseTitle}) ولا يمكن استخدامه لتفعيل هذا الكورس المطلوب! يرجى إدخال الكود في صفحة الكورس المخصص له.`
        }, { status: 400 });
      }
    }

    // 3. Check if already used
    if (codeRecord.is_used) {
      // Check if already used by THIS student
      if (codeRecord.used_by_student_id === cleanStudentId) {
        // Ensure their enrollment in course_enrollments is active
        const { data: existingEnrollment } = await supabaseAdmin
          .from('course_enrollments')
          .select('id, is_active')
          .eq('student_id', cleanStudentId)
          .eq('course_id', codeCourseId)
          .maybeSingle();

        if (existingEnrollment) {
          if (!existingEnrollment.is_active) {
            await supabaseAdmin
              .from('course_enrollments')
              .update({ is_active: true })
              .eq('id', existingEnrollment.id);
          }
        } else {
          await supabaseAdmin
            .from('course_enrollments')
            .insert({
              id: crypto.randomUUID(),
              student_id: cleanStudentId,
              course_id: codeCourseId,
              payment_method: 'activation_code',
              amount_paid: coursePrice,
              is_active: true,
              enrolled_at: new Date().toISOString(),
            });
        }

        return NextResponse.json({
          success: true,
          alreadyEnrolled: true,
          courseId: codeCourseId,
          courseTitle,
          message: `هذا الكود مفعل بالفعل ومسجل على حسابك في (${courseTitle}). جميع المحاضرات مفتوحة لك.`
        });
      }

      return NextResponse.json({
        success: false,
        message: 'عذراً، تم استخدام وتفعيل هذا الكود مسبقاً من قِبل طالب آخر! كل كود مخصص لطالب واحد فقط.'
      }, { status: 400 });
    }

    // 4. Check if assigned to specific student
    const batchName = codeRecord.batch_name || '';
    if (batchName.includes('[مخصص:')) {
      const match = batchName.match(/\[مخصص:\s*([^\]]+)\]/);
      if (match && match[1]) {
        const assignedName = match[1].trim();
        const incomingName = (studentInfo.fullName || '').trim();
        if (assignedName && incomingName && !incomingName.includes(assignedName) && !assignedName.includes(incomingName)) {
          return NextResponse.json({
            success: false,
            message: `هذا الكود مخصص رسمياً للطالب (${assignedName}) ولا يتطابق مع بيانات حسابك.`
          }, { status: 403 });
        }
      }
    }

    // 5. Atomic Activation: Mark code as used
    const nowIso = new Date().toISOString();
    const { error: updateCodeErr } = await supabaseAdmin
      .from('course_activation_codes')
      .update({
        is_used: true,
        used_by_student_id: cleanStudentId,
        used_at: nowIso,
      })
      .eq('id', codeRecord.id);

    if (updateCodeErr) {
      console.error('Error updating code:', updateCodeErr);
      return NextResponse.json({
        success: false,
        message: 'حدث خطأ أثناء اعتماد الكود. يرجى إعادة المحاولة.'
      }, { status: 500 });
    }

    // 6. Enroll student in course_enrollments
    const { data: existingEnrollment } = await supabaseAdmin
      .from('course_enrollments')
      .select('id')
      .eq('student_id', cleanStudentId)
      .eq('course_id', codeCourseId)
      .maybeSingle();

    if (existingEnrollment) {
      await supabaseAdmin
        .from('course_enrollments')
        .update({
          is_active: true,
          payment_method: 'activation_code',
          amount_paid: coursePrice,
          enrolled_at: nowIso,
        })
        .eq('id', existingEnrollment.id);
    } else {
      await supabaseAdmin
        .from('course_enrollments')
        .insert({
          id: crypto.randomUUID(),
          student_id: cleanStudentId,
          course_id: codeCourseId,
          payment_method: 'activation_code',
          amount_paid: coursePrice,
          is_active: true,
          enrolled_at: nowIso,
        });
    }

    // 7. Insert wallet transaction record
    try {
      await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          id: crypto.randomUUID(),
          student_id: cleanStudentId,
          amount: coursePrice,
          transaction_type: 'activation_code',
          status: 'completed',
          notes: `تفعيل كود (${cleanCode}) لكورس: ${courseTitle}`,
          created_at: nowIso,
        });
    } catch (txErr) {
      console.warn('Wallet tx insert non-fatal error:', txErr);
    }

    // 8. Create notification for the student
    try {
      await supabaseAdmin
        .from('student_notifications')
        .insert({
          id: crypto.randomUUID(),
          student_id: cleanStudentId,
          title: '🎉 تم تفعيل الكورس بنجاح!',
          message: `تم تفعيل اشتراكك في (${courseTitle}) عبر كود التفعيل المعتمد بنجاح. يمكنك الآن مشاهدة جميع المحاضرات واستعراض الملازم والامتحانات.`,
          type: 'course_enrolled',
          link: `/courses/${codeCourseId}`,
          is_read: false,
          created_at: nowIso,
        });
    } catch (notifErr) {
      console.warn('Notification insert non-fatal error:', notifErr);
    }

    return NextResponse.json({
      success: true,
      courseId: codeCourseId,
      courseTitle,
      message: `تم تفعيل كورس (${courseTitle}) بنجاح! جميع المحاضرات والملازم متاحة لك الآن.`
    });

  } catch (fatalErr: any) {
    console.error('Fatal in redeem API:', fatalErr);
    return NextResponse.json({
      success: false,
      message: fatalErr?.message || 'حدث خطأ غير متوقع أثناء تفعيل الكود.'
    }, { status: 500 });
  }
}
