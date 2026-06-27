'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FileText, X, CheckCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from './TaskList';

interface TaskCompletionProps {
  task: Task;
  onSubmit: (taskId: string, evidence: TaskEvidence) => void;
  onCancel: () => void;
}

export interface TaskEvidence {
  type: 'photo' | 'note';
  photo?: File | null;
  note?: string;
}

export default function TaskCompletion({ task, onSubmit, onCancel }: TaskCompletionProps) {
  const [evidenceType, setEvidenceType] = useState<'photo' | 'note'>('photo');
  const [photo, setPhoto] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    (evidenceType === 'photo' && photo !== null) ||
    (evidenceType === 'note' && note.trim().length > 0);

  function handleSubmit() {
    if (!canSubmit) {
      setError(
        evidenceType === 'photo'
          ? 'Please attach a photo as evidence.'
          : 'Please enter a note as evidence.'
      );
      return;
    }
    setError('');
    onSubmit(task.id, {
      type: evidenceType,
      photo: evidenceType === 'photo' ? photo : null,
      note: evidenceType === 'note' ? note : undefined,
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setError('');
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-heritage-charcoal border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-base">Complete Task</h3>
            <button
              onClick={onCancel}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Task Info */}
          <div className="bg-white/5 rounded-lg p-3 mb-4">
            <p className="text-white text-sm font-medium">{task.title}</p>
            <p className="text-white/40 text-xs mt-1">Deadline: {task.deadline}</p>
          </div>

          {/* Evidence Requirement Notice */}
          <p className="text-white/60 text-xs mb-3">
            Evidence is required to mark this task as completed. Provide at least one photo or a note.
          </p>

          {/* Evidence Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setEvidenceType('photo'); setError(''); }}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors',
                evidenceType === 'photo'
                  ? 'bg-heritage-gold/20 text-heritage-gold border-heritage-gold/30'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white/70'
              )}
            >
              <Camera size={14} />
              Photo
            </button>
            <button
              onClick={() => { setEvidenceType('note'); setError(''); }}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors',
                evidenceType === 'note'
                  ? 'bg-heritage-gold/20 text-heritage-gold border-heritage-gold/30'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white/70'
              )}
            >
              <FileText size={14} />
              Note
            </button>
          </div>

          {/* Evidence Input */}
          {evidenceType === 'photo' ? (
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload photo evidence"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center gap-2 hover:border-heritage-gold/40 transition-colors"
              >
                {photo ? (
                  <>
                    <CheckCircle size={24} className="text-green-400" />
                    <span className="text-white/70 text-xs">{photo.name}</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="text-white/30" />
                    <span className="text-white/40 text-xs">Tap to take or upload photo</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <textarea
                value={note}
                onChange={(e) => { setNote(e.target.value); setError(''); }}
                placeholder="Describe what was done..."
                maxLength={500}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-heritage-gold/40 resize-none"
                aria-label="Completion note"
              />
              <p className="text-white/30 text-[10px] mt-1 text-right">
                {note.length}/500
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs mb-3">{error}</p>
          )}

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full py-3 rounded-lg font-semibold text-sm transition-colors',
              canSubmit
                ? 'bg-heritage-gold text-heritage-charcoal hover:bg-heritage-gold/90'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            Mark as Completed
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
