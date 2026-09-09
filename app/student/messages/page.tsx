'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  fetchMessagesForStudent, 
  replyToMessage, 
  markMessageAsRead, 
  StudentMessage 
} from '@/lib/messagingService';
import { 
  MessageSquare, Search, Send, Clock, Check, Reply, 
  MessageCircle, Sparkles, User, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { motion } from 'motion/react';

export default function StudentMessagesPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<StudentMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  const loadMessages = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchMessagesForStudent(currentUser.id);
      setMessages(data);
      if (selectedMessage) {
        const refreshed = data.find(m => m.id === selectedMessage.id);
        if (refreshed) setSelectedMessage(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleSelectMessage = async (msg: StudentMessage) => {
    setSelectedMessage(msg);
    setReplyText(msg.replyContent || '');
    if (!msg.isRead) {
      await markMessageAsRead(msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    setIsSendingReply(true);
    try {
      await replyToMessage(selectedMessage.id, replyText.trim());
      setSelectedMessage(prev => prev ? { ...prev, replyContent: replyText.trim(), repliedAt: new Date().toISOString() } : null);
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, replyContent: replyText.trim(), repliedAt: new Date().toISOString() } : m));
      setReplySuccess(true);
      setTimeout(() => setReplySuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الرد');
    } finally {
      setIsSendingReply(false);
    }
  };

  const getWhatsAppLink = (messageTitle: string, replyBody: string) => {
    const teacherNumber = '201552191172';
    const studentInfo = currentUser ? `\nالطالب: ${currentUser.fullName}\nرقم الهاتف: ${currentUser.phone}` : '';
    const text = `السلام عليكم مستر محمد،\nبخصوص الرسالة: "${messageTitle}"\n\nردي هو:\n${replyBody}\n${studentInfo}`;
    return `https://wa.me/${teacherNumber}?text=${encodeURIComponent(text)}`;
  };

  const filteredMessages = messages.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col space-y-4">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            الرسائل الواردة <MessageSquare className="w-6 h-6 text-blue-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            الرسائل المباشرة والإعلانات الرسمية من مستر محمد رضوان مع إمكانية الرد الفوري.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden flex shadow-sm">
        
        {/* Messages List (Sidebar) */}
        <div className={`w-full md:w-1/3 border-l border-slate-200 dark:border-slate-800 flex flex-col ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="بحث في الرسائل..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pr-10 pl-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-bold text-sm">جاري تحميل الرسائل...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">لا توجد رسائل واردة حالياً</p>
                <p className="text-xs text-slate-400">ستظهر هنا أي رسائل خاصة أو عامة يوجهها مستر محمد لك مباشرة</p>
              </div>
            ) : (
              filteredMessages.map(msg => (
                <button 
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`w-full text-right p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 ${selectedMessage?.id === msg.id ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                >
                  <div className="shrink-0 mt-1">
                    {!msg.isRead ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm truncate pl-2 ${msg.isRead ? 'font-bold text-slate-700 dark:text-slate-300' : 'font-black text-slate-900 dark:text-white'}`}>
                        {msg.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{msg.content}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${msg.isBroadcast ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'}`}>
                        {msg.isBroadcast ? 'رسالة عامة للجميع' : 'رسالة خاصة لك'}
                      </span>
                      {msg.replyContent && (
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-500" /> تم الرد
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Content (Main View) */}
        <div className={`flex-1 flex flex-col ${!selectedMessage ? 'hidden md:flex' : 'flex'}`}>
          {selectedMessage ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedMessage(null)}
                    className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600"
                  >
                    عودة
                  </button>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-black text-lg">
                    م
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 dark:text-white">{selectedMessage.senderName}</h3>
                      <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                        معلم المادة
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(selectedMessage.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">
                    {selectedMessage.title}
                  </h2>
                  <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-base leading-relaxed whitespace-pre-line font-medium">
                    {selectedMessage.content}
                  </div>
                </div>

                {/* Existing Reply Display */}
                {selectedMessage.replyContent && (
                  <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> ردك المرسل للمعلم:
                      </span>
                      {selectedMessage.repliedAt && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          {new Date(selectedMessage.repliedAt).toLocaleString('ar-EG')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 whitespace-pre-line">
                      {selectedMessage.replyContent}
                    </p>
                  </div>
                )}

                {replySuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> تم إرسال ردك وحفظه بنجاح للمعلم!
                  </div>
                )}
              </div>

              {/* Reply Box */}
              <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col gap-3">
                  <textarea
                    rows={3}
                    placeholder="اكتب ردك هنا على رسالة المستر..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                  
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Send via Platform */}
                    <button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyText.trim()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                      {isSendingReply ? 'جاري الإرسال...' : 'إرسال الرد داخل المنصة'}
                    </button>

                    {/* Send via WhatsApp directly */}
                    {replyText.trim() && (
                      <a
                        href={getWhatsAppLink(selectedMessage.title, replyText.trim())}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                      >
                        <MessageCircle className="w-4 h-4" />
                        إرسال الرد أيضاً عبر واتساب المستر
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">حدد رسالة لقراءتها</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                اختر أي رسالة من القائمة الجانبية لقراءة تفاصيلها ومراسلة المعلم والرد عليه.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
