'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Headphones,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  User,
  Phone,
  BookOpen,
  MessageSquare,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  UserCheck,
  Zap,
  RefreshCw,
  Info
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getStaffTickets,
  getTicketMessages,
  addTicketMessage,
  updateTicketStatus,
  assignTicketToAssistant,
} from '@/app/actions/ticketActions';
import { fetchAssistantsServerAction } from '@/app/actions/assistantActions';
import { fetchAllCourses, CourseData } from '@/lib/academicService';

interface SupportManagementViewProps {
  viewMode: 'teacher' | 'assistant';
  assignedCourseIds?: string[];
}

const CANNED_RESPONSES = [
  'أهلاً بك يا بطل 🌟، تم فحص المشغل والمحتوى بنجاح. يُرجى تحديث الصفحة واختيار جودة مناسبة لسرعة الإنترنت.',
  'تم فحص مشكلتك وحلها وتجديد محاولة إضافية لك بنجاح 🎯 يمكنك الدخول الآن والاستمرار.',
  'سؤال ممتاز ومهم جداً! سيقوم المستر محمد رضوان بتوضيح هذه النقطة بالتفصيل في أقرب محاضرة إن شاء الله 💡',
  'تم التواصل معك وإرسال التوضيح الإضافي عبر الواتساب على رقمك المسجل 📱',
];

