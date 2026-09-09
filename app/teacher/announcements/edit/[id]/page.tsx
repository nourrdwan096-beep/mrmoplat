'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Megaphone,
  Trophy,
  ArrowRight,
  Pin,
  Image as ImageIcon,
  CheckCircle2,
  UploadCloud,
  X,
  List,
  Save
} from 'lucide-react';
import {
  fetchAnnouncements,
  updateAnnouncement,
  AnnouncementData
} from '@/lib/teacherService';
import RichTextEditor from '@/components/RichTextEditor';

export default function EditAnnouncementPage() {
  const router = useRouter();
  const params = useParams();
  const announcementId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [announcementType, setAnnouncementType] = useState<'general' | 'top_student'>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentScore, setStudentScore] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetStage, setTargetStage] = useState<'all' | 'middle' | 'high'>('all');
  const [targetGrade, setTargetGrade] = useState<'all' | 1 | 2 | 3>('all');
  const [isPinned, setIsPinned] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const all = await fetchAnnouncements();
        const found = all.find((a) => a.id === announcementId);
        if (found) {
          setTitle(found.title);
          setContent(found.content);
          setAnnouncementType(found.announcementType || 'general');
          setStudentName(found.studentName || '');
          setStudentScore(found.studentScore || '');
          setImageUrl(found.imageUrl || '');
          setTargetStage((found.targetStage as any) || 'all');
          setTargetGrade((found.targetGrade as any) || 'all');
          setIsPinned(!!found.isPinned);
        } else {
          alert('الإعلان غير موجود أو قد تم حذفه');
          router.push('/teacher/announcements');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (announcementId) {
      load();
    }
  }, [announcementId, router]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await updateAnnouncement(announcementId, {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl || undefined,
        targetStage: targetStage === 'all' ? null : targetStage,
        targetGrade: targetGrade === 'all' ? null : targetGrade,
        announcementType,
        studentName: announcementType === 'top_student' ? studentName.trim() : undefined,
        studentScore: announcementType === 'top_student' ? studentScore.trim() : undefined,
        isPinned,
      });

      setIsSaved(true);
      setTimeout(() => {
        router.push('/teacher/announcements');
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحديث الإعلان');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 pt-2">
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/teacher/announcements"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى إدارة الإعلانات</span>
        </Link>

        <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          تعديل الإعلان
        </span>
      </div>

      {isSaved ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-emerald-500/30 shadow-xl text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            تم حفظ التعديلات بنجاح!
          </h2>
          <p className="text-sm text-slate-500">جاري توجيهك إلى قائمة الإعلانات...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">
              تعديل الإعلان ✏️
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              قم بتعديل النصوص أو تبديل حالة التثبيت في المقدمة بكل سهولة.
            </p>
          </div>

          <form
            onSubmit={handleUpdate}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
          >
            {announcementType === 'top_student' && (
              <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                  <Trophy className="w-4 h-4" />
                  <span>بيانات الطالب المتفوق:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم الطالب
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      الدرجة أو التقدير
                    </label>
                    <input
                      type="text"
                      value={studentScore}
                      onChange={(e) => setStudentScore(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                عنوان الإعلان <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm md:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                محتوى الإعلان <span className="text-rose-500">*</span>
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="اكتب محتوى الإعلان هنا وقم بتنسيقه بحرية..."
                minHeight="150px"
                showStickers={true}
                showAnimations={true}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  المرحلة المستهدفة
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm"
                >
                  <option value="all">جميع المراحل (إعدادي + ثانوي)</option>
                  <option value="high">المرحلة الثانوية</option>
                  <option value="middle">المرحلة الإعدادية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  الصف الدراسي المستهدف
                </label>
                <select
                  value={targetGrade}
                  onChange={(e) =>
                    setTargetGrade(e.target.value === 'all' ? 'all' : (Number(e.target.value) as 1 | 2 | 3))
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm"
                >
                  <option value="all">جميع الصفوف (الأول والثاني والثالث)</option>
                  <option value="1">الصف الأول</option>
                  <option value="2">الصف الثاني</option>
                  <option value="3">الصف الثالث</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                صورة الإعلان
              </label>
              {imageUrl ? (
                <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-amber-500/40">
                  <img src={imageUrl} alt="الصورة" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30">
                  <UploadCloud className="w-8 h-8 text-amber-500 mb-2" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    اضغط لرفع صورة جديدة
                  </span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Pin Announcement Option */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm">
                  <Pin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    تثبيت الإعلان في أول القائمة 📌
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    سيظهر هذا الإعلان أولاً في شريط الصفحة الرئيسية.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-300 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Link
                href="/teacher/announcements"
                className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm"
              >
                إلغاء
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all hover:scale-105 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
