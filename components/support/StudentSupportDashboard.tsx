'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, BookOpen, Wrench, Send, AlertCircle, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { fetchStudentTickets, createSupportTicket, SupportTicketData } from '@/lib/supportService';
import TicketChat from './TicketChat';

export default function StudentSupportDashboard({
  currentUser,
  enrolledCourses = [],
}: {
  currentUser: any;
  enrolledCourses: { id: string; title: string }[];
}) {
  const [tickets, setTickets] = useState<SupportTicketData[]>([]);
  const [loading, setLoading] = useState(true);

  const [ticketType, setTicketType] = useState<'academic' | 'technical' | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketData | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const data = await fetchStudentTickets(currentUser.id);
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching student tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadTickets();

    const handleUpdate = () => {
      loadTickets();
    };

    window.addEventListener('mr_radwan_support_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('mr_radwan_support_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketType || !subject.trim() || !description.trim()) return;

    // For academic tickets, course is required if courses are available
    if (ticketType === 'academic' && enrolledCourses.length > 0 && !selectedCourse) {
      alert('يرجى اختيار الكورس المرتبط بالسؤال الأكاديمي');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const courseObj = enrolledCourses.find((c) => c.id === selectedCourse);

      const newTicket = await createSupportTicket({
        studentId: currentUser.id,
        studentName: currentUser.fullName || 'طالب',
        studentPhone: currentUser.phone || undefined,
        courseId: selectedCourse || undefined,
        courseTitle: courseObj?.title || undefined,
        ticketType,
        subject: subject.trim(),
        description: description.trim(),
        priority: 'normal',
      });

      setSuccessMessage('تم إرسال تذكرة الدعم بنجاح! سيقوم الفريق بالرد عليك في أقرب وقت.');
      setTicketType(null);
      setSelectedCourse('');
      setSubject('');
      setDescription('');

      await loadTickets();
      // Auto clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error submitting support ticket:', err);
      alert('حدث خطأ أثناء رفع التذكرة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedTicket) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col p-4 md:p-8 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedTicket(null)}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" /> العودة لقائمة التذاكر
        </button>
        <div className="flex-1 overflow-hidden">
          <TicketChat ticket={selectedTicket} currentUser={currentUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            الدعم الفني والأكاديمي <HelpCircle className="w-6 h-6 text-rose-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            نحن هنا لمساعدتك. ارفع تذكرة دعم وسيقوم مستر محمد رضوان أو فريق المساعدين بالرد عليك فوراً.
          </p>
        </div>
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 font-bold text-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {/* Course Enrollment Prerequisite Notice if no courses */}
      {enrolledCourses.length === 0 && (
        <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-base mb-1">
                تنبيه: يمكنك فتح تذكرة دعم فني عام، أو الاشتراك في كورس للدعم الأكاديمي
              </h3>
              <p className="text-xs md:text-sm font-semibold text-amber-800 dark:text-amber-300/90 leading-relaxed mb-4">
                تساؤلات المنهج الأكاديمية ترتبط بالكورسات التي تدرسها في المنصة. يمكنك الاشتراك في الكورسات أو فتح تذكرة دعم فني عامة لأي مشكلة تقنية.
              </p>
              <Link
                href="/student/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <BookOpen className="w-4 h-4" />
                استعراض الكورسات المتاحة
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setTicketType('academic')}
          className={`
            p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-4
            ${
              ticketType === 'academic'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-500/50'
            }
          `}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              ticketType === 'academic'
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'
            }`}
          >
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">دعم أكاديمي</h3>
            <p className="text-sm font-medium text-slate-500">
              أسئلة في المنهج والقواعد، طلب إعادة شرح جزئية، أو استفسار عن واجب/امتحان.
            </p>
          </div>
        </button>

        <button
          onClick={() => setTicketType('technical')}
          className={`
            p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-4
            ${
              ticketType === 'technical'
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-300 dark:hover:border-rose-500/50'
            }
          `}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              ticketType === 'technical'
                ? 'bg-rose-500 text-white'
                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'
            }`}
          >
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">دعم فني</h3>
            <p className="text-sm font-medium text-slate-500">
              مشكلة في تشغيل الفيديو، نفاذ محاولات الامتحان، مشاكل تسجيل الدخول أو الحساب.
            </p>
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {ticketType && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <AlertCircle
                className={`w-5 h-5 ${ticketType === 'academic' ? 'text-emerald-500' : 'text-rose-500'}`}
              />
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                تفاصيل تذكرة الـ {ticketType === 'academic' ? 'دعم الأكاديمي' : 'دعم الفني'}
              </h3>
            </div>

            <div className="space-y-4">
              {enrolledCourses.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    الكورس المرتبط بالمشكلة {ticketType === 'academic' && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    required={ticketType === 'academic'}
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">-- {ticketType === 'academic' ? 'اختر الكورس' : 'عام (غير مرتبط بكورس معين)'} --</option>
                    {enrolledCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  عنوان المشكلة أو السؤال <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="مثال: استفسار عن قاعدة Past Simple أو مشكلة في تشغيل الدرس الثاني"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  التفاصيل والوصف <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="اشرح المشكلة أو السؤال بالتفصيل لنتمكن من مساعدتك بأفضل شكل ممكن..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  px-8 py-3.5 rounded-xl font-black text-white flex items-center gap-2 transition-all shadow-lg
                  ${
                    ticketType === 'academic'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  }
                  ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
                `}
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Send className="w-5 h-5 rtl:-scale-x-100" />
                )}
                إرسال التذكرة
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Ticket History */}
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          تذاكر الدعم السابقة
        </h3>

        {loading ? (
          <div className="text-center py-8 text-sm font-medium text-slate-500 animate-pulse">
            جاري التحميل...
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-slate-500 font-bold">لا توجد تذاكر دعم سابقة حتى الآن.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        ticket.ticketType === 'academic'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {ticket.ticketType === 'academic' ? 'أكاديمي' : 'فني'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        ticket.status === 'open'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : ticket.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : ticket.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {ticket.status === 'open'
                        ? 'مفتوحة (بانتظار الرد)'
                        : ticket.status === 'in_progress'
                        ? 'قيد المعالجة'
                        : ticket.status === 'resolved'
                        ? 'تم الحل'
                        : 'مغلقة'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{ticket.ticketNumber || ticket.ticket_number}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{ticket.subject}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {ticket.courseTitle || ticket.course?.title || 'دعم عام'}
                  </p>
                </div>
                <div className="text-left md:text-right text-xs font-bold text-slate-400">
                  {new Date(ticket.createdAt || ticket.created_at || Date.now()).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
