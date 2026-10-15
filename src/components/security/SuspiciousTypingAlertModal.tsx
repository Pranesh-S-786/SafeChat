import React, { useState, useRef } from 'react';
import { AlertTriangle, ShieldCheck, X, Video, Image as ImageIcon, CheckCircle2, Upload } from 'lucide-react';
import { extractFaceDescriptorFromImageFile } from '../../lib/faceVerification';

interface SuspiciousTypingAlertModalProps {
  isOpen: boolean;
  senderName: string;
  count: number;
  onAssignTest: (customVector?: number[], photoPreview?: string) => void;
  onCancel: () => void;
}

export const SuspiciousTypingAlertModal: React.FC<SuspiciousTypingAlertModalProps> = ({
  isOpen,
  senderName,
  count,
  onAssignTest,
  onCancel,
}) => {
  const [isPhotoSelected, setIsPhotoSelected] = useState<boolean>(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDescriptor, setPhotoDescriptor] = useState<number[] | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setPhotoError(null);

    try {
      const { descriptor, previewUrl } = await extractFaceDescriptorFromImageFile(file);
      setPhotoDescriptor(descriptor);
      setPhotoPreview(previewUrl);
      setIsPhotoSelected(true);
    } catch (err) {
      console.error('Error processing photo:', err);
      setPhotoError('Could not detect clear face landmarks in the selected photo. Try another image.');
      setIsPhotoSelected(false);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSendCustomPhotoTest = () => {
    if (!photoDescriptor || !photoPreview) return;
    onAssignTest(photoDescriptor, photoPreview);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Security Alert: Typing Rhythm Anomaly
              </h3>
              <p className="text-xs text-rose-600 font-semibold">
                {count} Suspicious Messages Detected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <div className="rounded-2xl bg-rose-50/60 border border-rose-100 p-3.5 text-xs text-slate-700 leading-relaxed space-y-1.5">
          <p>
            SafeChat detected <strong className="text-rose-900 font-semibold">{count} consecutive messages</strong> from{' '}
            <strong className="text-slate-900 font-semibold">{senderName}</strong> with an anomalous typing speed and rhythm.
          </p>
          <p className="text-[11px] text-slate-500">
            Choose how you would like to verify their identity before continuing the conversation:
          </p>
        </div>

        {/* Hidden File Input for Custom Photo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {/* Action Options */}
        <div className="space-y-2.5 pt-1">
          {/* Option 1: Standard Stored Baseline Face Test */}
          <button
            type="button"
            onClick={() => onAssignTest()}
            className="flex w-full items-center justify-between rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Video className="h-4 w-4 shrink-0" />
              <div>
                <div>Assign Face Test to {senderName}</div>
                <div className="text-[10px] font-normal text-emerald-100">
                  Matches live camera against their stored baseline profile
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold">Standard →</span>
          </button>

          {/* Option 2: Test Sender with Custom Reference Photo */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">
                  Test Sender with a Reference Photo
                </span>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingPhoto}
                className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <Upload className="h-3 w-3" />
                <span>{photoPreview ? 'Change Photo' : 'Select Photo'}</span>
              </button>
            </div>

            {isProcessingPhoto && (
              <p className="text-[11px] text-purple-600 font-medium animate-pulse">
                Analyzing photo facial landmarks...
              </p>
            )}

            {photoError && (
              <p className="text-[11px] text-rose-600 font-medium">
                {photoError}
              </p>
            )}

            {photoPreview && isPhotoSelected && (
              <div className="flex items-center gap-3 pt-1 border-t border-slate-200/80">
                <img
                  src={photoPreview}
                  alt="Reference preview"
                  className="h-12 w-12 rounded-xl object-cover border border-slate-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Facial landmarks extracted</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Sender must match this specific face in live camera.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendCustomPhotoTest}
                  className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-xs"
                >
                  Confirm & Test
                </button>
              </div>
            )}
          </div>

          {/* Option 3: Cancel Test */}
          <button
            type="button"
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>Cancel Test (Ignore for now)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
