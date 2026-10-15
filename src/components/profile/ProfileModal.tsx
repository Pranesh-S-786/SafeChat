import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  User,
  Key,
  Check,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=SafeOne',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CryptoGuard',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberNinja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumKey',
  'https://api.dicebear.com/7.x/bottts/svg?seed=AuroraSafe',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, keyPair } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setErrorMessage(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Please select an image smaller than 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setAvatarUrl(reader.result as string);
            return;
          }

          // Center-crop to square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressed);
          setErrorMessage(null);
        } catch {
          setAvatarUrl(reader.result as string);
        }
      };
      img.onerror = () => {
        setErrorMessage('Failed to process image file.');
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage('Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const result = await updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl || null,
      });

      if (result) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 800);
      } else {
        setErrorMessage('Failed to update profile. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const initial = (displayName || profile?.display_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Edit Profile</h2>
              <p className="text-[11px] text-slate-400">Update your avatar & public identity</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Avatar Picture with Camera Upload Button */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="flex h-24 w-24 items-center justify-center rounded-full overflow-hidden border-2 border-emerald-500/30 bg-emerald-50 shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-emerald-800">{initial}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95 border-2 border-white"
                title="Upload Profile Picture"
              >
                <Camera className="h-4 w-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Change Photo
            </button>
          </div>

          {/* Quick Preset Avatars */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
              Or Choose Preset Avatar
            </label>
            <div className="flex items-center justify-center gap-2">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border-2 transition-transform hover:scale-105 ${
                    avatarUrl === url ? 'border-emerald-600 ring-2 ring-emerald-300' : 'border-slate-200'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Hunter"
              className="w-full rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>

          {/* Username (Read only info) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Username
            </label>
            <input
              type="text"
              readOnly
              value={`@${profile?.username || user?.email?.split('@')[0] || 'user'}`}
              className="w-full rounded-2xl bg-slate-100/70 border border-slate-200 px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* E2EE Public Key Fingerprint */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Key className="h-3.5 w-3.5 text-emerald-600" />
              <span>Public Key Fingerprint</span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 break-all">
              {keyPair?.fingerprint || 'Initial Key Pair Active'}
            </p>
          </div>

          {errorMessage && (
            <p className="text-xs font-medium text-rose-600 text-center">{errorMessage}</p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
