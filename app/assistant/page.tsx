'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  BookOpen,
  Headphones,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchSupportTickets, TicketData } from '@/lib/supportService';
import { fetchAllCourses, CourseData } from '@/lib/academicService';
import { fetchAssistants, AssistantData } from '@/lib/teacherService';

export default function AssistantHomePage() {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [assistant, setAssistant] = useState<AssistantData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [allTickets, allCourses, allAssistants] = await Promise.all([
          fetchSupportTickets(),
          fetchAllCourses(),
          fetchAssistants(),
        ]);

        const currentAst = allAssistants.find(
          (a) => a.id === currentUser?.id || a.email === currentUser?.email
        );
        setAssistant(currentAst || null);

        // Filter tickets if assistant has specific assigned courses
        if (currentAst && currentAst.permissions?.assignedCourseIds && currentAst.permissions.assignedCourseIds.length > 0) {
          const assigned = currentAst.permissions.assignedCourseIds;
          const filtered = allTickets.filter(
            (t) => !(t.course_id || t.courseId) || assigned.includes((t.course_id || t.courseId) as string)
          );
          setTickets(filtered);
        } else {
          setTickets(allTickets);
        }

        // Filter courses if restricted
        if (
          currentAst &&
          currentAst.permissions &&
          !currentAst.permissions.canManageAllCourses &&
          currentAst.permissions.assignedCourseIds &&
          currentAst.permissions.assignedCourseIds.length > 0
        ) {
          const assigned = currentAst.permissions.assignedCourseIds;
          const myCourses = allCourses.filter((c) =>
            assigned.includes(c.id)
          );
          setCourses(myCourses);
        } else {
          setCourses(allCourses);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const academicTickets = openTickets.filter((t) => t.ticketType === 'academic');
  const techTickets = openTickets.filter((t) => t.ticketType === 'technical');

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-3">
              <Sparkles className="w-4 h-4" />
              أهلاً بك يا بطل في فريق عمل مستر محمد رضوان
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              لوحة تحكم المساعد 🌟
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base">
              متابعة تذاكر الدعم الأكاديمي والفني للطلاب، مراجعة الواجبات، وإدارة الكورسات المخصصة لك.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              تذاكر بحاجة للرد والمتابعة
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">
            {openTickets.length}
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-2">
            {academicTickets.length} أكاديمية • {techTickets.length} فنية
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              الكورسات المخصصة لك
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">
            {courses.length}
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-2">
            متاح إدارة محتواها والتذاكر التابعة لها
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              صلاحيات الحساب
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            حساب نشط ومعتمد ✓
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-2">
            {assistant?.permissions?.canManageStudents ? 'إدارة الطلاب مفعّلة' : 'صلاحيات مخصصة'}
          </p>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Support Tickets Quick View */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Headphones className="w-5 h-5 text-emerald-500" />
                أحدث تذاكر الدعم المفتوحة
              </h3>
              <Link
                href="/assistant/support"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                عرض كل التذاكر
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">جاري التحميل...</p>
            ) : openTickets.length > 0 ? (
              <div className="space-y-3">
                {openTickets.slice(0, 4).map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/assistant/support?ticketId=${ticket.id}`}
                    className="block p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border border-slate-100 dark:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {ticket.subject}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          ticket.ticketType === 'academic'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {ticket.ticketType === 'academic' ? 'أكاديمي' : 'فني'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>{ticket.studentName || 'طالب'}</span>
                      <span>{ticket.courseTitle || 'عام'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-bold text-xs">
                لا توجد تذاكر مفتوحة حالياً، كل استفسارات الطلاب تم الرد عليها 🎉
              </div>
            )}
          </div>
        </div>

        {/* Assigned Courses Quick View */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                الكورسات المسؤول عنها
              </h3>
              <Link
                href="/assistant/courses"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                إدارة الكورسات
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">جاري التحميل...</p>
            ) : courses.length > 0 ? (
              <div className="space-y-3">
                {courses.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    href={`/assistant/courses/${c.id}`}
                    className="block p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-slate-100 dark:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {c.title}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {c.stage === 'high' ? 'ثانوي' : 'إعدادي'} - الصف {c.grade}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 font-semibold">
                      {c.description || 'كورس اللغة الإنجليزية الشامل'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-bold text-xs">
                لم يتم تعيين كورسات محددة لك بعد من قبل المعلم
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
