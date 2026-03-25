'use client';

import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { API_URL } from '@/common/libs/constants';

interface EditProfileModalProps {
  onClose: () => void;
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconEye({ open }: { open: boolean }) {
  return open ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── Password input with show/hide toggle ─────────────────────────────────────

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-foreground/60 text-sm mb-1.5" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-2.5 pr-10 text-foreground placeholder-foreground/30 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
          maxLength={128}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors cursor-pointer"
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <IconEye open={show} />
        </button>
      </div>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

type Tab = 'profile' | 'password';

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { user, updateUser } = useAuth();
  const isEmailUser = user?.provider === 'EMAIL';
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile state
  const [name, setName] = useState(user?.name ?? '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    user?.picture ?? null,
  );
  const [pictureData, setPictureData] = useState<string | null | undefined>(
    undefined,
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Profile handlers ──────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Image must be smaller than 2 MB');
      return;
    }
    setProfileError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewUrl(dataUrl);
      setPictureData(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    setPictureData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const payload: { name?: string; picture?: string | null } = {};
      const trimmedName = name.trim();
      if (trimmedName !== (user?.name ?? '')) payload.name = trimmedName;
      if (pictureData !== undefined) payload.picture = pictureData;
      if (Object.keys(payload).length > 0) await updateUser(payload);
      setProfileSuccess(true);
      setTimeout(onClose, 800);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Failed to save changes',
      );
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Password handler ──────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    setPwError(null);
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string }).message ?? 'Failed to change password',
        );
      }
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : 'Failed to change password',
      );
    } finally {
      setPwSaving(false);
    }
  };

  const initials = (user?.name ?? 'U').charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl shadow-black/60 p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close"
        >
          <IconX />
        </button>

        <h2 className="text-foreground text-xl font-semibold mb-5">
          Edit Profile
        </h2>

        {/* Tabs — only for email users */}
        {isEmailUser && (
          <div className="flex gap-1 mb-6 bg-foreground/5 rounded-xl p-1 ">
            {(['profile', 'password'] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize cursor-pointer ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/40'
                    : 'text-foreground/50 hover:text-foreground'
                }`}
              >
                {tab === 'profile' ? 'Profile' : 'Password'}
              </button>
            ))}
          </div>
        )}

        {/* ── Profile tab ── */}
        {activeTab === 'profile' && (
          <>
            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl shrink-0 ring-4 ring-foreground/10">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Upload photo"
                >
                  <IconCamera />
                </button>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-primary hover:text-secondary transition-colors font-medium cursor-pointer"
                >
                  Upload photo
                </button>
                {previewUrl && (
                  <>
                    <span className="text-foreground/20">|</span>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-sm text-destructive hover:text-destructive/80 transition-colors font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
              <p className="text-foreground/30 text-xs mt-1">
                JPG, PNG or GIF · max 2 MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Name */}
            <div className="mb-4">
              <label
                className="block text-foreground/60 text-sm mb-1.5"
                htmlFor="profile-name"
              >
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-foreground/30 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                maxLength={100}
              />
            </div>

            {/* Email (read-only) */}
            <div className="mb-6">
              <label className="block text-foreground/60 text-sm mb-1.5">
                Email
              </label>
              <div className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-2.5 text-foreground/40 text-sm select-all">
                {user?.email ?? ''}
              </div>
            </div>

            {profileError && (
              <p className="text-destructive text-sm mb-4">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-success text-sm mb-4">Profile saved!</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 hover:text-foreground hover:border-foreground/20 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium transition-all cursor-pointer"
              >
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}

        {/* ── Password tab (EMAIL users only) ── */}
        {activeTab === 'password' && isEmailUser && (
          <>
            <PasswordInput
              id="current-password"
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
            />
            <PasswordInput
              id="new-password"
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 8 characters"
            />
            <PasswordInput
              id="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat new password"
            />

            {pwError && (
              <p className="text-destructive text-sm mb-4">{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-success text-sm mb-4">
                Password updated successfully!
              </p>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 hover:text-foreground hover:border-foreground/20 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={
                  pwSaving ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium transition-all cursor-pointer"
              >
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
