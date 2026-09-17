import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const READ_TRACKER_TITLE = '__sys_notification_read_ids__';

/**
 * Retrieve user's globally marked-as-read notification IDs from database
 */
async function getUserReadNotificationIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  try {
    const { data } = await supabaseAdmin
      .from('student_sketch_notes')
      .select('content')
      .eq('student_id', userId)
      .eq('title', READ_TRACKER_TITLE)
      .maybeSingle();

    if (data?.content) {
      const parsed = JSON.parse(data.content);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (err) {
    console.warn('Error reading global notification reads from DB:', err);
  }
  return new Set();
}

/**
 * Persist user's read notification IDs into the database
 */
async function saveUserReadNotificationIds(userId: string, newReadIds: string[]): Promise<string[]> {
  if (!userId || !newReadIds || newReadIds.length === 0) return [];
  try {
    const currentSet = await getUserReadNotificationIds(userId);
    newReadIds.forEach((id) => {
      if (id) currentSet.add(id);
    });

    // Retain up to 800 read notification IDs per user
    const updatedArray = Array.from(currentSet).slice(-800);

    const { data: existing } = await supabaseAdmin
      .from('student_sketch_notes')
      .select('id')
      .eq('student_id', userId)
      .eq('title', READ_TRACKER_TITLE)
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin
        .from('student_sketch_notes')
        .update({
          content: JSON.stringify(updatedArray),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('student_sketch_notes')
        .insert({
          student_id: userId,
          title: READ_TRACKER_TITLE,
          content: JSON.stringify(updatedArray),
        });
    }

    return updatedArray;
  } catch (err) {
    console.error('Error saving global notification reads to DB:', err);
    return [];
  }
}

/**
 * Remove specific notification ID from read list (mark as unread)
 */
async function markNotificationUnreadInDb(userId: string, notifId: string): Promise<string[]> {
  if (!userId || !notifId) return [];
  try {
    const currentSet = await getUserReadNotificationIds(userId);
    currentSet.delete(notifId);
    const updatedArray = Array.from(currentSet);

    const { data: existing } = await supabaseAdmin
      .from('student_sketch_notes')
      .select('id')
      .eq('student_id', userId)
      .eq('title', READ_TRACKER_TITLE)
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin
        .from('student_sketch_notes')
        .update({
          content: JSON.stringify(updatedArray),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }
    return updatedArray;
  } catch (err) {
    console.error('Error unmarking notification in DB:', err);
    return [];
  }
}

// =========================================================================
// GET: Fetch real-time global notifications for user
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || 'student';
    const stage = searchParams.get('stage');
    const grade = searchParams.get('grade');

    if (!userId) {
      return NextResponse.json({ success: true, notifications: [], unreadCount: 0, readIds: [] });
    }

    // Load global read IDs from database
    const readIdsSet = await getUserReadNotificationIds(userId);

    const notifs: any[] = [];

    // -----------------------------------------------------------------
    // 1. STUDENT NOTIFICATIONS
    // -----------------------------------------------------------------
    if (role === 'student') {
      // 1.1 Support Ticket Replies
      try {
        const { data: tickets } = await supabaseAdmin
          .from('support_tickets')
          .select('id, ticket_number, subject, status, created_at, updated_at')
          .eq('student_id', userId)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (tickets && tickets.length > 0) {
          const ticketIds = tickets.map((t: any) => t.id);
          const { data: replies } = await supabaseAdmin
            .from('ticket_messages')
            .select('id, ticket_id, sender_role, message, created_at')
            .in('ticket_id', ticketIds)
            .in('sender_role', ['teacher', 'assistant', 'super_admin'])
            .order('created_at', { ascending: false })
            .limit(25);

          if (replies && replies.length > 0) {
            replies.forEach((msg: any) => {
              const matched = tickets.find((t: any) => t.id === msg.ticket_id);
              const sender =
                msg.sender_role === 'teacher' || msg.sender_role === 'super_admin'
                  ? 'مستر / محمد رضوان'
                  : 'فريق المساعدين';
              const subjectStr = matched?.subject || 'طلب الدعم الفني';
              const ticketNum = matched?.ticket_number ? `#${matched.ticket_number}` : '';

              notifs.push({
                id: `notif_ticket_reply_${msg.id}`,
                type: 'support_reply',
                title: 'رد جديد على تذكرة الدعم 💬',
                message: `قام ${sender} بالرد على تذكرتك (${subjectStr} ${ticketNum}): "${msg.message.length > 90 ? msg.message.slice(0, 90) + '...' : msg.message}"`,
                fullMessage: `قام ${sender} بالرد على تذكرتك (${subjectStr} ${ticketNum}):\n\n"${msg.message}"\n\nيمكنك فتح التذكرة لمتابعة الحوار والرد مباشرة.`,
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

      // 1.2 Lessons, Exams & Homework in Enrolled Courses
      try {
        const { data: enrollments } = await supabaseAdmin
          .from('course_enrollments')
          .select('course_id, is_active, courses(id, title)')
          .eq('student_id', userId)
          .eq('is_active', true);

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

        // If no enrollments found yet, also look up published courses for their grade
        if (courseIds.length === 0 && grade) {
          const { data: gradeCourses } = await supabaseAdmin
            .from('courses')
            .select('id, title')
            .eq('grade', Number(grade))
            .eq('is_published', true)
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
            .select('id, course_id, title, item_type, description, created_at')
            .in('course_id', courseIds)
            .order('created_at', { ascending: false })
            .limit(20);

          if (items) {
            items.forEach((item: any) => {
              const cTitle = courseMap.get(item.course_id) || 'الكورس التعليمي';
              if (item.item_type === 'exam' || item.item_type === 'homework') {
                const isExam = item.item_type === 'exam';
                notifs.push({
                  id: `notif_item_${item.id}`,
                  type: 'new_exam',
                  title: isExam ? 'امتحان جديد متاح الآن 📝' : 'واجب منزلي جديد 📚',
                  message: `تمت إضافة ${isExam ? 'الامتحان' : 'الواجب'} "${item.title}" في (${cTitle}).`,
                  fullMessage: `تمت إضافة ${isExam ? 'امتحان جديد' : 'واجب منزلي جديد'} بعنوان: "${item.title}" في كورس (${cTitle}).\n${item.description ? '\nالتفاصيل: ' + item.description : ''}\n\nيرجى الدخول لحله في الموعد المحدد لتحقيق أفضل الدرجات.`,
                  timestamp: item.created_at,
                  link: `/student/study/${item.course_id}?itemId=${item.id}`,
                  courseId: item.course_id,
                  itemId: item.id,
                  isRead: false,
                  category: 'academic',
                  badgeLabel: isExam ? 'امتحان' : 'واجب',
                });
              } else if (item.item_type === 'video') {
                notifs.push({
                  id: `notif_item_vid_${item.id}`,
                  type: 'new_video',
                  title: 'محاضرة وشرح جديد متاح 🎬',
                  message: `تم رفع شرح جديد: "${item.title}" في (${cTitle}).`,
                  fullMessage: `تم رفع فيديو ومحاضرة تعليمية جديدة بعنوان: "${item.title}" في كورس (${cTitle}).\n${item.description ? '\nملاحظات: ' + item.description : ''}\n\nالمحاضرة جاهزة للمشاهدة الآن بجودة عالية وحماية كاملة.`,
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
        console.warn('Student course items fetch error:', err);
      }

      // 1.3 Announcements & Broadcast Messages
      try {
        const { data: msgs } = await supabaseAdmin
          .from('student_messages')
          .select('id, title, content, is_broadcast, created_at')
          .or(`is_broadcast.eq.true,recipient_student_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(15);

        if (msgs) {
          msgs.forEach((m: any) => {
            notifs.push({
              id: `notif_msg_${m.id}`,
              type: 'student_message',
              title: m.is_broadcast ? 'تنبيه عام لجميع الطلاب 📢' : 'رسالة خاصة من الإدارة ✉️',
              message: `${m.title}: ${m.content.length > 80 ? m.content.slice(0, 80) + '...' : m.content}`,
              fullMessage: `عنوان الرسالة: ${m.title}\n\n${m.content}`,
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

    // -----------------------------------------------------------------
    // 2. TEACHER (SUPER ADMIN) NOTIFICATIONS
    // -----------------------------------------------------------------
    else if (role === 'teacher' || role === 'super_admin') {
      // 2.1 Support Tickets (Academic & Technical)
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
          .limit(30);

        if (tickets && tickets.length > 0) {
          tickets.forEach((t: any) => {
            const sType = t.ticket_type === 'academic' ? 'أكاديمي' : 'فني';
            const sObj = Array.isArray(t.student) ? t.student[0] : t.student;
            const sName = sObj?.full_name || 'طالب';
            const sPhone = sObj?.phone ? `(${sObj.phone})` : '';

            notifs.push({
              id: `notif_teacher_ticket_${t.id}`,
              type: 'support_ticket_new',
              title: `تذكرة استفسار (${sType}) #${t.ticket_number} 🎫`,
              message: `من الطالب ${sName}: "${t.subject}"`,
              fullMessage: `تذكرة جديدة من الطالب: ${sName} ${sPhone}\nرقم التذكرة: #${t.ticket_number}\nالنوع: ${sType}\nالموضوع: ${t.subject}\n\nنص التذكرة:\n${t.description}`,
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
          .select('id, full_name, phone, parent_phone, stage, grade, created_at')
          .eq('role', 'student')
          .eq('status', 'pending_review')
          .order('created_at', { ascending: false })
          .limit(25);

        if (pendings && pendings.length > 0) {
          pendings.forEach((p: any) => {
            const gradeStr = p.grade ? `الصف ${p.grade} ثانوي` : '';
            notifs.push({
              id: `notif_teacher_pending_${p.id}`,
              type: 'new_student_pending',
              title: 'طالب جديد بانتظار المراجعة والاعتماد ⏳',
              message: `سجل الطالب "${p.full_name}" (${gradeStr}) - هاتف: ${p.phone}.`,
              fullMessage: `بيانات الطالب الجديد بانتظار الموافقة:\n\n• الاسم: ${p.full_name}\n• المرحلة: ${p.stage || 'الثانوية'} - ${gradeStr}\n• هاتف الطالب: ${p.phone}\n• هاتف ولي الأمر: ${p.parent_phone || 'غير مسجل'}\n• وقت التسجيل: ${new Date(p.created_at).toLocaleString('ar-EG')}`,
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

      // 2.3 Student Replies in Support Chats
      try {
        const { data: studentReplies } = await supabaseAdmin
          .from('ticket_messages')
          .select(`
            id,
            ticket_id,
            message,
            created_at,
            support_tickets(id, ticket_number, subject, student:profiles!support_tickets_student_id_fkey(full_name, phone))
          `)
          .eq('sender_role', 'student')
          .order('created_at', { ascending: false })
          .limit(20);

        if (studentReplies) {
          studentReplies.forEach((r: any) => {
            const ticket = Array.isArray(r.support_tickets) ? r.support_tickets[0] : r.support_tickets;
            if (ticket) {
              const studentObj = Array.isArray(ticket.student) ? ticket.student[0] : ticket.student;
              const sName = studentObj?.full_name || 'الطالب';
              notifs.push({
                id: `notif_teacher_reply_${r.id}`,
                type: 'support_reply',
                title: `رد جديد من ${sName} في التذكرة #${ticket.ticket_number} 💬`,
                message: `أرسل رداً: "${r.message.length > 80 ? r.message.slice(0, 80) + '...' : r.message}"`,
                fullMessage: `أرسل الطالب ${sName} رداً في التذكرة #${ticket.ticket_number} ("${ticket.subject}"):\n\n"${r.message}"`,
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

      // 2.4 Recent Course Enrollments / Code Redemptions
      try {
        const { data: enrollments } = await supabaseAdmin
          .from('course_enrollments')
          .select(`
            id,
            payment_method,
            created_at,
            enrolled_at,
            student:profiles!course_enrollments_student_id_fkey(full_name, phone),
            courses(title)
          `)
          .order('enrolled_at', { ascending: false })
          .limit(15);

        if (enrollments) {
          enrollments.forEach((e: any) => {
            const sObj = Array.isArray(e.student) ? e.student[0] : e.student;
            const cObj = Array.isArray(e.courses) ? e.courses[0] : e.courses;
            const sName = sObj?.full_name || 'طالب';
            const cTitle = cObj?.title || 'كورس';
            const method = e.payment_method === 'activation_code' ? 'بكود تفعيل' : e.payment_method;

            notifs.push({
              id: `notif_teacher_enroll_${e.id}`,
              type: 'course_enrollment',
              title: 'اشتراك جديد في كورس 🎓',
              message: `قام الطالب "${sName}" بالاشتراك في (${cTitle}) [${method}].`,
              fullMessage: `تفاصيل الاشتراك الجديد:\n• الطالب: ${sName}\n• الهاتف: ${sObj?.phone || '-'}\n• الكورس: ${cTitle}\n• وسيلة الدفع / التفعيل: ${method}\n• التاريخ: ${new Date(e.enrolled_at || e.created_at).toLocaleString('ar-EG')}`,
              timestamp: e.enrolled_at || e.created_at || new Date().toISOString(),
              link: '/teacher/students',
              isRead: false,
              category: 'course',
              badgeLabel: 'اشتراك كورس',
            });
          });
        }
      } catch (err) {
        console.warn('Teacher enrollments fetch error:', err);
      }
    }

    // -----------------------------------------------------------------
    // 3. ASSISTANT NOTIFICATIONS
    // -----------------------------------------------------------------
    else if (role === 'assistant') {
      try {
        let tQuery = supabaseAdmin
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
            assigned_to_assistant_id,
            student:profiles!support_tickets_student_id_fkey(full_name, phone)
          `)
          .order('created_at', { ascending: false })
          .limit(30);

        if (userId) {
          tQuery = tQuery.or(`assigned_to_assistant_id.eq.${userId},assigned_to_assistant_id.is.null`);
        }

        const { data: tickets } = await tQuery;

        if (tickets) {
          tickets.forEach((t: any) => {
            const sType = t.ticket_type === 'academic' ? 'أكاديمي' : 'فني';
            const sObj = Array.isArray(t.student) ? t.student[0] : t.student;
            const sName = sObj?.full_name || 'طالب';
            const isMine = t.assigned_to_assistant_id === userId;

            notifs.push({
              id: `notif_asst_ticket_${t.id}`,
              type: 'support_ticket_new',
              title: isMine ? `تذكرة مكلف بها (${sType}) #${t.ticket_number} 🎫` : `تذكرة دعم جديدة (${sType}) #${t.ticket_number} 🎫`,
              message: `استفسار من ${sName}: "${t.subject}"`,
              fullMessage: `تذكرة استفسار من الطالب: ${sName}\nرقم التذكرة: #${t.ticket_number}\nالنوع: ${sType}\nالحالة: ${t.status}\nالموضوع: ${t.subject}\n\nالوصف:\n${t.description}`,
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
          .limit(15);

        if (pendings) {
          pendings.forEach((p: any) => {
            notifs.push({
              id: `notif_asst_pending_${p.id}`,
              type: 'new_student_pending',
              title: 'طالب بانتظار المراجعة والاعتماد ⏳',
              message: `سجل الطالب "${p.full_name}" - هاتف: ${p.phone}.`,
              fullMessage: `طالب جديد ينتظر المراجعة:\n• الاسم: ${p.full_name}\n• الهاتف: ${p.phone}\n• الصف: ${p.grade ? p.grade + ' ثانوي' : '-'}\n• وقت التسجيل: ${new Date(p.created_at).toLocaleString('ar-EG')}`,
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

    // Sort chronologically descending
    const sorted = notifs.sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );

    // Deduplicate and apply global database read status
    const seen = new Set<string>();
    const deduplicated = sorted.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    const finalNotifications = deduplicated.map((item) => ({
      ...item,
      isRead: readIdsSet.has(item.id),
    }));

    const unreadCount = finalNotifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications: finalNotifications.slice(0, 60),
      unreadCount,
      readIds: Array.from(readIdsSet),
    });
  } catch (err: any) {
    console.error('API /api/notifications GET fatal error:', err);
    return NextResponse.json(
      { success: false, error: err?.message, notifications: [], unreadCount: 0, readIds: [] },
      { status: 500 }
    );
  }
}

// =========================================================================
// POST: Save read status globally in database across all devices
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, notifId, notifIds } = body || {};

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'mark_read' && notifId) {
      const updated = await saveUserReadNotificationIds(userId, [notifId]);
      return NextResponse.json({ success: true, action: 'mark_read', readIds: updated });
    }

    if (action === 'mark_all_read' && Array.isArray(notifIds)) {
      const updated = await saveUserReadNotificationIds(userId, notifIds);
      return NextResponse.json({ success: true, action: 'mark_all_read', readIds: updated });
    }

    if (action === 'mark_unread' && notifId) {
      const updated = await markNotificationUnreadInDb(userId, notifId);
      return NextResponse.json({ success: true, action: 'mark_unread', readIds: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/notifications POST fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
