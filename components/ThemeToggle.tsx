'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'motion/react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Guard against SSR hydration mismatch
  if (!mounted) {
    return (
      <div 
        dir="ltr"
        className={`w-[84px] h-[40px] rounded-full bg-[#fa6952] p-[3px] flex items-center opacity-70 ${className}`}
        aria-hidden="true"
      >
        <div className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shadow-md">
          <div className="w-4 h-4 rounded-full bg-amber-400" />
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      dir="ltr"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      title={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      onClick={toggleTheme}
      id="futuristic-theme-toggle"
      className={`
        relative w-[86px] h-[42px] rounded-full p-[3px] cursor-pointer 
        select-none overflow-hidden transition-all duration-300
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400
        border-2 border-white/40 dark:border-slate-700/80 shadow-[0_3px_12px_rgba(0,0,0,0.18)]
        ${className}
      `}
    >
      {/* Background Dual Artwork Container (Sunset Ocean on Left, Starry Night on Right) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none flex">
        {/* Left Half: Sunset Ocean with Warm Sky and Water Reflections */}
        <div className="relative w-1/2 h-full bg-gradient-to-b from-[#ff7a59] via-[#ff6547] to-[#e84a2d] overflow-hidden">
          {/* Subtle clouds */}
          <div className="absolute top-1 left-2 w-6 h-2 bg-white/25 rounded-full blur-[0.5px]" />
          <div className="absolute top-3 left-4 w-4 h-1.5 bg-white/20 rounded-full blur-[0.5px]" />
          
          {/* Setting sun glow on horizon */}
          <div className="absolute bottom-2.5 left-3 w-5 h-5 rounded-full bg-[#ffe082] blur-[1px] opacity-90" />
          <div className="absolute bottom-3 left-3.5 w-4 h-4 rounded-full bg-white opacity-95" />

          {/* Ocean Water surface with horizontal reflection lines */}
          <div className="absolute bottom-0 inset-x-0 h-[10px] bg-gradient-to-b from-[#d9381e] to-[#a82410] border-t border-amber-200/50">
            <div className="absolute top-0.5 left-2 w-7 h-[1px] bg-amber-200/80" />
            <div className="absolute top-1.5 left-3.5 w-4 h-[1px] bg-amber-100/90" />
            <div className="absolute top-2 left-4 w-3 h-[1px] bg-amber-200/60" />
          </div>
        </div>

        {/* Right Half: Deep Night Sky with Crescent Moon and Sparkling Stars */}
        <div className="relative w-1/2 h-full bg-gradient-to-b from-[#1b1c3a] via-[#161730] to-[#0d0e20] overflow-hidden">
          {/* Crescent Moon */}
          <div className="absolute top-2 right-3">
            <svg className="w-4 h-4 text-[#f0f4f8] drop-shadow-[0_0_3px_rgba(255,255,255,0.7)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>

          {/* Sparkling 4-point Stars */}
          <div className="absolute top-1.5 right-8">
            <svg className="w-2.5 h-2.5 text-amber-200 drop-shadow-[0_0_2px_rgba(253,230,138,0.8)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>

          <div className="absolute bottom-2.5 right-6">
            <svg className="w-2 h-2 text-white/90" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>

          {/* Tiny twinkling stars */}
          <span className="absolute top-5 right-2 w-0.5 h-0.5 bg-white rounded-full opacity-90" />
          <span className="absolute top-6 right-7 w-1 h-1 bg-amber-100 rounded-full opacity-80" />
          <span className="absolute bottom-1 right-2.5 w-0.5 h-0.5 bg-white/70 rounded-full" />
        </div>

        {/* Soft Divider Horizon Blend */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[6px] bg-gradient-to-r from-transparent via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Sliding Knob (White circle with radiant cheerful sun inside) */}
      <motion.div
        animate={{
          x: isDark ? 44 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 28,
        }}
        className="relative z-10 w-[34px] h-[34px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center border border-slate-100/90"
      >
        {/* Animated Icons inside Knob */}
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Sun Icon (Light Mode) */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}>
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
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}>
            <svg className="w-[18px] h-[18px] text-amber-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>
        </div>
      </motion.div>
    </button>
  );
}
