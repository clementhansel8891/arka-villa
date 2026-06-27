'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Send, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DailyReport {
  id: string;
  date: string;
  content: string;
  submittedAt: string;
}

interface ReportsSectionProps {
  reports: DailyReport[];
  onSubmitReport: (content: string) => void;
}

const MAX_REPORT_LENGTH = 2000;

export default function ReportsSection({ reports, onSubmitReport }: ReportsSectionProps) {
  const [content, setContent] = useState('');
  const [showPrevious, setShowPrevious] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = content.trim().length > 0 && content.length <= MAX_REPORT_LENGTH;

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    onSubmitReport(content.trim());
    setContent('');
    setIsSubmitting(false);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} className="text-heritage-gold" />
        <h3 className="text-white font-semibold text-sm">Daily Reports</h3>
      </div>

      {/* Submit Report Form */}
      <div className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your daily activity report..."
          maxLength={MAX_REPORT_LENGTH}
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-heritage-gold/40 resize-none"
          aria-label="Daily activity report"
        />
        <div className="flex items-center justify-between mt-2">
          <span
            className={cn(
              'text-[11px]',
              content.length > MAX_REPORT_LENGTH * 0.9
                ? 'text-red-400'
                : 'text-white/30'
            )}
          >
            {content.length}/{MAX_REPORT_LENGTH}
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
              canSubmit
                ? 'bg-heritage-gold text-heritage-charcoal hover:bg-heritage-gold/90'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            <Send size={12} />
            Submit Report
          </motion.button>
        </div>
      </div>

      {/* Previous Reports */}
      <div>
        <button
          onClick={() => setShowPrevious(!showPrevious)}
          className="flex items-center gap-2 text-white/60 text-xs hover:text-white/80 transition-colors mb-2"
        >
          <Calendar size={12} />
          <span>This Month&apos;s Reports ({reports.length})</span>
          {showPrevious ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showPrevious && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="space-y-2 max-h-60 overflow-y-auto"
          >
            {reports.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-3">No reports submitted this month</p>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white/[0.03] border border-white/5 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/70 text-xs font-medium">{report.date}</span>
                    <span className="text-white/30 text-[10px]">{report.submittedAt}</span>
                  </div>
                  <p className="text-white/60 text-xs leading-relaxed line-clamp-3">
                    {report.content}
                  </p>
                </div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
