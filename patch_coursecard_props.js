const fs = require('fs');
const content = fs.readFileSync('components/CourseCard.tsx', 'utf-8');

const target1 = `interface CourseCardProps {
  course: CourseData | Course;
  isEnrolled?: boolean;
  onSelectCourse?: (course: Course, initialTab?: 'curriculum' | 'enroll') => void;
  batchYear?: string;
  actionType?: 'explore' | 'student_enrolled' | 'student_dashboard';
}`;

const replacement1 = `import { Eye, Copy, Trash2 } from 'lucide-react';

interface CourseCardProps {
  course: CourseData | Course;
  isEnrolled?: boolean;
  onSelectCourse?: (course: Course, initialTab?: 'curriculum' | 'enroll') => void;
  batchYear?: string;
  actionType?: 'explore' | 'student_enrolled' | 'student_dashboard' | 'teacher_dashboard';
  onDuplicate?: () => void;
  onDelete?: () => void;
}`;

let newContent = content.replace(target1, replacement1);

const target2 = `export default function CourseCard({
  course,
  isEnrolled = false,
  onSelectCourse,
  batchYear,
  actionType = 'explore'
}: CourseCardProps) {`;

const replacement2 = `export default function CourseCard({
  course,
  isEnrolled = false,
  onSelectCourse,
  batchYear,
  actionType = 'explore',
  onDuplicate,
  onDelete
}: CourseCardProps) {`;

newContent = newContent.replace(target2, replacement2);

fs.writeFileSync('components/CourseCard.tsx', newContent);
console.log("Patched CourseCard Props!");
