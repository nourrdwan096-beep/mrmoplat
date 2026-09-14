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
  Info,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchStaffTickets,
  getTicketMessages,
  addTicketMessage,
  updateTicketStatus,
  assignTicketToAssistant,
  SupportTicketData,
  TicketMessage,
} from '@/lib/supportService';
import { fetchAssistants } from '@/lib/teacherService';
import { fetchAllCourses, CourseData } from '@/lib/academicService';

interface SupportManagementViewProps {
  viewMode: 'teacher' | 'assistant';
  assignedCourseIds?: string[];
}

const CANNED_RESPONSES = [
  'أهلاً بك يا بطل 🌟، تم فحص المشغل والمحتوى بنجاح. يُرجى تحديث الصفحة واختيار جودة مناسبة لسرعة الإنترنت.',
  'تم فحص مشكلتك وحلها وتجديد محاولة إضافية لك بنجاح 🎯 يمكنك الدخول الآن والاستمرار.',
  'سؤال ممتاز ومهم جداً! سيقوم المستر محمد رضوان بتوضيح هذه النقطة بالتفصيل في أقرب محاضرة إن شاء الله 💡',
  'تم التواصل معك وتوضيح النقطة المطلوبة بالكامل 📱 بالتوفيق والنجاح دائماً.',
];

