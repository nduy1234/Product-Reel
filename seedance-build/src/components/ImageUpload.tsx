"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, ImageIcon, CheckCircle2 } from "lucide-react";
import { cn, compressImage } from "@/lib/utils";

interface ImageUploadProps {
  onImageSelected: (base64: string, preview: string) => void;
  onImageCleared: () => void;
  preview: string | null;
  disabled?: boolean;
}

export default function ImageUpload({
  onImageSelected,
  onImageCleared,
  preview,
  disabled = false,
}: ImageUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError(null);
      setIsProcessing(true);

      try {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Image must be smaller than 10 MB");
        }

        // Compress to max 1024 px / JPEG 0.82 — keeps payload under gateway limits
        const base64 = await compressImage(file);
        const previewUrl = URL.createObjectURL(file);
        onImageSelected(base64, previewUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load image");
      } finally {
        setIsProcessing(false);
      }
    },
    [onImageSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    disabled: disabled || isProcessing,
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    onImageCleared();
  };

  // ── Preview state ─────────────────────────────────────────
  if (preview) {
    return (
      <div className="relative group animate-fade-in">
        <div className="relative w-full aspect-[9/16] max-w-[200px] mx-auto rounded-2xl overflow-hidden ring-2 ring-brand-500/50 shadow-lg shadow-brand-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Product"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <div className="flex items-center gap-1 bg-brand-500/20 backdrop-blur-sm rounded-lg px-2 py-1">
              <CheckCircle2 className="w-3 h-3 text-brand-400 flex-shrink-0" />
              <span className="text-xs text-brand-300 truncate">Image ready</span>
            </div>
          </div>
        </div>

        {!disabled && (
          <button
            onClick={handleClear}
            className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg transition-colors"
            title="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // ── Drop zone state ───────────────────────────────────────
  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "relative w-full aspect-[9/16] max-w-[200px] mx-auto rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer",
          "flex flex-col items-center justify-center gap-3 p-4 text-center",
          isDragActive
            ? "border-brand-400 bg-brand-500/10 scale-[1.02]"
            : "border-surface-border hover:border-brand-500/60 hover:bg-brand-500/5",
          disabled || isProcessing
            ? "opacity-50 cursor-not-allowed"
            : "hover:scale-[1.01]"
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            isDragActive
              ? "bg-brand-500/20 text-brand-400"
              : "bg-surface-border/50 text-slate-400"
          )}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          ) : isDragActive ? (
            <Upload className="w-6 h-6" />
          ) : (
            <ImageIcon className="w-6 h-6" />
          )}
        </div>

        {isProcessing ? (
          <p className="text-xs text-slate-400">Processing…</p>
        ) : isDragActive ? (
          <p className="text-sm font-medium text-brand-400">Drop it here</p>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-slate-300">
                Drop product image
              </p>
              <p className="text-xs text-slate-500 mt-0.5">or click to browse</p>
            </div>
            <p className="text-[10px] text-slate-600">
              PNG, JPG, WEBP · max 10 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 text-center animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
