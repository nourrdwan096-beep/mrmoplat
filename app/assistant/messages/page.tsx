'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, User, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchStudents, StudentProfile } from '@/lib/studentService';

export default function AssistantMessagesPage() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<'broadcast' | string>('broadcast');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function load() {
      const all = await fetchStudents();
      setStudents(all.filter((s) => s.status === 'active'));
    }
    load();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setIsSending(true);
    try {
      // Simulate sending message
      await new Promise((r) => setTimeout(r, 600));
      setSuccessMsg(
        selectedRecipient === 'broadcast'
          ? 'تم إرسال الرسالة العامة لجميع الطلاب بنجاح ✨'
          : 'تم إرسال الرسالة الشخصية للطالب بنجاح ✨'
      );
      setTitle('');
      setContent('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-3">
            <Mail className="w-4 h-4" />
            نظام الرسائل المباشرة والتنبيهات
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            الرسائل الواردة والإشعارات ✉️
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base">
            إرسال تنبيهات وتوجيهات للطلاب أو رسائل شخصية مباشرة.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Message Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              نوع الرسالة والمستلم *
            </label>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="broadcast">📢 رسالة عامة لجميع الطلاب النشطين</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  👤 {s.fullName} ({s.phone}) - الصف {s.grade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان التنبيه / الرسالة *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تذكير بموعد تسليم واجب Unit 2"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              محتوى الرسالة *
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب نص الرسالة أو التوجيه هنا..."
              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'جاري الإرسال...' : 'إرسال الرسالة الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
