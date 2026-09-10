import {
  Smartphone,
  Layers,
  Lock,
  Award,
  ShieldBan,
  FileText,
  BadgeCheck,
  AlertTriangle
} from 'lucide-react';

export const PLATFORM_POLICIES_DATA = [
  {
    id: '1',
    articleNumber: 'مادة رقم (١)',
    category: 'الأمان والتوثيق',
    title: 'تأمين تسجيل الأجهزة',
    summary: 'لا يُسمح بتسجيل الدخول من نفس الجهاز مرتين لضمان حماية الحسابات.',
    icon: Smartphone,
    badge: 'حماية متقدمة',
    details: ['تسجيل دخول وحيد', 'بصمة الجهاز الرقمية', 'أمان متقدم'],
    content: (
      <>
        <h4 className="font-bold text-slate-900 dark:text-white mb-2">1- سياسة الجهاز الواحد:</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          حرصاً على أمان بيانات الطلاب وضمان حقوق المنصة، لا يُسمح نهائياً للطالب بتسجيل الدخول أو محاولة إنشاء حساب جديد من نفس الجهاز إذا تم استخدامه مسبقاً في عملية تسجيل ناجحة.
        </p>
        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-2 mb-4">
          <li>يقوم النظام بربط &quot;البصمة الرقمية&quot; للجهاز (Device Fingerprint) بحساب الطالب.</li>
          <li>في حالة محاولة تسجيل الدخول من جهاز آخر مختلف تماماً، قد يطلب النظام التحقق الأمني الإضافي.</li>
          <li>الهدف من هذا الإجراء هو منع تداول الحسابات بين أكثر من طالب.</li>
        </ul>
      </>
    )
  },
  {
    id: '2',
    articleNumber: 'مادة رقم (٢)',
    category: 'الأمان والتوثيق',
    title: 'حفظ وتأمين البيانات',
    summary: 'حماية وتشفير تام لكافة بياناتك الأكاديمية والشخصية.',
    icon: Lock,
    badge: 'تشفير كامل',
    details: ['تشفير البيانات', 'Supabase Security', 'خصوصية الطلاب'],
    content: (
      <>
        <h4 className="font-bold text-slate-900 dark:text-white mb-2">2- الخصوصية والأمان:</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          نحتفظ بجميع بياناتك بشكل آمن ومشفر داخل قواعد بيانات (Supabase). يرجى الاحتفاظ بكلمة المرور الخاصة بك في مكان آمن وعدم مشاركتها مع أي شخص.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          لا يملك أي شخص صلاحية الدخول لحسابك سوى مستر محمد رضوان للضرورة الأكاديمية والتقنية (عبر مفتاح أمان رئيسي مُشفر).
        </p>
      </>
    )
  },
  {
    id: '3',
    articleNumber: 'مادة رقم (٣)',
    category: 'النظام الأكاديمي والامتحانات',
    title: 'تتبع تقدم الطالب',
    summary: 'لا يمكن الانتقال لفيديو جديد قبل اجتياز التقييمات السابقة.',
    icon: Layers,
    badge: 'نظام إلزامي',
    details: ['تدرج أكاديمي', 'تقييم مستمر', 'درجات النجاح'],
    content: (
      <>
        <h4 className="font-bold text-slate-900 dark:text-white mb-2">3- نظام التدرج الأكاديمي:</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          لضمان الفهم الكامل للمحتوى، تم تصميم النظام بحيث لا يستطيع الطالب فتح أو مشاهدة أي فيديو جديد إلا بعد اجتياز (الواجب / الامتحان) الخاص بالفيديو الذي يسبقه.
        </p>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
          <p className="text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            تنبيه: يجب الحصول على درجة النجاح المحددة لكل تقييم حتى يفتح لك المحتوى التالي.
          </p>
        </div>
      </>
    )
  },
  {
    id: '4',
    articleNumber: 'مادة رقم (٤)',
    category: 'النظام الأكاديمي والامتحانات',
    title: 'الشهادات والاعتماد',
    summary: 'يتم منح شهادات تقدير وشارات تميز للطلاب المتفوقين.',
    icon: Award,
    badge: 'تحفيز مستمر',
    details: ['شهادات تقدير', 'لوحة الشرف', 'التميز الأكاديمي'],
    content: (
      <>
        <h4 className="font-bold text-slate-900 dark:text-white mb-2">4- التكريم والتقدير:</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          يحصل الطلاب المتفوقون الذين يلتزمون بحل الواجبات واجتياز الامتحانات الشاملة بدرجات عالية على شهادات تقدير موثقة من المنصة، بالإضافة إلى تكريمهم في قائمة الشرف بالصفحة الرئيسية.
        </p>
      </>
    )
  },
  {
    id: '5',
    articleNumber: 'مادة رقم (٥)',
    category: 'العقوبات واللوائح التأديبية',
    title: 'حظر الأجهزة المخالفة',
    summary: 'أي محاولة تلاعب أو اختراق تؤدي لحظر الجهاز نهائياً.',
    icon: ShieldBan,
    badge: 'إجراء صارم',
    details: ['حظر الجهاز النهائي', 'مكافحة التلاعب', 'المساءلة'],
    content: (
      <>
        <h4 className="font-bold text-slate-900 dark:text-white mb-2">5- سياسة الحظر المتقدمة:</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          المنصة مزودة بأنظمة حماية فائقة التطور لرصد أي محاولة للتحايل أو الاختراق (مثل تسجيل الشاشة، مشاركة الحسابات، الهجمات السيبرانية). في حالة ثبوت ذلك، يتم فرض (حظر على مستوى الجهاز / الأجهزة) نهائياً.
        </p>
        <p className="text-sm text-red-600 dark:text-red-400 font-bold leading-relaxed">
          الجهاز المحظور لن يتمكن من فتح المنصة مجدداً حتى ولو حاول إنشاء حساب ببيانات مختلفة. (إلا إذا تم فك الحظر بواسطة الإدارة).
        </p>
      </>
    )
  },
  {
    id: '6',
    articleNumber: 'مادة رقم (٦)',
    category: 'حماية المحتوى والملكية',
    title: 'تأمين مقاطع الفيديو',
    summary: 'حماية متطورة لمنع التحميل أو تسجيل الشاشة مع ظهور بياناتك.',
    icon: FileText,
    badge: 'حماية فكرية',
    details: ['حماية الفيديوهات', 'علامات مائية', 'مشفر'],
    content: (
      <>
        <h4 className="font-bold text-slate-900 dark:text-white mb-2">6- حماية حقوق الملكية:</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          تعمل جميع مقاطع الفيديو داخل مشغل داخلي محمي (Secured Player). يتم إخفاء الروابط الأصلية تماماً ولا يمكن الوصول إليها.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          أثناء عرض الفيديو، سيظهر (رقم هاتفك + المعرف الخاص بك) بشكل شفاف ومتحرك لمنع أي محاولة لتسجيل الشاشة. في حالة تسريب الفيديو سيتم التعرف على مسربه فوراً وتطبيق الحظر النهائي والإجراءات التأديبية.
        </p>
      </>
    )
  },
  {
    id: '7',
    articleNumber: 'مادة رقم (٧)',
    category: 'الاشتراكات والدراسة',
    title: 'أكواد الشراء والاشتراكات',
    summary: 'الاشتراك في الكورسات المدفوعة يتم عبر رصيد المحفظة أو فوري.',
    icon: BadgeCheck,
    badge: 'معاملات مالية',
    details: ['محفظة الطالب', 'الدفع عبر فوري', 'الكورسات المدفوعة'],
    content: (
      <>
        <h4 className="font-bold text-slate-900 dark:text-white mb-2">7- سياسة الدفع المعتمدة:</h4>
        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-2 mb-4">
          <li>يمكنك شحن رصيد في محفظتك الإلكترونية واستخدامه لشراء الكورسات.</li>
          <li>يمكن شراء الكورسات عبر أكواد الدفع التي يوفرها المعلم.</li>
          <li>الاشتراك في الكورس يفتح لك المحتوى من خلال جهازين كحد أقصى يتم تسجيلهما كأجهزة معتمدة لك. المحاولة من جهاز ثالث ستُرفض.</li>
        </ul>
      </>
    )
  }
];
