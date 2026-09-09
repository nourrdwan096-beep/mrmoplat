const fs = require('fs');
const content = fs.readFileSync('app/teacher/courses/page.tsx', 'utf-8');

const target = `{filteredCourses.map((course, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              key={course.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                {/* Cover Header */}
                <div className="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {course.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={course.coverImage} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
                      <BookOpen className="w-12 h-12 mb-2 opacity-80" />
                      <span className="font-bold text-xs">غلاف الكورس</span>
                    </div>
                  )}
                  <div className="absolute top-3.5 right-3.5 flex gap-2">
                    <span className={\`px-3 py-1 rounded-xl text-xs font-black backdrop-blur-md shadow-sm \${course.isPublished ? 'bg-emerald-600/90 text-white' : 'bg-slate-900/80 text-white'}\`}>
                      {course.isPublished ? 'منشور للطلاب' : 'مسودة (مغلق)'}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6">
                  {/* Badges */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black">
                      {course.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-black">
                      الصف {course.grade}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-xs font-black">
                      {course.educationType === 'general' ? 'عام' : 
                       course.educationType === 'azhar' ? 'أزهر' : 
                       course.educationType === 'arabic' ? 'عربي' : 'لغات'}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-slate-600 dark:text-slate-400 font-medium text-sm line-clamp-2 mb-4">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={\`font-black text-lg \${course.isFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-700 dark:text-emerald-400'}\`}>
                        {course.isFree ? 'مجاني بالكامل' : \`\${course.price} ج.م\`}
                      </span>
                      {!course.isFree && course.hasDiscount && course.originalPrice && course.originalPrice > course.price && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                          وفر {course.originalPrice - course.price} ج.م
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {course.publishDate ? \`نشر في: \${course.publishDate}\` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-6 pt-0 flex items-center gap-2">
                <Link 
                  href={\`/teacher/courses/\${course.id}\`}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-100 dark:shadow-none"
                >
                  <Eye className="w-4 h-4" />
                  إدارة المحتوى والوحدات
                </Link>
                
                {/* Duplicate button */}
                <button 
                  onClick={() => handleOpenDuplicate(course)}
                  title="نسخ الكورس لصف أو نظام آخر"
                  className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 text-slate-600 dark:text-slate-400 rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>

                {/* Delete button */}
                <button 
                  onClick={() => setCourseToDelete(course)}
                  title="حذف الكورس"
                  className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-400 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}`;

const replacement = `{filteredCourses.map((course, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              key={course.id}
              className="flex flex-col h-full"
            >
              <CourseCard 
                course={course}
                actionType="teacher_dashboard"
                onSelectCourse={() => {}}
                onDuplicate={() => handleOpenDuplicate(course)}
                onDelete={() => setCourseToDelete(course)}
              />
            </motion.div>
          ))}`;

const newContent = content.replace(target, replacement);
fs.writeFileSync('app/teacher/courses/page.tsx', newContent);
console.log("Patched!");
