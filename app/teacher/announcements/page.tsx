'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Pin,
  Calendar,
  Sparkles,
  CheckCircle2,
  Trophy,
  ExternalLink,
  Layers
} from 'lucide-react';
import {
  fetchAnnouncements,
  deleteAnnouncement,
  restoreAnnouncement,
  togglePinAnnouncement,
  AnnouncementData
} from '@/lib/teacherService';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import UndoDeleteToast from '@/components/UndoDeleteToast';
import RichContentViewer from '@/components/RichContentViewer';

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Delete & Undo state
  const [itemToDelete, setItemToDelete] = useState<AnnouncementData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeletedItem, setPendingDeletedItem] = useState<AnnouncementData | null>(null);
  const [isUndoToastOpen, setIsUndoToastOpen] = useState(false);

  const loadAnnouncements = async () => {
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Step 1: Click delete button triggers confirmation modal
  const handleRequestDelete = (ann: AnnouncementData) => {
    setItemToDelete(ann);
    setIsDeleteModalOpen(true);
  };

  // Step 2: Confirm deletion triggers 5-second undo toast
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    setIsDeleteModalOpen(false);
    setItemToDelete(null);

    // Remove from visible UI immediately
    setAnnouncements((prev) => prev.filter((a) => a.id !== target.id));
    setPendingDeletedItem(target);
    setIsUndoToastOpen(true);
  };

  // Step 3: Undo restores the item
  const handleUndoDelete = () => {
    if (!pendingDeletedItem) return;
    const restored = pendingDeletedItem;
    setAnnouncements((prev) => [restored, ...prev]);
    restoreAnnouncement(restored);
    setPendingDeletedItem(null);
    setIsUndoToastOpen(false);
    setSuccessMsg('تم التراجع عن الحذف بنجاح ↩️');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Step 4: Timer expiry commits the deletion permanently
  const handlePermanentDeleteExpire = async () => {
    if (!pendingDeletedItem) return;
    const target = pendingDeletedItem;
    setIsUndoToastOpen(false);
    setPendingDeletedItem(null);

    try {
      await deleteAnnouncement(target.id);
      setSuccessMsg('تم حذف الإعلان نهائياً');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async (id: string, currentPinStatus: boolean) => {
    try {
      const newStatus = !currentPinStatus;
      await togglePinAnnouncement(id, newStatus);
      setAnnouncements((prev) => {
        const updated = prev.map((a) => (a.id === id ? { ...a, isPinned: newStatus } : a));
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
      setSuccessMsg(newStatus ? 'تم تثبيت الإعلان في المقدمة 📌' : 'تم إلغاء تثبيت الإعلان');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-xs mb-3">
              <Megaphone className="w-4 h-4" />
              لوحة الإعلانات العامة والتنبيهات الرسمية
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              إدارة الإعلانات 📢
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base">
              نشر إعلانات مميزة وتكريم أوائل الطلبة، مع إمكانية التثبيت والتعديل والتقليب السلس في الصفحة الرئيسية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/#announcements"
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all"
            >
              <ExternalLink className="w-4 h-4 text-amber-500" />
              <span>معاينة في الرئيسية</span>
            </Link>

            <Link
              href="/teacher/announcements/create"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span>إنشاء إعلان جديد (صفحة منفصلة)</span>
            </Link>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            الإعلانات المنشورة حالياً ({announcements.length})
          </h3>
          <span className="text-xs text-slate-500 font-bold">
            الإعلانات المثبتة 📌 تظهر أولاً في الصفحة الرئيسية
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل الإعلانات...</div>
        ) : announcements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm flex flex-col justify-between hover:shadow-lg transition-all relative ${
                  ann.isPinned
                    ? 'border-amber-500/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ann.isPinned && (
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                          <Pin className="w-3 h-3 fill-slate-950" />
                          مثبت في المقدمة
                        </span>
                      )}

                      {ann.announcementType === 'top_student' ? (
                        <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300 dark:border-emerald-500/40">
                          <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                          لوحة شرف الأوائل 🏆
                        </span>
                      ) : (
                        <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 flex items-center gap-1">
                          <Megaphone className="w-3.5 h-3.5" />
                          إعلان عام
                        </span>
                      )}

                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {ann.targetStage === 'high'
                          ? 'المرحلة الثانوية'
                          : ann.targetStage === 'middle'
                          ? 'المرحلة الإعدادية'
                          : 'جميع المراحل'}
                        {ann.targetGrade ? ` (الصف ${ann.targetGrade})` : ''}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(ann.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  {ann.announcementType === 'top_student' && ann.studentName && (
                    <div className="mb-3 p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300/40 dark:border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          المتفوق(ة): {ann.studentName}
                        </span>
                      </div>
                      {ann.studentScore && (
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-300/40 shadow-sm">
                          {ann.studentScore}
                        </span>
                      )}
                    </div>
                  )}

                  <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                    {ann.title}
                  </h4>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    <RichContentViewer content={ann.content} />
                  </div>

                  {ann.imageUrl && (
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-4 border border-slate-200 dark:border-slate-800">
                      <Image
                        src={ann.imageUrl}
                        alt={ann.title}
                        fill
                        unoptimized
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                {/* Actions: Pin, Edit, Delete */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTogglePin(ann.id, !!ann.isPinned)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-colors ${
                      ann.isPinned
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${ann.isPinned ? 'fill-current' : ''}`} />
                    <span>{ann.isPinned ? 'إلغاء التثبيت' : 'تثبيت في المقدمة'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/teacher/announcements/edit/${ann.id}`}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-xs transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </Link>

                    <button
                      onClick={() => handleRequestDelete(ann)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
            <div>
              <p className="text-slate-600 dark:text-slate-400 font-black text-base">
                لا توجد إعلانات منشورة حالياً
              </p>
              <p className="text-slate-400 text-xs mt-1">
                عند نشر إعلان سيظهر تلقائياً في شريط الإعلانات بالصفحة الرئيسية.
              </p>
            </div>
            <Link
              href="/teacher/announcements/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء أول إعلان الآن</span>
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف الإعلان الرسمي"
        itemType="الإعلان"
        itemName={itemToDelete?.title || ''}
        warningNote="سيتم إزالة الإعلان فوراً مع إمكانية التراجع خلال 5 ثوانٍ قبل الحذف النهائي من النظام."
      />

      {/* 5-Second Undo Toast */}
      <UndoDeleteToast
        isOpen={isUndoToastOpen}
        itemName={pendingDeletedItem?.title || 'الإعلان'}
        durationSeconds={5}
        onUndo={handleUndoDelete}
        onExpire={handlePermanentDeleteExpire}
        onDismiss={handlePermanentDeleteExpire}
      />
    </div>
  );
}
