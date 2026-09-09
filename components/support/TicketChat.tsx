'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, User, UserCog, CheckCircle2, AlertCircle } from 'lucide-react';
import { getTicketMessages, addTicketMessage } from '@/app/actions/ticketActions';

interface TicketChatProps {
  ticket: any;
  currentUser: any;
}

export default function TicketChat({ ticket, currentUser }: TicketChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const data = await getTicketMessages(ticket.id);
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const msg = await addTicketMessage(ticket.id, currentUser.id, currentUser.role, newMessage);
      setMessages([...messages, msg]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const formatEgyptTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = d.toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'short' });
    const date = d.toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('ar-EG', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${day} ${date} • ${time} (توقيت مصر)`;
  };

  if (loading) return <div className="p-8 text-center"><span className="animate-pulse">جاري التحميل...</span></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
            #{ticket.ticket_number} - {ticket.subject}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {ticket.course?.title || 'عام'} • {ticket.ticket_type === 'academic' ? 'أكاديمي' : 'فني'}
          </p>
        </div>
        <div className={`px-3 py-1 text-xs font-bold rounded-full ${
          ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
          ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
          'bg-emerald-100 text-emerald-700'
        }`}>
          {ticket.status === 'open' ? 'مفتوح' :
           ticket.status === 'in_progress' ? 'قيد المعالجة' : 'مغلق'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial ticket description as first message */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tr-sm border border-slate-200 dark:border-slate-700 max-w-[85%]">
            <p className="text-sm text-slate-900 dark:text-slate-100 font-medium whitespace-pre-wrap">{ticket.description}</p>
            <p className="text-[10px] text-slate-400 mt-2 text-left">{formatEgyptTime(ticket.created_at)}</p>
          </div>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUser.id;
          const isStaff = msg.sender_role === 'teacher' || msg.sender_role === 'assistant';

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id || idx} 
              className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isStaff ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'
              }`}>
                {isStaff ? <UserCog className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`p-3 rounded-2xl border max-w-[85%] ${
                isMe 
                  ? 'bg-blue-500 text-white border-blue-600 rounded-tl-sm' 
                  : isStaff 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-slate-100 rounded-tr-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tr-sm'
              }`}>
                {!isMe && (
                  <p className="text-xs font-bold mb-1 opacity-70">
                    {msg.sender?.full_name} {isStaff ? `(${msg.sender_role === 'teacher' ? 'المعلم' : 'مساعد'})` : ''}
                  </p>
                )}
                <p className="text-sm font-medium whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-[10px] mt-2 text-left ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                  {formatEgyptTime(msg.created_at)}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {ticket.status !== 'closed' && (
        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4 rtl:-scale-x-100" />}
          </button>
        </form>
      )}
      {ticket.status === 'closed' && (
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center text-sm font-bold text-slate-500">
          تم إغلاق هذه التذكرة. لا يمكن إرسال رسائل جديدة.
        </div>
      )}
    </div>
  );
}
