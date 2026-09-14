'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, User, UserCog, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { getTicketMessages, addTicketMessage, TicketMessage, SupportTicketData } from '@/lib/supportService';

interface TicketChatProps {
  ticket: SupportTicketData;
  currentUser: any;
  onMessageSent?: (msg: TicketMessage) => void;
}

export default function TicketChat({ ticket, currentUser, onMessageSent }: TicketChatProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!ticket?.id) return;
    try {
      const data = await getTicketMessages(ticket.id);
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    const handleUpdate = () => {
      fetchMessages();
    };

    const interval = setInterval(() => {
      fetchMessages();
    }, 4000);

    window.addEventListener('mr_radwan_support_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mr_radwan_support_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage.trim();

    try {
      const senderRole =
        currentUser?.role === 'super_admin' || currentUser?.role === 'teacher'
          ? 'teacher'
          : currentUser?.role === 'assistant'
          ? 'assistant'
          : 'student';

      const senderName =
        currentUser?.fullName ||
        (senderRole === 'teacher'
          ? 'مستر محمد رضوان'
          : senderRole === 'assistant'
          ? 'فريق المساعدين'
          : 'طالب');

      const msg = await addTicketMessage(
        ticket.id,
        {
          id: currentUser?.id || 'anonymous-user',
          name: senderName,
          role: senderRole,
        },
        content
      );

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) return prev;
        return [...prev, msg];
      });

      setNewMessage('');
      if (onMessageSent) onMessageSent(msg);
    } catch (err) {
      console.error('Error sending ticket message:', err);
      alert('تعذر إرسال الرسالة، يرجى المحاولة مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  const formatEgyptTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const day = d.toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'short' });
      const date = d.toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short' });
      const time = d.toLocaleTimeString('ar-EG', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${day} ${date} • ${time}`;
    } catch {
      return '';
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500">جاري تحميل المحادثة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-slate-400">#{ticket.ticketNumber}</span>
            <h3 className="font-black text-slate-900 dark:text-white text-sm md:text-base line-clamp-1">
              {ticket.subject}
            </h3>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            {ticket.courseTitle || ticket.course?.title || 'دعم عام'} •{' '}
            {ticket.ticketType === 'academic' ? 'أكاديمي' : 'فني'}
          </p>
        </div>
        <div
          className={`px-3 py-1 text-xs font-bold rounded-full flex-shrink-0 ${
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
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            لا توجد رسائل بعد. يمكنك كتابة استفسارك بالأسفل.
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser?.id;
            const isStaff =
              m.senderRole === 'teacher' ||
              m.senderRole === 'assistant' ||
              m.senderRole === 'super_admin';

            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isMe ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                    isStaff
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isMe
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {isStaff ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`rounded-2xl p-4 space-y-1.5 shadow-sm text-sm ${
                    isStaff
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-slate-900 dark:text-white'
                      : isMe
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
                    <span className={isMe ? 'text-blue-100' : isStaff ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}>
                      {m.senderName || (isStaff ? 'فريق الدعم' : 'الطالب')}
                    </span>
                    <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                      {formatEgyptTime(m.createdAt || m.created_at)}
                    </span>

                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed font-medium text-xs md:text-sm">
                    {m.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="اكتب ردك أو استفسارك هنا..."
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {sending ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
          ) : (
            <Send className="w-4 h-4 rtl:-scale-x-100" />
          )}
          <span>إرسال</span>
        </button>
      </form>
    </div>
  );
}