export function SupportManagementView({
  viewMode,
  assignedCourseIds = [],
}: SupportManagementViewProps) {
  const { currentUser, currentRole } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'academic' | 'technical'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Selected Ticket State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [assigningAssistant, setAssigningAssistant] = useState(false);

  // Mobile View Toggle
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'chat'>('list');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const role = (currentRole as any) || (viewMode === 'teacher' ? 'teacher' : 'assistant');
      const staffId = currentUser?.id || 'staff-master';

      const [staffTickets, allCourses, asstRes] = await Promise.all([
        getStaffTickets(staffId, role),
        fetchAllCourses(),
        fetchAssistantsServerAction(),
      ]);

      setTickets(staffTickets || []);
      setCourses(allCourses || []);
      if (asstRes?.success && Array.isArray(asstRes.data)) {
        setAssistants(asstRes.data);
      }

      // Keep selected ticket updated if it was selected
      setSelectedTicket((prev: any) => {
        if (!prev) return staffTickets && staffTickets.length > 0 ? staffTickets[0] : null;
        const updated = staffTickets?.find((t: any) => t.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error('Error loading support data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentRole, viewMode, currentUser?.id]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when selected ticket changes
  useEffect(() => {
    if (!selectedTicket?.id) return;
    async function loadMsg() {
      setMessagesLoading(true);
      try {
        const msgs = await getTicketMessages(selectedTicket.id);
        setMessages(msgs || []);
      } catch (err) {
        console.error('Failed to load ticket messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    }
    loadMsg();
  }, [selectedTicket?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || isSending) return;

    const messageContent = replyText.trim();
    setIsSending(true);

    try {
      const staffId = currentUser?.id || 'staff-master';
      const staffRole = (currentRole as any) || (viewMode === 'teacher' ? 'teacher' : 'assistant');
      const staffName = currentUser?.fullName || (viewMode === 'teacher' ? 'مستر محمد رضوان' : 'فريق المساعدين');

      const newMsg = await addTicketMessage(
        selectedTicket.id,
        staffId,
        staffRole,
        messageContent,
        staffName
      );

      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');

      // If ticket was open, it transitions to in_progress automatically
      if (selectedTicket.status === 'open') {
        setSelectedTicket((prev: any) => ({ ...prev, status: 'in_progress' }));
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t))
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (!selectedTicket) return;
    try {
      await updateTicketStatus(selectedTicket.id, newStatus, {
        id: currentUser?.id,
        name: currentUser?.fullName || 'المعلم',
        role: (currentRole as any) || viewMode,
      });

      setSelectedTicket((prev: any) => ({ ...prev, status: newStatus }));
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !currentUser) return;
    try {
      setAssigningAssistant(true);
      await assignTicketToAssistant(
        selectedTicket.id,
        currentUser.id,
        currentUser.fullName || 'المساعد',
        {
          id: currentUser.id,
          name: currentUser.fullName,
          role: (currentRole as any) || 'assistant',
        }
      );

      const updated = {
        ...selectedTicket,
        assigned_to_assistant_id: currentUser.id,
        assigned_assistant: { id: currentUser.id, full_name: currentUser.fullName },
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
      };

      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? updated : t)));
    } catch (err) {
      console.error('Assign to me error:', err);
    } finally {
      setAssigningAssistant(false);
    }
  };

  const handleAssignToSpecificAssistant = async (asstId: string) => {
    if (!selectedTicket || !asstId) return;
    const targetAsst = assistants.find((a) => a.id === asstId);
    if (!targetAsst) return;

    try {
      setAssigningAssistant(true);
      await assignTicketToAssistant(
        selectedTicket.id,
        targetAsst.id,
        targetAsst.fullName,
        {
          id: currentUser?.id,
          name: currentUser?.fullName || 'المعلم',
          role: (currentRole as any) || 'teacher',
        }
      );

      const updated = {
        ...selectedTicket,
        assigned_to_assistant_id: targetAsst.id,
        assigned_assistant: { id: targetAsst.id, full_name: targetAsst.fullName },
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
      };

      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? updated : t)));
    } catch (err) {
      console.error('Assign to assistant error:', err);
    } finally {
      setAssigningAssistant(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesType = typeFilter === 'all' || (t.ticket_type || t.ticketType) === typeFilter;
    const matchesCourse = courseFilter === 'all' || (t.course_id || t.courseId) === courseFilter;
    const studentName = t.student?.full_name || t.student_name || t.studentName || '';
    const studentPhone = t.student?.phone || t.student_phone || t.studentPhone || '';
    const ticketNum = String(t.ticket_number || t.ticketNumber || '');

    const matchesSearch =
      (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentPhone.includes(searchQuery) ||
      ticketNum.includes(searchQuery);

    return matchesStatus && matchesType && matchesCourse && matchesSearch;
  });

  const selectedStudentName =
    selectedTicket?.student?.full_name ||
    selectedTicket?.student_name ||
    selectedTicket?.studentName ||
    'طالب';

  const selectedStudentPhone =
    selectedTicket?.student?.phone ||
    selectedTicket?.student_phone ||
    selectedTicket?.studentPhone ||
    '';

  const selectedCourseTitle =
    selectedTicket?.course?.title ||
    selectedTicket?.course_title ||
    selectedTicket?.courseTitle ||
    'عام';

  const selectedTicketNumber = selectedTicket?.ticket_number || selectedTicket?.ticketNumber || 1001;
  const selectedTicketType = selectedTicket?.ticket_type || selectedTicket?.ticketType || 'technical';

  const waStudentLink = selectedStudentPhone
    ? `https://wa.me/20${selectedStudentPhone.replace(/^0+/, '')}?text=${encodeURIComponent(
        `مرحباً يا ${selectedStudentName}، معك فريق منصة مستر محمد رضوان بخصوص تذكرتك رقم #${selectedTicketNumber} (${selectedTicket?.subject || ''}).`
      )}`
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-3">
              <Headphones className="w-4 h-4" />
              نظام توجيه التذاكر الذكي والرد الفوري (Smart Ticket Dispatch)
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">
              لوحة إدارة الدعم الفني والأكاديمي 🎧
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-xs md:text-sm">
              متابعة استفسارات الطلاب في المنهج وحل المشاكل التقنية مع ربط واتساب المباشر وتتبع سجل الإجراءات.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 font-black text-xs">
              التذاكر المتاحة: {filteredTickets.length}
            </div>
          </div>
        </div>

        {/* Mobile View Toggle Buttons */}
        <div className="flex md:hidden mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
          <button
            onClick={() => setMobileActiveView('list')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              mobileActiveView === 'list'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            قائمة التذاكر ({filteredTickets.length})
          </button>
          <button
            onClick={() => setMobileActiveView('chat')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              mobileActiveView === 'chat'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            محادثة التذكرة {selectedTicket ? `#${selectedTicketNumber}` : ''}
          </button>
        </div>
      </div>

      {/* Main Support Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tickets List Column */}
        <div
          className={`lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 ${
            mobileActiveView === 'chat' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالطالب، الهاتف، رقم التذكرة، الموضوع..."
                className="w-full h-10 pr-9 pl-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 px-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">كل الحالات</option>
                <option value="open">مفتوحة</option>
                <option value="in_progress">قيد المتابعة</option>
                <option value="resolved">تم الحل ✓</option>
                <option value="closed">مغلقة</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="h-9 px-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">الكل</option>
                <option value="academic">أكاديمي</option>
                <option value="technical">فني</option>
              </select>

              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="h-9 px-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">كل الكورسات</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-emerald-500" />
                <p>جاري تحميل التذاكر وتحديث السجلات...</p>
              </div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const sName = ticket.student?.full_name || ticket.student_name || ticket.studentName || 'طالب';
                const tNum = ticket.ticket_number || ticket.ticketNumber || 1001;
                const tType = ticket.ticket_type || ticket.ticketType || 'technical';
                const cTitle = ticket.course?.title || ticket.course_title || ticket.courseTitle || 'عام';

                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setMobileActiveView('chat');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">#{tNum}</span>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">
                          {ticket.subject}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                          tType === 'academic'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {tType === 'academic' ? 'أكاديمي' : 'فني'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {ticket.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{sName}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="truncate text-slate-400 font-normal">{cTitle}</span>
                      </div>

                      <span
                        className={`font-black px-2 py-0.5 rounded-lg ${
                          ticket.status === 'open'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                            : ticket.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                            : ticket.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {ticket.status === 'open'
                          ? 'مفتوحة'
                          : ticket.status === 'in_progress'
                          ? 'قيد المتابعة'
                          : ticket.status === 'resolved'
                          ? 'تم الحل ✓'
                          : 'مغلقة'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 font-bold text-xs">
                لا توجد تذاكر تطابق الفرز الحالي
              </div>
            )}
          </div>
        </div>

        {/* Conversation Details Column */}
        <div
          className={`lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[740px] ${
            mobileActiveView === 'list' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {selectedTicket ? (
            <>
              {/* Ticket Top Info */}
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMobileActiveView('list')}
                      className="lg:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-black">
                          #{selectedTicketNumber}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            selectedTicketType === 'academic'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          {selectedTicketType === 'academic' ? 'دعم أكاديمي' : 'دعم فني'}
                        </span>
                      </div>
                      <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white mt-0.5">
                        {selectedTicket.subject}
                      </h3>
                    </div>
                  </div>

                  {/* Status Badges & Controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                      className="h-8 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-black text-slate-800 dark:text-slate-200"
                    >
                      <option value="open">مفتوحة</option>
                      <option value="in_progress">قيد المتابعة</option>
                      <option value="resolved">تم الحل بنجاح ✓</option>
                      <option value="closed">إغلاق التذكرة</option>
                    </select>

                    {/* Assistant Quick Claim */}
                    {viewMode === 'assistant' && !selectedTicket.assigned_to_assistant_id && (
                      <button
                        onClick={handleAssignToMe}
                        disabled={assigningAssistant}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>استلام التذكرة لي</span>
                      </button>
                    )}

                    {/* Teacher/Super Admin Assistant Dispatcher */}
                    {(viewMode === 'teacher' || currentRole === 'super_admin' || currentRole === 'teacher') && assistants.length > 0 && (
                      <select
                        value={selectedTicket.assigned_to_assistant_id || ''}
                        onChange={(e) => handleAssignToSpecificAssistant(e.target.value)}
                        disabled={assigningAssistant}
                        className="h-8 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-[11px] font-bold text-slate-700 dark:text-slate-300"
                      >
                        <option value="">توجيه لمساعد...</option>
                        {assistants.map((asst) => (
                          <option key={asst.id} value={asst.id}>
                            مساعد: {asst.fullName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Student Info Bar & WhatsApp Direct */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                    <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{selectedStudentName}</span>
                  </div>

                  {waStudentLink ? (
                    <a
                      href={waStudentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{selectedStudentPhone} (واتساب مباشر)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span>بدون هاتف مسجل</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold truncate">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{selectedCourseTitle}</span>
                  </div>

                  {/* Assigned Assistant badge */}
                  {(selectedTicket.assigned_assistant?.full_name || selectedTicket.assignedAssistantName) && (
                    <div className="col-span-full sm:col-span-3 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                      <UserCheck className="w-3 h-3" />
                      <span>المسئول الحالي: {selectedTicket.assigned_assistant?.full_name || selectedTicket.assignedAssistantName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
                {/* Initial Ticket Question */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400 font-bold">
                    <span>نص استفسار الطالب الأولي</span>
                    <span>
                      {(() => {
                        const d = new Date(selectedTicket.created_at || selectedTicket.createdAt);
                        const day = d.toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'short' });
                        const date = d.toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short' });
                        const time = d.toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: true });
                        return `${day} ${date} • ${time} (توقيت مصر)`;
                      })()}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed whitespace-pre-line">
                    {selectedTicket.description}
                  </p>
                </div>

                {messagesLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>جاري تحميل المحادثة...</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const sRole = msg.sender_role || msg.senderRole;
                    const isStaff = sRole === 'teacher' || sRole === 'assistant' || sRole === 'super_admin';
                    const sName = msg.sender?.full_name || msg.senderName || (isStaff ? 'إدارة المنصة' : selectedStudentName);
                    const msgTime = msg.created_at || msg.createdAt;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs ${
                            isStaff
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-black mb-1 ${
                              isStaff ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            {sName} ({isStaff ? (sRole === 'teacher' || sRole === 'super_admin' ? 'مستر محمد رضوان' : 'مساعد') : 'الطالب'})
                          </div>
                          <p className="font-semibold leading-relaxed whitespace-pre-line">
                            {msg.message}
                          </p>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold px-1 mt-1">
                          {(() => {
                            const d = new Date(msgTime);
                            const day = d.toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'short' });
                            const time = d.toLocaleTimeString('ar-EG', {
                              timeZone: 'Africa/Cairo',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            });
                            return `${day} • ${time} (توقيت مصر)`;
                          })()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pre-made Canned Quick Responses */}
              <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>ردود جاهزة ومقترحة بنقرة واحدة:</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {CANNED_RESPONSES.map((resp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(resp)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-[10px] font-semibold whitespace-nowrap transition-colors border border-transparent hover:border-emerald-300 dark:hover:border-emerald-700"
                    >
                      {resp.slice(0, 32)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendMessage} className="pt-2 flex gap-2">
                <input
                  type="text"
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="اكتب ردك أو التوجيه للطالب هنا..."
                  className="flex-1 h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="px-5 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'جاري الإرسال...' : 'إرسال'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Headphones className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-3" />
              <h4 className="text-base font-black text-slate-700 dark:text-slate-300">
                اختر تذكرة للبدء في الرد عليها
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                تظهر جميع استفسارات الطلاب الأكاديمية والتقنية في القائمة. يمكنك التعيين وتحديث الحالات والتواصل مع الطالب مباشرة.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Developer Signature */}
      <div className="pt-8 text-center">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
          Built With Developer &amp; Designer NOUR M. EL-SAIED 💚 💚
        </p>
      </div>
    </div>
  );
}
