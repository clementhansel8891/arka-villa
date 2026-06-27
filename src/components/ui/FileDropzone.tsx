"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, CheckCircle } from "lucide-react";

interface FileDropzoneProps {
  /** Accepted MIME types */
  accept?: string;
  /** Max file size in bytes */
  maxSize?: number;
  /** Callback when file is selected */
  onFileSelect: (file: File | null) => void;
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
}

export default function FileDropzone({
  accept = ".pdf,.doc,.docx",
  maxSize = 10 * 1024 * 1024,
  onFileSelect,
  label = "Upload your CV",
  helpText = "PDF or Word, max 10MB",
}: FileDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (f: File): string | null => {
      if (f.size > maxSize) {
        return `File is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
      }
      const allowedExtensions = accept.split(",").map((e) => e.trim().toLowerCase());
      const fileExt = `.${f.name.split(".").pop()?.toLowerCase()}`;
      if (!allowedExtensions.includes(fileExt)) {
        return `Invalid file type. Accepted: ${accept}`;
      }
      return null;
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        setFile(null);
        onFileSelect(null);
        return;
      }
      setError(null);
      setFile(f);
      onFileSelect(f);
    },
    [validateFile, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile]
  );

  const removeFile = useCallback(() => {
    setFile(null);
    setError(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileSelect]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">
        {label}
      </label>

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200
            ${
              isDragOver
                ? "border-heritage-gold bg-heritage-gold/5"
                : "border-white/10 hover:border-heritage-gold/40 hover:bg-white/[0.02]"
            }
            ${error ? "border-red-400/40" : ""}
          `}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          aria-label="Drop your CV file here or click to browse"
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            aria-hidden="true"
          />

          <Upload
            size={24}
            className={`mx-auto mb-3 ${isDragOver ? "text-heritage-gold" : "text-white/20"}`}
          />

          <p className="text-white/50 text-sm">
            {isDragOver ? (
              <span className="text-heritage-gold font-medium">Drop file here</span>
            ) : (
              <>
                Drag & drop your file here, or{" "}
                <span className="text-heritage-gold underline">browse</span>
              </>
            )}
          </p>
          <p className="text-white/20 text-xs mt-1">{helpText}</p>
        </div>
      ) : (
        <div className="border border-heritage-gold/20 bg-heritage-gold/5 p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-heritage-gold shrink-0" />
          <FileText size={18} className="text-white/50 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate">{file.name}</p>
            <p className="text-white/30 text-xs">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeFile();
            }}
            className="text-white/30 hover:text-red-400 transition-colors shrink-0"
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
