const fs = require('fs');
const content = fs.readFileSync('components/CourseCard.tsx', 'utf-8');

const target = `) : actionType === 'student_dashboard' ? (
            <Link
              href={\`/student/courses/\${id}\`}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <span>تفاصيل الكورس والاشتراك</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          ) : (`;

const replacement = `) : actionType === 'student_dashboard' ? (
            <Link
              href={\`/student/courses/\${id}\`}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <span>تفاصيل الكورس والاشتراك</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          ) : actionType === 'teacher_dashboard' ? (
            <div className="flex items-center gap-2 w-full">
              <Link 
                href={\`/teacher/courses/\${id}\`}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-100 dark:shadow-none"
              >
                <Eye className="w-4 h-4" />
                إدارة الكورس
              </Link>
              
              {/* Duplicate button */}
              {onDuplicate && (
                <button 
                  onClick={onDuplicate}
                  title="نسخ الكورس لصف أو نظام آخر"
                  className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 text-slate-600 dark:text-slate-400 rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}

              {/* Delete button */}
              {onDelete && (
                <button 
                  onClick={onDelete}
                  title="حذف الكورس"
                  className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-400 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (`;

const newContent = content.replace(target, replacement);
fs.writeFileSync('components/CourseCard.tsx', newContent);
console.log("Patched CourseCard Actions!");
