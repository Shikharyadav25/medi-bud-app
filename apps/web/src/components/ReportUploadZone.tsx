'use client';

import { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface ReportUploadZoneProps {
  onUploadSuccess: (reportId: string, filename: string) => void;
  onUploadError?: (error: string) => void;
  uploadFn: (file: File) => Promise<{ report_id: string; status: string }>;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function ReportUploadZone({
  onUploadSuccess,
  onUploadError,
  uploadFn,
}: ReportUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFileSignature = async (file: File): Promise<boolean> => {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return true;
    }
    // PNG magic bytes: \x89PNG (0x89 0x50 0x4E 0x47)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return true;
    }
    // JPEG magic bytes: \xFF\xD8\xFF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return true;
    }
    return false;
  };

  const handleProcessFile = async (file: File) => {
    setErrorMessage(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const err = 'File size exceeds maximum permitted limit of 10MB.';
      setErrorMessage(err);
      onUploadError?.(err);
      return;
    }

    const isValidFormat = await validateFileSignature(file);
    if (!isValidFormat) {
      const err = 'Unrecognized file header. Only authentic PDF, PNG, or JPEG lab reports are accepted.';
      setErrorMessage(err);
      onUploadError?.(err);
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFn(file);
      onUploadSuccess(result.report_id, file.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please verify network connectivity.';
      setErrorMessage(msg);
      onUploadError?.(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-(--primary) bg-(--primary-surface)'
            : 'border-(--border-medium) hover:border-(--primary) bg-(--surface)'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-(--primary-surface) text-(--primary) rounded-xl">
            {isUploading ? (
              <FileText className="w-7 h-7 animate-pulse" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-(--text-primary)">
              {isUploading ? 'Validating & Uploading Report...' : 'Upload Lab Report (PDF, PNG, JPEG)'}
            </p>
            <p className="text-xs text-(--text-muted) mt-1">
              Drag & drop or click to browse. Max 10MB, up to 20 pages.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
