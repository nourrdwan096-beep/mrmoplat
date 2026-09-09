'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Plus, Search, User, Users, 
  Clock, CheckCircle2, MessageCircle, AlertCircle, 
  Sparkles, Filter, ChevronDown, Check, Reply, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  fetchAllTeacherMessages, 
  sendMessage, 
  StudentMessage 
} from '@/lib/messagingService';
import { fetchStudents, StudentProfile } from '@/lib/studentService';
import { useAuth } from '@/context/AuthContext';

export default function TeacherMessagesPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'broadcast' | 'personal' | 'replied'>('all');

  // Modal / Compose State
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const loadData = async () => {
    try {
      const [msgs, studs] = await Promise.all([
        fetchAllTeacherMessages(),
        fetchStudents()
      ]);
      setMessages(msgs);
      setStudents(studs.filter(s => s.status === 'active'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgContent.trim()) return;
    if (!isBroadcast && !selectedStudentId) {
      alert('يرجى اختيار الطالب المستهدف');
      return;
    }

    setIsSending(true);
    try {
      const targetStudent = students.find(s => s.id === selectedStudentId);
      await sendMessage({
        senderId: currentUser?.id || 'teacher_radwan',
        senderName: 'مستر محمد رضوان',
        senderRole: 'teacher',
        isBroadcast,
        recipientStudentId: isBroadcast ? null : selectedStudentId,
        recipientStudentName: isBroadcast ? null : targetStudent?.fullName,
        title: msgTitle.trim(),
        content: msgContent.trim()
      });

      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setShowComposeModal(false);
        setMsgTitle('');
        setMsgContent('');
        setSelectedStudentId('');
        setIsBroadcast(true);
      }, 1500);

      await loadData();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.recipientStudentName && m.recipientStudentName.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (filterType === 'broadcast') return m.isBroadcast;
    if (filterType === 'personal') return !m.isBroadcast;
    if (filterType === 'replied') return !!m.replyContent;
    return true;
  });

  const broadcastsCount = messages.filter(m => m.isBroadcast).length;
  const personalCount = messages.filter(m => !m.isBroadcast).length;
  const repliedCount = messages.filter(m => !!m.replyContent).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            الرسائل والتواصل المباشر <MessageSquare className="w-8 h-8 text-violet-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">
            إرسال تنبيهات عامة أو رسائل شخصية مباشرة للطلاب ومتابعة ردودهم في المنصة وواتساب
          </p>
        </div>

        <button
          onClick={() => setShowComposeModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" /> إنشاء رسالة جديدة
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400">إجمالي الرسائل</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{messages.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-indigo-500">رسائل عامة (للجميع)</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{broadcastsCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-emerald-500">رسائل خاصة لطلاب</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{personalCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-amber-500">ردود مستلمة من الطلاب</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{repliedCount}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="بحث في الرسائل أو أسماء الطلاب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pr-11 pl-4 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
          />
          <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filter Tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'all' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            الكل ({messages.length})
          </button>
          <button
            onClick={() => setFilterType('broadcast')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'broadcast' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            عامة ({broadcastsCount})
          </button>
          <button
            onClick={() => setFilterType('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'personal' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            خاصة ({personalCount})
          </button>
          <button
            onClick={() => setFilterType('replied')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'replied' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            بها ردود ({repliedCount})
          </button>
        </div>

      </div>

      {/* Messages Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold">جاري تحميل الرسائل...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">لا توجد رسائل حالياً</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              اضغط على زر &quot;إنشاء رسالة جديدة&quot; لبدء إرسال رسائل وتوجيهات لطلابك.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${msg.isBroadcast ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'}`}>
                    {msg.isBroadcast ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    {msg.isBroadcast ? 'رسالة عامة للجميع' : `رسالة خاصة إلى: ${msg.recipientStudentName || 'طالب'}`}
                  </span>
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(msg.createdAt).toLocaleString('ar-EG')}
                  </span>
                </div>

                {msg.replyContent && (
                  <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-black flex items-center gap-1.5 w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> رد الطالب متاح
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{msg.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                  {msg.content}
                </p>
              </div>

              {/* Student Reply if exists */}
              {msg.replyContent && (
                <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Reply className="w-4 h-4 text-amber-600" /> رد الطالب:
                    </span>
                    {msg.repliedAt && (
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(msg.repliedAt).toLocaleString('ar-EG')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 whitespace-pre-line">
                    {msg.replyContent}
                  </p>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showComposeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-violet-600" /> إنشاء رسالة جديدة
                </h2>
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-black text-sm"
                >
                  ✕
                </button>
              </div>

              {sendSuccess ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">تم إرسال الرسالة بنجاح!</h3>
                  <p className="text-sm text-slate-400">وصلت الرسالة إلى صندوق الطالب الآن وسيتمكن من قراءتها والرد عليها.</p>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-4">
                  {/* Broadcast vs Personal Toggle */}
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-2">نوع الرسالة</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setIsBroadcast(true); setSelectedStudentId(''); }}
                        className={`py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border transition-all ${isBroadcast ? 'bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-700' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'}`}
                      >
                        <Users className="w-4 h-4" /> رسالة عامة للجميع
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBroadcast(false)}
                        className={`py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border transition-all ${!isBroadcast ? 'bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-700' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'}`}
                      >
                        <User className="w-4 h-4" /> رسالة خاصة لطالب
                      </button>
                    </div>
                  </div>

                  {/* Student Picker if Personal */}
                  {!isBroadcast && (
                    <div>
                      <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-2">اختر الطالب المستهدف</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        <option value="">-- اختر طالب من المقيدين --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.phone}) - الصف {s.grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-2">عنوان الرسالة</label>
                    <input
                      type="text"
                      placeholder="مثال: تنبيه بخصوص موعد الامتحان التجريبي"
                      value={msgTitle}
                      onChange={(e) => setMsgTitle(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-2">نص الرسالة</label>
                    <textarea
                      rows={4}
                      placeholder="اكتب التوجيهات أو التعليمات بالتفصيل..."
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm font-semibold focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowComposeModal(false)}
                      className="px-5 py-3 rounded-2xl font-black text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSending}
                      className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-violet-600/20 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                      {isSending ? 'جاري الإرسال...' : 'إرسال الآن'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
