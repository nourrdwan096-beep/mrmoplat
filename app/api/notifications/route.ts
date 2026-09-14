import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || 'student';
    const stage = searchParams.get('stage');
    const grade = searchParams.get('grade');

    const notifs: any[] = [];

    // ================================================================
    // 1. STUDENT NOTIFICATIONS
    // ================================================================
    if (role === 'student' && userId) {
      // 1.1 Support Ticket Replies from Staff
      try {
        const { data: tickets } = await supabaseAdmin
          .from('support_tickets')
          .select('id, subject, status, created_at, updated_at')
          .eq('student_id', userId)
          .order('updated_at', { ascending: false })
          .limit(15);

        if (tickets && tickets.length > 0) {
          const ticketIds = tickets.map((t: any) => t.id);
          const { data: replies } = await supabaseAdmin
            .from('ticket_messages')
            .select('id, ticket_id, sender_role, message, created_at')
            .in('ticket_id', ticketIds)
            .in('sender_role', ['teacher', 'assistant', 'super_admin'])
            .order('created_at', { ascending: false })
            .limit(20);

          if (replies && replies.length > 0) {
            replies.forEach((msg: any) => {
              const matched = tickets.find((t: any) => t.id === msg.ticket_id);
              const sender = msg.sender_role === 'teacher' || msg.sender_role === 'super_admin' ? 'مستر / محمد رضوان' : 'فريق المساعدين';
              notifs.push({
                id: `notif_ticket_reply_${msg.id}`,
                type: 'support_reply',
                title: 'رد جديد على تذكرة الدعم 💬',
                message: `قام ${sender} بالرد على تذكرتك "${matched?.subject || 'طلب الدعم'}": "${msg.message.slice(0, 80)}"`,
                timestamp: msg.created_at,
                link: `/student/support?ticketId=${msg.ticket_id}`,
                ticketId: msg.ticket_id,
                isRead: false,
                category: 'support',
                badgeLabel: 'الدعم الفني والأكاديمي',
              });
            });
          }
        }
      } catch (err) {
        console.warn('Student ticket replies fetch error:', err);
      }

      // 1.2 Recent Lessons, Exams & Videos
      try {
        const { data: enrollments } = await supabaseAdmin
          .from('course_enrollments')
          .select('course_id, courses(id, title)')
          .eq('student_id', userId);

        let courseIds: string[] = [];
        const courseMap = new Map<string, string>();
        if (enrollments && enrollments.length > 0) {
          enrollments.forEach((e: any) => {
            if (e.course_id) {
              courseIds.push(e.course_id);
              if (e.courses?.title) {
                courseMap.set(e.course_id, e.courses.title);
              }
            }
          });
        }

        // If no enrollments, find courses for this grade
        if (courseIds.length === 0 && grade) {
          const { data: gradeCourses } = await supabaseAdmin
            .from('courses')
            .select('id, title')
            .eq('grade', Number(grade))
            .limit(5);
          if (gradeCourses) {
            gradeCourses.forEach((c: any) => {
              courseIds.push(c.id);
              courseMap.set(c.id, c.title);
            });
          }
        }

        if (courseIds.length > 0) {
          const { data: items } = await supabaseAdmin
            .from('unit_items')
            .select('id, course_id, title, item_type, created_at')
            .in('course_id', courseIds)
            .order('created_at', { ascending: false })
            .limit(10);

          if (items) {
            items.forEach((item: any) => {
              const cTitle = courseMap.get(item.course_id) || 'الكورس التعليمي';
              if (item.item_type === 'exam' || item.item_type === 'homework') {
                notifs.push({
                  id: `notif_item_${item.id}`,
                  type: 'new_exam',
                  title: item.item_type === 'exam' ? 'امتحان جديد متاح الآن 📝' : 'واجب منزلي جديد 📚',
                  message: `تمت إضافة "${item.title}" في (${cTitle}).`,
                  timestamp: item.created_at,
                  link: `/student/study/${item.course_id}?itemId=${item.id}`,
                  courseId: item.course_id,
                  itemId: item.id,
                  isRead: false,
                  category: 'academic',
                  badgeLabel: item.item_type === 'exam' ? 'امتحان' : 'واجب',
                });
              } else if (item.item_type === 'video') {
                notifs.push({
                  id: `notif_item_vid_${item.id}`,
                  type: 'new_video',
                  title: 'محاضرة وفيديو جديد متاح 🎬',
                  message: `تم رفع شرح جديد: "${item.title}" في (${cTitle}).`,
                  timestamp: item.created_at,
                  link: `/watch/${item.course_id}/${item.id}`,
                  courseId: item.course_id,
                  itemId: item.id,
                  isRead: false,
                  category: 'academic',
                  badgeLabel: 'شرح جديد',
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Student items fetch error:', err);
      }

      // 1.3 Broadcast Messages & Admin Announcements
      try {
        const { data: msgs } = await supabaseAdmin
          .from('student_messages')
          .select('id, title, content, is_broadcast, created_at')
          .or(`is_broadcast.eq.true,recipient_student_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (msgs) {
          msgs.forEach((m: any) => {
            notifs.push({
              id: `notif_msg_${m.id}`,
              type: 'student_message',
              title: m.is_broadcast ? 'تنبيه عام لجميع الطلاب 📢' : 'رسالة خاصة من الإدارة ✉️',
              message: `${m.title}: ${m.content.slice(0, 90)}...`,
              timestamp: m.created_at,
              link: '/student/messages',
              isRead: false,
              category: 'message',
              badgeLabel: m.is_broadcast ? 'تنبيه عام' : 'رسالة خاصة',
            });
          });
        }
      } catch (err) {
        console.warn('Student messages fetch error:', err);
      }
    }

    // ================================================================
    // 2. TEACHER (SUPER ADMIN) NOTIFICATIONS
    // ================================================================
    else if (role === 'teacher' || role === 'super_admin') {
      // 2.1 All Support Tickets (Academic & Technical)
      try {
        const { data: tickets } = await supabaseAdmin
          .from('support_tickets')
          .select(`
            id,
            ticket_number,
            student_id,
            subject,
            description,
            ticket_type,
            status,
            created_at,
            student:profiles!support_tickets_student_id_fkey(full_name, phone)
          `)
          .order('created_at', { ascending: false })
          .limit(25);

        if (tickets && tickets.length > 0) {
          tickets.forEach((t: any) => {
            const sType = t.ticket_type === 'academic' ? 'أكاديمي' : 'فني';
            const sName = t.student?.full_name || 'طالب المنصة';
            notifs.push({
              id: `notif_teacher_ticket_${t.id}`,
              type: 'support_ticket_new',
              title: `تذكرة دعم جديدة (${sType}) 🎫`,
              message: `استفسار جديد من ${sName} (#${t.ticket_number}): "${t.subject}"`,
              timestamp: t.created_at,
              link: `/teacher/support?ticketId=${t.id}`,
              ticketId: t.id,
              isRead: false,
              category: 'support',
              badgeLabel: sType,
            });
          });
        }
      } catch (err) {
        console.warn('Teacher tickets fetch error:', err);
      }

      // 2.2 Pending Student Reviews
      try {
        const { data: pendings } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, phone, grade, created_at')
          .eq('role', 'student')
          .eq('status', 'pending_review')
          .order('created_at', { ascending: false })
          .limit(15);

        if (pendings && pendings.length > 0) {
          pendings.forEach((p: any) => {
            notifs.push({
              id: `notif_teacher_pending_${p.id}`,
              type: 'new_student_pending',
              title: 'طالب جديد بانتظار المراجعة والتفعيل ⏳',
              message: `سجل الطالب "${p.full_name}" (الصف ${p.grade ? p.grade + ' ثانوي' : ''}) - هاتف: ${p.phone}. يرجى مراجعة الحساب.`,
              timestamp: p.created_at,
              link: '/teacher/students?tab=pending',
              isRead: false,
              category: 'admin',
              badgeLabel: 'تسجيل جديد',
            });
          });
        }
      } catch (err) {
        console.warn('Teacher pendings fetch error:', err);
      }

      // 2.3 Recent Student Replies in Existing Tickets
      try {
        const { data: studentReplies } = await supabaseAdmin
          .from('ticket_messages')
          .select(`
            id,
            ticket_id,
            message,
            created_at,
            support_tickets(id, ticket_number, subject, student:profiles!support_tickets_student_id_fkey(full_name))
          `)
          .eq('sender_role', 'student')
          .order('created_at', { ascending: false })
          .limit(15);

        if (studentReplies) {
          studentReplies.forEach((r: any) => {
            const ticket = Array.isArray(r.support_tickets) ? r.support_tickets[0] : r.support_tickets;
            if (ticket) {
              const studentObj = Array.isArray(ticket.student) ? ticket.student[0] : ticket.student;
              const sName = studentObj?.full_name || 'الطالب';
              notifs.push({
                id: `notif_teacher_reply_${r.id}`,
                type: 'support_reply',
                title: 'رد جديد في محادثة الدعم 💬',
                message: `أرسل ${sName} رداً في تذكرة "${ticket.subject}": "${r.message.slice(0, 70)}"`,
                timestamp: r.created_at,
                link: `/teacher/support?ticketId=${ticket.id}`,
                ticketId: ticket.id,
                isRead: false,
                category: 'support',
                badgeLabel: 'محادثة نشطة',
              });
            }
          });
        }
      } catch (err) {
        console.warn('Teacher student replies fetch error:', err);
      }

      // 2.4 Recent Course Enrollments
      try {
        const { data: enrollments } = await supabaseAdmin
          .from('course_enrollments')
          .select(`
            id,
            created_at,
            student:profiles!course_enrollments_student_id_fkey(full_name),
            courses(title)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (enrollments) {
          enrollments.forEach((e: any) => {
            const sObj = Array.isArray(e.student) ? e.student[0] : e.student;
            const cObj = Array.isArray(e.courses) ? e.courses[0] : e.courses;
            const sName = sObj?.full_name || 'أحد الطلاب';
            const cTitle = cObj?.title || 'كورس';
            notifs.push({
              id: `notif_teacher_enroll_${e.id}`,
              type: 'course_enrollment',
              title: 'اشتراك جديد في كورس 🎓',
              message: `قام الطالب "${sName}" بالاشتراك في (${cTitle}).`,
              timestamp: e.created_at,
              link: '/teacher/students',
              isRead: false,
              category: 'course',
              badgeLabel: 'اشتراك',
            });
          });
        }
      } catch (err) {
        console.warn('Teacher enrollments fetch error:', err);
      }
    }

    // ================================================================
    // 3. ASSISTANT NOTIFICATIONS
    // ================================================================
    else if (role === 'assistant') {
      try {
        // Tickets assigned to assistant or unassigned open tickets
        let tQuery = supabaseAdmin
          .from('support_tickets')
          .select(`
            id,
            ticket_number,
            student_id,
            subject,
            ticket_type,
            status,
            created_at,
            assigned_to_assistant_id,
            student:profiles!support_tickets_student_id_fkey(full_name, phone)
          `)
          .order('created_at', { ascending: false })
          .limit(25);

        if (userId) {
          tQuery = tQuery.or(`assigned_to_assistant_id.eq.${userId},assigned_to_assistant_id.is.null`);
        }

        const { data: tickets } = await tQuery;

        if (tickets) {
          tickets.forEach((t: any) => {
            const sType = t.ticket_type === 'academic' ? 'أكاديمي' : 'فني';
            const sName = t.student?.full_name || 'طالب';
            const isMine = t.assigned_to_assistant_id === userId;
            notifs.push({
              id: `notif_asst_ticket_${t.id}`,
              type: 'support_ticket_new',
              title: isMine ? `تذكرة مكلف بها (${sType}) 🎫` : `تذكرة دعم جديدة (${sType}) 🎫`,
              message: `استفسار من ${sName} (#${t.ticket_number}): "${t.subject}"`,
              timestamp: t.created_at,
              link: `/assistant/support?ticketId=${t.id}`,
              ticketId: t.id,
              isRead: false,
              category: 'support',
              badgeLabel: isMine ? 'مكلف بها' : sType,
            });
          });
        }
      } catch (err) {
        console.warn('Assistant tickets fetch error:', err);
      }

      // Pending student reviews
      try {
        const { data: pendings } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, phone, grade, created_at')
          .eq('role', 'student')
          .eq('status', 'pending_review')
          .order('created_at', { ascending: false })
          .limit(10);

        if (pendings) {
          pendings.forEach((p: any) => {
            notifs.push({
              id: `notif_asst_pending_${p.id}`,
              type: 'new_student_pending',
              title: 'طالب بانتظار المراجعة والتفعيل ⏳',
              message: `سجل الطالب "${p.full_name}" - هاتف: ${p.phone}.`,
              timestamp: p.created_at,
              link: '/assistant/students',
              isRead: false,
              category: 'admin',
              badgeLabel: 'تسجيل جديد',
            });
          });
        }
      } catch (err) {
        console.warn('Assistant pendings fetch error:', err);
      }
    }

    // Sort all notifications chronologically descending
    const sorted = notifs.sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );

    // Remove duplicates if any
    const seen = new Set<string>();
    const deduplicated = sorted.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    return NextResponse.json({ success: true, notifications: deduplicated.slice(0, 50) });
  } catch (err: any) {
    console.error('API /api/notifications GET fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message, notifications: [] }, { status: 500 });
  }
}
