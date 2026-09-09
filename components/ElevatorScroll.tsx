'use client';

import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ElevatorScroll() {
  const [sections, setSections] = useState<HTMLElement[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Gather all sections and main header/footer
    const updateSections = () => {
      const allSections = Array.from(document.querySelectorAll('section, header, footer')) as HTMLElement[];
      const validSections = allSections.filter(sec => sec.offsetHeight > 100); // Only significant sections
      setSections(validSections);
    };

    updateSections();
    // Re-check after a short delay to account for dynamic content rendering
    setTimeout(updateSections, 1000);

    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      // Determine which section is currently most visible
      const validSections = Array.from(document.querySelectorAll('section, header, footer')) as HTMLElement[];
      const filtered = validSections.filter(sec => sec.offsetHeight > 100);
      
      let closestIndex = 0;
      let minDistance = Infinity;

      filtered.forEach((sec, index) => {
        const rect = sec.getBoundingClientRect();
        const distance = Math.abs(rect.top);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      setCurrentSectionIndex(closestIndex);
      setSections(filtered);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (direction: 'up' | 'down') => {
    if (sections.length === 0) return;

    let targetIndex = currentSectionIndex;

    if (direction === 'up') {
      targetIndex = Math.max(0, currentSectionIndex - 1);
    } else {
      targetIndex = Math.min(sections.length - 1, currentSectionIndex + 1);
    }

    const targetSection = sections[targetIndex];
    if (targetSection) {
      const topOffset = targetSection.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: topOffset - 80, // Offset for fixed navbar
        behavior: 'smooth'
      });
      setCurrentSectionIndex(targetIndex);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
        >
          <button
            onClick={() => scrollToSection('up')}
            disabled={currentSectionIndex === 0}
            className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            aria-label="القسم السابق"
          >
            <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </button>
          <button
            onClick={() => scrollToSection('down')}
            disabled={currentSectionIndex === sections.length - 1}
            className="w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg shadow-violet-600/30 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            aria-label="القسم التالي"
          >
            <ChevronDown className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
