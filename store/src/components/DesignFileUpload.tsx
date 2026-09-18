import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';

export interface UploadedDesign {
  file?: File;
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
  previewUrl?: string;
}

interface DesignFileUploadProps {
  value: UploadedDesign | null;
  onChange: (file: UploadedDesign | null) => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function compressImage(file: File, maxDim = 1200): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const DesignFileUpload: React.FC<DesignFileUploadProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setErrorMessage(null);

    // Maximum 25 MB
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage('حجم الملف كبير جداً (أقصى حد هو 25 ميغابايت). يمكنك إرساله عبر واتساب لاحقاً.');
      return;
    }

    let previewUrl: string | undefined = undefined;

    if (file.type.startsWith('image/')) {
      try {
        previewUrl = await compressImage(file, 1200);
      } catch (err) {
        console.warn('Could not compress image preview', err);
      }
    }

    onChange({
      file,
      name: file.name,
      size: file.size,
      sizeFormatted: formatBytes(file.size),
      type: file.type || 'document',
      previewUrl,
    });
  }, [onChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileExt = value ? value.name.split('.').pop()?.toUpperCase() || 'FILE' : '';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
          <UploadCloud className="w-4 h-4 text-blue-600" />
          <span>ملف الشعار أو التصميم الخاص بك (Logo / Design):</span>
        </label>
        <span className="text-[11px] text-slate-400 font-semibold">(اختياري)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.psd,.eps"
        onChange={handleInputChange}
        className="hidden"
      />

      {errorMessage && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!value ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/40'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-800">
            اضغط هنا لرفع ملف الشعار / التصميم أو اسحبه إلى هنا
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            ندعم ملفات: PNG, JPG, SVG, PDF, AI, PSD (حتى 25 ميغابايت)
          </p>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500/60 bg-emerald-50/40 flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {value.previewUrl ? (
              <div className="w-14 h-14 rounded-xl border border-emerald-300 overflow-hidden bg-white flex-shrink-0 shadow-sm">
                <img
                  src={value.previewUrl}
                  alt="Aperçu du logo"
                  className="w-full h-full object-contain p-1"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl border border-emerald-300 bg-white flex-shrink-0 flex flex-col items-center justify-center shadow-sm text-emerald-700">
                <FileText className="w-6 h-6" />
                <span className="text-[9px] font-black uppercase tracking-wider">{fileExt}</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-900 truncate block max-w-[180px] sm:max-w-[260px]">
                {value.name}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-slate-500 font-medium">{value.sizeFormatted}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تم الإرفاق بنجاح</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:border-blue-400 bg-white text-[11px] font-bold text-slate-700 hover:text-blue-600 shadow-sm transition-colors cursor-pointer"
            >
              تغيير
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
              title="حذف الملف"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reassuring note for users who do not have their file immediately */}
      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <span className="text-emerald-600 font-bold flex-shrink-0">💬 ملاحظة:</span>
        <span className="leading-relaxed">
          إذا لم يكن الشعار متوفراً لديك الآن، يمكنك تأكيد الطلب مباشرة وسيتصل بك مستشارنا لأخذه عبر <strong>الواتساب (WhatsApp)</strong> قبل بدء الطباعة أو التطريز.
        </span>
      </div>
    </div>
  );
};