export function SupportManagementView({
  viewMode,
  assignedCourseIds = [],
}: SupportManagementViewProps) {
  const { currentUser, currentRole } = useAuth();
  const [tickets, setTickets] = useState<SupportTicketData[]>([]);
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
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketData | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
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

      const [staffTickets, allCourses, assistantsList] = await Promise.all([
        fetchStaffTickets(staffId, role, assignedCourseIds),
        fetchAllCourses(),
        fetchAssistants(),
      ]);

      setTickets(staffTickets || []);
      setCourses(allCourses || []);
      if (Array.isArray(assistantsList)) {
        setAssistants(assistantsList);
      }

      // Keep selected ticket updated if it was selected
      setSelectedTicket((prev) => {
        if (!prev) return staffTickets && staffTickets.length > 0 ? staffTickets[0] : null;
        const updated = staffTickets?.find((t) => t.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error('Error loading support data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentRole, viewMode, currentUser?.id, assignedCourseIds]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData(true);
    };

    window.addEventListener('mr_radwan_support_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('mr_radwan_support_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadData]);

  // Load messages when selected ticket changes
  useEffect(() => {
    if (!selectedTicket?.id) return;
    async function loadMsg() {
      setMessagesLoading(true);
      try {
        const msgs = await getTicketMessages(selectedTicket!.id);
        setMessages(msgs || []);
      } catch (err) {
        console.error('Failed to load ticket messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    }
    loadMsg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || isSending) return;

    const messageContent = replyText.trim();
    setIsSending(true);

    try {
      const staffId = currentUser?.id || 'staff-master';
      const staffRole = (currentRole as any) || (viewMode === 'teacher' ? 'teacher' : 'assistant');
      const staffName =
        currentUser?.fullName || (viewMode === 'teacher' ? 'مستر محمد رضوان' : 'فريق المساعدين');

      const newMsg = await addTicketMessage(
        selectedTicket.id,
        {
          id: staffId,
          name: staffName,
          role: staffRole,
        },
        messageContent
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
      console.error('Error sending reply:', err);
      alert('حدث خطأ أثناء إرسال الرد، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: SupportTicketData['status']) => {
    if (!selectedTicket) return;
    try {
      await updateTicketStatus(selectedTicket.id, newStatus, undefined, {
        id: currentUser?.id,
        name: currentUser?.fullName,
        role: currentRole || viewMode,
      });

      setSelectedTicket((prev: any) => ({ ...prev, status: newStatus }));
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Error changing ticket status:', err);
      alert('حدث خطأ أثناء تحديث حالة التذكرة');
    }
  };

  const handleAssignAssistant = async (assistantId: string) => {
    if (!selectedTicket) return;
    setAssigningAssistant(true);
    try {
      const targetAsst = assistants.find((a) => a.id === assistantId);
      const asstName = targetAsst?.fullName || 'مساعد';

      await assignTicketToAssistant(selectedTicket.id, assistantId, asstName, {
        id: currentUser?.id,
        name: currentUser?.fullName,
        role: currentRole || viewMode,
      });

      setSelectedTicket((prev: any) => ({
        ...prev,
        assignedToAssistantId: assistantId,
        assignedAssistantName: asstName,
        status: 'in_progress',
      }));

      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? {
                ...t,
                assignedToAssistantId: assistantId,
                assignedAssistantName: asstName,
                status: 'in_progress',
              }
            : t
        )
      );
    } catch (err) {
      console.error('Error assigning assistant:', err);
      alert('حدث خطأ أثناء تعيين المساعد');
    } finally {
      setAssigningAssistant(false);
    }
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchStudent = t.studentName?.toLowerCase().includes(q) || t.student?.full_name?.toLowerCase().includes(q);
      const matchPhone = t.studentPhone?.includes(q) || t.student?.phone?.includes(q);
      const matchNum = String(t.ticketNumber).includes(q);
      if (!matchSubject && !matchStudent && !matchPhone && !matchNum) return false;
    }

    // Status
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;

    // Type
    if (typeFilter !== 'all' && t.ticketType !== typeFilter) return false;

    // Course
    if (courseFilter !== 'all' && t.courseId !== courseFilter && t.course_id !== courseFilter) return false;

    return true;
  });

  // Stats Counters
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const academicCount = tickets.filter((t) => t.ticketType === 'academic').length;
  const technicalCount = tickets.filter((t) => t.ticketType === 'technical').length;

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Headphones className="w-3.5 h-3.5" />
              <span>
                {viewMode === 'teacher' ? 'مركز إدارة الدعم - مستر محمد رضوان' : 'بوابة الدعم الفني والأكاديمي'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              تذاكر الدعم الذكية والرد الفوري
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              متابعة تساؤلات الطلاب في المنهج (أكاديمي) وحل مشاكل المشغل والامتحانات (فني) مع سجل كامل ومتابعة فورية.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs flex items-center gap-2 transition-all"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-[11px] font-bold text-slate-400">إجمالي التذاكر</div>
            <div className="text-xl font-black text-white mt-1">{tickets.length}</div>
          </div>
          <div className="bg-amber-500/10 rounded-2xl p-3 border border-amber-500/20">
            <div className="text-[11px] font-bold text-amber-300">مفتوحة (جديدة)</div>
            <div className="text-xl font-black text-amber-400 mt-1">{openCount}</div>
          </div>
          <div className="bg-blue-500/10 rounded-2xl p-3 border border-blue-500/20">
            <div className="text-[11px] font-bold text-blue-300">قيد المعالجة</div>
            <div className="text-xl font-black text-blue-400 mt-1">{inProgressCount}</div>
          </div>
          <div className="bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20">
            <div className="text-[11px] font-bold text-emerald-300">تم الحل والمغلقة</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{resolvedCount}</div>
          </div>
          <div className="bg-purple-500/10 rounded-2xl p-3 border border-purple-500/20 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-purple-300">أكاديمي / فني</div>
            <div className="text-sm font-black text-purple-200 mt-1.5 flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{academicCount} أكاديمي</span>
              <span>•</span>
              <span className="text-rose-400 font-bold">{technicalCount} فني</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث باسم الطالب، رقم الهاتف، أو رقم التذكرة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">جميع الحالات ({tickets.length})</option>
              <option value="open">مفتوحة / جديدة ({openCount})</option>
              <option value="in_progress">قيد المعالجة ({inProgressCount})</option>
              <option value="resolved">تم الحل ({resolvedCount})</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-2">
            <select
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">كل الأنواع</option>
              <option value="academic">أكاديمي فقط</option>
              <option value="technical">فني فقط</option>
            </select>
          </div>

          {/* Course Filter */}
          <div className="sm:col-span-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none truncate"
            >
              <option value="all">جميع الكورسات</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Ticket List (Right) + Active Chat (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* Tickets List */}
        <div
          className={`lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col ${
            mobileActiveView === 'chat' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h2 className="font-black text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              قائمة التذاكر ({filteredTickets.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[600px] pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold animate-pulse">
                جاري تحميل التذاكر...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold">
                لا توجد تذاكر تطابق الفلاتر المحددة.
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const isAcademic = ticket.ticketType === 'academic';

                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setMobileActiveView('chat');
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right space-y-2 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isAcademic
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {isAcademic ? 'أكاديمي' : 'فني'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
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
                            ? 'مفتوحة'
                            : ticket.status === 'in_progress'
                            ? 'قيد المعالجة'
                            : ticket.status === 'resolved'
                            ? 'تم الحل'
                            : 'مغلقة'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">#{ticket.ticketNumber}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs md:text-sm text-slate-900 dark:text-white line-clamp-1">
                        {ticket.subject}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {ticket.studentName || ticket.student?.full_name || 'طالب'} •{' '}
                        {ticket.courseTitle || ticket.course?.title || 'عام'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60 font-semibold">
                      <span>{new Date(ticket.createdAt || ticket.created_at || Date.now()).toLocaleDateString('ar-EG')}</span>
                      {(ticket.assignedAssistantName || ticket.assigned_assistant?.full_name) && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          المكلف: {ticket.assignedAssistantName || ticket.assigned_assistant?.full_name}
                        </span>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Ticket Chat & Controls */}
        <div
          className={`lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 shadow-sm flex flex-col ${
            mobileActiveView === 'list' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {selectedTicket ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Back button for mobile */}
              <button
                onClick={() => setMobileActiveView('list')}
                className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 pb-2 border-b border-slate-100 dark:border-slate-800"
              >
                <ChevronRight className="w-4 h-4" /> العودة لقائمة التذاكر
              </button>

              {/* Ticket Meta & Action Toolbar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                        #{selectedTicket.ticketNumber}
                      </span>
                      <h3 className="font-black text-base text-slate-900 dark:text-white">
                        {selectedTicket.subject}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {selectedTicket.studentName || selectedTicket.student?.full_name || 'طالب'}
                      </span>
                      {selectedTicket.studentPhone && (
                        <span className="flex items-center gap-1 font-mono text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {selectedTicket.studentPhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                        <BookOpen className="w-3.5 h-3.5" />
                        {selectedTicket.courseTitle || selectedTicket.course?.title || 'عام'}
                      </span>
                    </div>
                  </div>

                  {/* Status Switcher */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => handleStatusChange('open')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedTicket.status === 'open'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      مفتوحة
                    </button>
                    <button
                      onClick={() => handleStatusChange('in_progress')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedTicket.status === 'in_progress'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      قيد المعالجة
                    </button>
                    <button
                      onClick={() => handleStatusChange('resolved')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      تم الحل ✓
                    </button>
                  </div>
                </div>

                {/* Assistant Assignment Dropdown (Teacher Mode) */}
                {viewMode === 'teacher' && assistants.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 font-bold flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                      تكليف مساعد بهذه التذكرة:
                    </span>
                    <select
                      value={selectedTicket.assignedToAssistantId || ''}
                      onChange={(e) => e.target.value && handleAssignAssistant(e.target.value)}
                      disabled={assigningAssistant}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- اختر المساعد --</option>
                      {assistants.map((asst) => (
                        <option key={asst.id} value={asst.id}>
                          {asst.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-3 min-h-[260px] max-h-[380px]">
                {messagesLoading ? (
                  <div className="text-center py-12 text-xs text-slate-400 font-bold animate-pulse">
                    جاري تحميل الرسائل...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 font-bold">
                    لا توجد رسائل سابقة في هذه التذكرة.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isStaff =
                      m.senderRole === 'teacher' ||
                      m.senderRole === 'assistant' ||
                      m.senderRole === 'super_admin';

                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 max-w-[85%] ${isStaff ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                            isStaff
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {isStaff ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>

                        <div
                          className={`rounded-2xl p-3.5 space-y-1 shadow-sm text-xs md:text-sm ${
                            isStaff
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
                            <span className={isStaff ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-300'}>
                              {m.senderName || (isStaff ? 'فريق الدعم' : 'الطالب')}
                            </span>
                            <span className={`text-[10px] ${isStaff ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {new Date(m.createdAt || m.created_at || Date.now()).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>

                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed font-medium">{m.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Canned Responses */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>ردود سريعة جاهزة:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CANNED_RESPONSES.map((canned, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(canned)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-[11px] font-semibold transition-all border border-slate-200 dark:border-slate-700 text-right line-clamp-1 max-w-[280px]"
                    >
                      {canned}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendMessage} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك الأكاديمي أو الفني للطالب هنا..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSending ? (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                    )}
                    <span>إرسال الرد</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400">
              <Headphones className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                اختر تذكرة من القائمة لعرض المحادثة والرد عليها
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                يمكنك الرد المباشر، تحويل الحالة إلى قيد المعالجة أو تم الحل، وتكليف المساعدين بكل سهولة.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
