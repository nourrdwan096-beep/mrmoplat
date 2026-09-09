// Ready-made English Course Cover SVG Templates
// High-contrast, futuristic 2030 design tailored for Mr. Mohamed Radwan

export interface CourseCoverTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: 'high' | 'middle' | 'azhar' | 'general' | 'revision';
  previewColor: string;
  dataUrl: string;
}

function createSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export const ENGLISH_COURSE_TEMPLATES: CourseCoverTemplate[] = [
  {
    id: 'tpl_grammar_mastery',
    name: 'قالب القواعد والجرامر الذهبي',
    nameEn: 'English Grammar Mastery',
    category: 'general',
    previewColor: '#059669',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
        <defs>
          <linearGradient id="bg_grammar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#022c22"/>
            <stop offset="50%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="gold_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
          <radialGradient id="glow_circle" cx="80%" cy="20%" r="60%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#022c22" stop-opacity="0"/>
          </radialGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="675" fill="url(#bg_grammar)"/>
        <circle cx="950" cy="150" r="400" fill="url(#glow_circle)"/>
        <circle cx="150" cy="550" r="300" fill="url(#glow_circle)"/>

        <!-- Grid Pattern Decor -->
        <g stroke="#10b981" stroke-opacity="0.08" stroke-width="1.5">
          <line x1="0" y1="135" x2="1200" y2="135"/>
          <line x1="0" y1="270" x2="1200" y2="270"/>
          <line x1="0" y1="405" x2="1200" y2="405"/>
          <line x1="0" y1="540" x2="1200" y2="540"/>
          <line x1="240" y1="0" x2="240" y2="675"/>
          <line x1="480" y1="0" x2="480" y2="675"/>
          <line x1="720" y1="0" x2="720" y2="675"/>
          <line x1="960" y1="0" x2="960" y2="675"/>
        </g>

        <!-- Top Badge -->
        <g transform="translate(80, 80)">
          <rect width="280" height="46" rx="23" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="1.5"/>
          <text x="140" y="28" fill="#34d399" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="2">MR. MOHAMED RADWAN</text>
        </g>

        <!-- Main Title -->
        <text x="80" y="240" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" letter-spacing="-1">ENGLISH GRAMMAR</text>
        <text x="80" y="320" fill="url(#gold_grad)" font-family="system-ui, -apple-system, sans-serif" font-size="70" font-weight="900" letter-spacing="1">MASTERY COURSE</text>

        <!-- Arabic Subtitle -->
        <text x="80" y="400" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700">شرح القواعد والتراكيب اللغوية من التأسيس حتى الاحتراف</text>

        <!-- Features Badges -->
        <g transform="translate(80, 480)">
          <rect width="180" height="48" rx="14" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="1.5"/>
          <text x="90" y="30" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">شرح تفصيلي ✦</text>

          <rect x="200" width="180" height="48" rx="14" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="1.5"/>
          <text x="290" y="30" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">واجبات أسبوعية 📝</text>

          <rect x="400" width="180" height="48" rx="14" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="1.5"/>
          <text x="490" y="30" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">امتحانات مؤمنة 🔒</text>
        </g>

        <!-- Year / Quality Watermark -->
        <g transform="translate(1000, 520)">
          <circle cx="70" cy="50" r="55" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="2"/>
          <text x="70" y="44" fill="#34d399" font-family="system-ui, sans-serif" font-size="22" font-weight="900" text-anchor="middle">2026</text>
          <text x="70" y="66" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">EDITION</text>
        </g>
      </svg>
    `)
  },
  {
    id: 'tpl_highschool_revision',
    name: 'قالب مراجعة الثانوية العامة الشاملة',
    nameEn: 'High School Final Revision',
    category: 'revision',
    previewColor: '#0284c7',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
        <defs>
          <linearGradient id="bg_sec" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#082f49"/>
            <stop offset="50%" stop-color="#0369a1"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
          <linearGradient id="cyan_glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#818cf8"/>
          </linearGradient>
        </defs>
        
        <rect width="1200" height="675" fill="url(#bg_sec)"/>
        
        <path d="M800,-100 L1300,400 L1100,750 Z" fill="#38bdf8" fill-opacity="0.08"/>

        <!-- Top Tag -->
        <g transform="translate(80, 80)">
          <rect width="240" height="42" rx="21" fill="#38bdf8" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.5"/>
          <text x="120" y="26" fill="#bae6fd" font-family="system-ui, sans-serif" font-size="15" font-weight="800" text-anchor="middle" letter-spacing="1">SECONDARY STAGE</text>
        </g>

        <!-- Main Title -->
        <text x="80" y="230" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="62" font-weight="900">HIGH SCHOOL</text>
        <text x="80" y="310" fill="url(#cyan_glow)" font-family="system-ui, -apple-system, sans-serif" font-size="66" font-weight="900">FINAL REVISION</text>

        <!-- Subtitle -->
        <text x="80" y="390" fill="#e0f2fe" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700">المراجعة النهائية ولم المتراكم - عام وأزهر</text>

        <!-- Footer Info -->
        <g transform="translate(80, 480)">
          <rect width="320" height="50" rx="15" fill="#0369a1" fill-opacity="0.4" stroke="#38bdf8" stroke-width="1.5"/>
          <text x="160" y="31" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="800" text-anchor="middle">MR. MOHAMED RADWAN ⚡</text>
        </g>
      </svg>
    `)
  },
  {
    id: 'tpl_azhar_excellence',
    name: 'قالب إنجليزي الأزهر الشريف',
    nameEn: 'Azhar English Excellence',
    category: 'azhar',
    previewColor: '#0d9488',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
        <defs>
          <linearGradient id="bg_azhar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#134e4a"/>
            <stop offset="60%" stop-color="#115e59"/>
            <stop offset="100%" stop-color="#042f2e"/>
          </linearGradient>
          <linearGradient id="azhar_gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#eab308"/>
          </linearGradient>
        </defs>

        <rect width="1200" height="675" fill="url(#bg_azhar)"/>

        <!-- Emblem Decor -->
        <circle cx="1020" cy="337" r="240" fill="none" stroke="#2dd4bf" stroke-opacity="0.15" stroke-width="3" stroke-dasharray="10 15"/>
        <circle cx="1020" cy="337" r="180" fill="none" stroke="#fde047" stroke-opacity="0.15" stroke-width="2"/>

        <g transform="translate(80, 80)">
          <rect width="250" height="44" rx="22" fill="#14b8a6" fill-opacity="0.25" stroke="#2dd4bf" stroke-width="1.5"/>
          <text x="125" y="27" fill="#99f6e4" font-family="system-ui, sans-serif" font-size="15" font-weight="800" text-anchor="middle">منهج الأزهر الشريف 🕌</text>
        </g>

        <text x="80" y="235" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="900">AZHAR ENGLISH</text>
        <text x="80" y="315" fill="url(#azhar_gold)" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900">EXCELLENCE SERIES</text>

        <text x="80" y="395" fill="#ccfbf1" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700">شرح مبسط لمنهج اللغة الإنجليزية لطلاب الأزهر الشريف</text>

        <g transform="translate(80, 480)">
          <rect width="280" height="50" rx="16" fill="#042f2e" stroke="#2dd4bf" stroke-width="1.5"/>
          <text x="140" y="31" fill="#fef08a" font-family="system-ui, sans-serif" font-size="17" font-weight="900" text-anchor="middle">مستر محمد رضوان</text>
        </g>
      </svg>
    `)
  },
  {
    id: 'tpl_middle_school',
    name: 'قالب المرحلة الإعدادية (عربي ولغات)',
    nameEn: 'Middle School English Pro',
    category: 'middle',
    previewColor: '#4f46e5',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
        <defs>
          <linearGradient id="bg_mid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#312e81"/>
            <stop offset="50%" stop-color="#4338ca"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="neon_pink" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f472b6"/>
            <stop offset="100%" stop-color="#38bdf8"/>
          </linearGradient>
        </defs>

        <rect width="1200" height="675" fill="url(#bg_mid)"/>

        <g transform="translate(80, 80)">
          <rect width="240" height="42" rx="21" fill="#818cf8" fill-opacity="0.25" stroke="#a5b4fc" stroke-width="1.5"/>
          <text x="120" y="26" fill="#e0e7ff" font-family="system-ui, sans-serif" font-size="15" font-weight="800" text-anchor="middle">المرحلة الإعدادية 🎓</text>
        </g>

        <text x="80" y="235" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="58" font-weight="900">MIDDLE SCHOOL</text>
        <text x="80" y="315" fill="url(#neon_pink)" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900">ENGLISH PRO FOUNDATION</text>

        <text x="80" y="395" fill="#c7d2fe" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700">تأسيس وشرح المنهج خطوة بخطوة - الصف الأول، الثاني، الثالث</text>

        <g transform="translate(80, 480)">
          <rect width="320" height="50" rx="16" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.5"/>
          <text x="160" y="31" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="800" text-anchor="middle">EASY ENGLISH - MR. RADWAN</text>
        </g>
      </svg>
    `)
  },
  {
    id: 'tpl_vocab_skills',
    name: 'قالب الكلمات والمهارات والترجمة',
    nameEn: 'Vocabulary & Writing Skills',
    category: 'general',
    previewColor: '#7c3aed',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
        <defs>
          <linearGradient id="bg_vocab" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4c1d95"/>
            <stop offset="50%" stop-color="#6d28d9"/>
            <stop offset="100%" stop-color="#18181b"/>
          </linearGradient>
          <linearGradient id="amber_flare" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
        </defs>

        <rect width="1200" height="675" fill="url(#bg_vocab)"/>

        <g transform="translate(80, 80)">
          <rect width="260" height="42" rx="21" fill="#a78bfa" fill-opacity="0.25" stroke="#c4b5fd" stroke-width="1.5"/>
          <text x="130" y="26" fill="#ede9fe" font-family="system-ui, sans-serif" font-size="15" font-weight="800" text-anchor="middle">SKILLS & TRANSLATION ✍️</text>
        </g>

        <text x="80" y="235" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="58" font-weight="900">VOCABULARY & IDIOMS</text>
        <text x="80" y="315" fill="url(#amber_flare)" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900">ADVANCED WRITING</text>

        <text x="80" y="395" fill="#ddd6fe" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700">كورس مهارات الترجمة، المقال، واشتقاقات الكلمات</text>

        <g transform="translate(80, 480)">
          <rect width="300" height="50" rx="16" fill="#2e1065" stroke="#a78bfa" stroke-width="1.5"/>
          <text x="150" y="31" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="800" text-anchor="middle">SUPER ADVANCED LEVEL 🚀</text>
        </g>
      </svg>
    `)
  },
  {
    id: 'tpl_exam_buster',
    name: 'قالب بنك الامتحانات والأسئلة الشاملة',
    nameEn: 'Comprehensive Exam Buster',
    category: 'revision',
    previewColor: '#e11d48',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
        <defs>
          <linearGradient id="bg_exam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#881337"/>
            <stop offset="50%" stop-color="#be123c"/>
            <stop offset="100%" stop-color="#09090b"/>
          </linearGradient>
          <linearGradient id="gold_strike" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#facc15"/>
            <stop offset="100%" stop-color="#fb923c"/>
          </linearGradient>
        </defs>

        <rect width="1200" height="675" fill="url(#bg_exam)"/>

        <g transform="translate(80, 80)">
          <rect width="250" height="42" rx="21" fill="#fb7185" fill-opacity="0.25" stroke="#fecdd3" stroke-width="1.5"/>
          <text x="125" y="26" fill="#ffe4e6" font-family="system-ui, sans-serif" font-size="15" font-weight="800" text-anchor="middle">EXAM BANK 2026 🎯</text>
        </g>

        <text x="80" y="235" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="62" font-weight="900">COMPREHENSIVE</text>
        <text x="80" y="315" fill="url(#gold_strike)" font-family="system-ui, -apple-system, sans-serif" font-size="66" font-weight="900">EXAM BUSTER</text>

        <text x="80" y="395" fill="#ffe4e6" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700">أكثر من ١٠٠٠ سؤال بنظام التقييم الإلكتروني الجديد</text>

        <g transform="translate(80, 480)">
          <rect width="320" height="50" rx="16" fill="#4c0519" stroke="#fb7185" stroke-width="1.5"/>
          <text x="160" y="31" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="800" text-anchor="middle">تدريب مكثف واختبارات مؤمنة</text>
        </g>
      </svg>
    `)
  }
];
