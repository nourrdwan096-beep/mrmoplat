const fs = require('fs');
const content = fs.readFileSync('components/ThemeToggle.tsx', 'utf-8');

const target = `{/* Radiating Sun Icon inside Knob */}
        <div className="relative flex items-center justify-center">
          {/* Outer Sun Rays */}
          <svg
            className={\`w-[22px] h-[22px] transition-transform duration-500 \${
              isDark ? 'rotate-90 text-amber-500' : 'rotate-0 text-[#ff7800]'
            }\`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            {/* Center Sun Disk */}
            <circle cx="12" cy="12" r="4.2" fill={isDark ? '#f59e0b' : '#ff9500'} stroke="none" />
            
            {/* Radiating Rays */}
            <line x1="12" y1="2" x2="12" y2="4.5" />
            <line x1="12" y1="19.5" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="6.1" y2="6.1" />
            <line x1="17.9" y1="17.9" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4.5" y2="12" />
            <line x1="19.5" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="6.1" y2="17.9" />
            <line x1="17.9" y1="6.1" x2="19.78" y2="4.22" />
          </svg>

          {/* Subtle inner face glow */}
          <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white/40 pointer-events-none" />
        </div>`;

const replacement = `{/* Animated Icons inside Knob */}
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Sun Icon (Light Mode) */}
          <div className={\`absolute inset-0 flex items-center justify-center transition-all duration-500 \${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}\`}>
             <svg className="w-[22px] h-[22px] text-[#ff7800]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <circle cx="12" cy="12" r="4.2" fill="#ff9500" stroke="none" />
                <line x1="12" y1="2" x2="12" y2="4.5" />
                <line x1="12" y1="19.5" x2="12" y2="22" />
                <line x1="4.22" y1="4.22" x2="6.1" y2="6.1" />
                <line x1="17.9" y1="17.9" x2="19.78" y2="19.78" />
                <line x1="2" y1="12" x2="4.5" y2="12" />
                <line x1="19.5" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78" x2="6.1" y2="17.9" />
                <line x1="17.9" y1="6.1" x2="19.78" y2="4.22" />
             </svg>
             <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white/40 pointer-events-none" />
          </div>

          {/* Moon Icon (Dark Mode) */}
          <div className={\`absolute inset-0 flex items-center justify-center transition-all duration-500 \${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}\`}>
            <svg className="w-[18px] h-[18px] text-[#1b1c3a]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>
        </div>`;

const newContent = content.replace(target, replacement);
fs.writeFileSync('components/ThemeToggle.tsx', newContent);
console.log("Patched!");
