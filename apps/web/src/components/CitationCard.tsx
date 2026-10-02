'use client';

import { useState } from 'react';
import type { CitationDTO } from '@medi-bud/contracts';
import { BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface CitationCardProps {
  citation: CitationDTO;
}

export function CitationCard({ citation }: CitationCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-subtle) overflow-hidden text-xs transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <BookOpen className="w-3.5 h-3.5 text-(--primary) shrink-0" />
          <span className="font-medium text-(--text-primary) truncate">
            {citation.title}
          </span>
          {citation.page && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-(--text-secondary) shrink-0">
              Page {citation.page}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-(--text-muted) shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-(--text-muted) shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-2.5 pt-1 border-t border-(--border-subtle) space-y-1 bg-white">
          <p className="text-[11px] font-medium text-(--text-muted)">
            Source Excerpt ({citation.date || 'Active Archive'}):
          </p>
          <blockquote className="italic text-[11px] text-(--text-secondary) border-l-2 border-(--primary) pl-2 py-0.5">
            &ldquo;{citation.excerpt}&rdquo;
          </blockquote>
        </div>
      )}
    </div>
  );
}
