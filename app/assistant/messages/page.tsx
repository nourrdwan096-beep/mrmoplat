'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchStudents, StudentProfile } from '@/lib/studentService';
import { sendMessage, fetchAllTeacherMessages, StudentMessage } from '@/lib/messagingService';
import { fetchMyAssistantProfileServerAction } from '@/app/actions/assistantActions';
import {
  AssistantPermissionsConfig,
  normalizeAssistantPermissions,
} from '@/lib/assistantPermissions';

export default function AssistantMessagesPage() {
  const { currentUser, currentRole } = useAuth();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<'broadcast' | string>('broadcast');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [recentMessages, setRecentMessages] = useState<StudentMessage[]>([]);

  const loadMessages = async () => {
    try {
      const allMsgs = await fetchAllTeacherMessages();
      setRecentMessages(allMsgs.slice(0, 10));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const isTeacherOverride = currentRole === 'teacher' || currentRole === 'super_admin';
        let canSend = isTeacherOverride;

        if (!isTeacherOverride) {
          const res = await fetchMyAssistantProfileServerAction();
          if (res.success && res.data && res.data.isActive !== false) {
            const perms = normalizeAssistantPermissions(
              res.data.permissions as Record<string, any>,
              res.data.permissions as Partial<AssistantPermissionsConfig>
            );
            canSend = Boolean(perms.canSendMessages);
          }
        }

        if (!isMounted) return;
        setAuthorized(canSend);

        if (canSend) {
          const all = await fetchStudents();
          if (!isMounted) return;
          setStudents(all.filter((s) => s.status === 'active'));
          await loadMessages();
        }
      } catch (err) {
        console.error('AssistantMessagesPage init error:', err);
        if (isMounted) setAuthorized(false);
      } finally {
        if (isMounted) setLoadingAuth(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [currentRole]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !authorized) return;

    setIsSending(true);
    setErrorMsg('');
    try {
      const isBroadcast = selectedRecipient === 'broadcast';
      const targetStudent = isBroadcast ? null : students.find((s) => s.id === selectedRecipient);

      await sendMessage({
        senderId: currentUser?.id || 'assistant-staff',
        senderName: currentUser?.fullName || 'فريق المساعدين',
        senderRole: 'assistant',
        isBroadcast,
        recipientStudentId: isBroadcast ? null : selectedRecipient,
        recipientStudentName: targetStudent?.fullName || null,
        title: title.trim(),
        content: content.trim(),
      });

      setSuccessMsg(
        isBroadcast
          ? 'تم إرسال الرسالة العامة لجميع الطلاب بنجاح'
          : `تم إرسال الرسالة الشخصية للطالب (${targetStudent?.fullName || ''}) بنجاح`
      );
      setTitle('');
      setContent('');
      await loadMessages();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSending(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
          جاري التحقق من صلاحية إرسال الرسائل...
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-500/20">
          <Lock className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            غير مصرح لك بإرسال الرسائل والتوجيهات
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold leading-relaxed">
            لم يتم تفعيل صلاحية إرسال الرسائل والتوجيهات للطلاب لحسابك من قبل مستر محمد رضوان.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى الرئيسية
          </Link>
          <Link
            href="/assistant/permissions"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs transition-colors"
          >
            عرض كشف صلاحياتي
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 font-sans max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            نظام الرسائل المباشرة والتوجيهات
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            الرسائل والتوجيهات للطلاب
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">
            إرسال إشعارات وتوجيهات للطلاب، تنبيهات الواجبات، ومتابعة التواصل المباشر.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Message Form Card */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-500" />
            إنشاء رسالة جديدة
          </h2>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع الرسالة والمستلم *
              </label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none"
              >
                <option value="broadcast">رسالة عامة لجميع الطلاب النشطين</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.phone}) - الصف {s.grade}
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
                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                محتوى الرسالة *
              </label>
              <textarea
                rows={5}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب نص الرسالة أو التوجيه هنا..."
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'جاري الإرسال...' : 'إرسال الرسالة الآن'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Recent Messages Sent */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            سجل الرسائل الصادرة
          </h2>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px]">
            {recentMessages.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10 font-bold">
                لم يتم إرسال أي رسائل بعد
              </p>
            ) : (
              recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">
                      {msg.title}
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {new Date(msg.createdAt).toLocaleDateString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 line-clamp-2">
                    {msg.content}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span>{msg.isBroadcast ? 'عامة للجميع' : `${msg.recipientStudentName || 'طالب'}`}</span>
                    <span>بواسطة: {msg.senderName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
