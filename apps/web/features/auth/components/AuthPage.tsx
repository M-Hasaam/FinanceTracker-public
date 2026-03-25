'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useOAuth } from '../hooks/useOAuth';
import { useEmailAuth } from '../hooks/useEmailAuth';
import { useTestLogin } from '../hooks/useTestLogin';
import { LoadingOverlay } from '@/common/components/LoadingOverlay';
import { WalletIcon } from '@/common/icons';

// Simple, clean Google icon
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M18.1712 8.36788H17.5V8.33329H10V11.6666H14.7096C13.9225 13.607 12.0721 15 9.99996 15C7.23871 15 4.99996 12.7612 4.99996 9.99996C4.99996 7.23871 7.23871 4.99996 9.99996 4.99996C11.2746 4.99996 12.4341 5.48079 13.317 6.26621L15.6741 3.90913C14.1858 2.52204 12.195 1.66663 9.99996 1.66663C5.39788 1.66663 1.66663 5.39788 1.66663 9.99996C1.66663 14.602 5.39788 18.3333 9.99996 18.3333C14.602 18.3333 18.3333 14.602 18.3333 9.99996C18.3333 9.44121 18.2758 8.89579 18.1712 8.36788Z" fill="#FFC107"/>
      <path d="M2.62708 6.12121L5.36542 8.12913C6.22167 6.29496 8.02292 4.99996 10 4.99996C11.2746 4.99996 12.4342 5.48079 13.3171 6.26621L15.6742 3.90913C14.1858 2.52204 12.195 1.66663 10 1.66663C6.79917 1.66663 4.02333 3.47371 2.62708 6.12121Z" fill="#FF3D00"/>
      <path d="M10 18.3333C12.1525 18.3333 14.1083 17.5095 15.5871 16.17L13.0079 13.9875C12.1429 14.6452 11.0863 15.0011 10 15C7.9575 15 6.10875 13.6279 5.29875 11.705L2.58125 13.7908C3.96041 16.4812 6.76083 18.3333 10 18.3333Z" fill="#4CAF50"/>
      <path d="M18.1713 8.36788H17.5V8.33329H10V11.6666H14.7096C14.3322 12.5903 13.7205 13.3976 12.9471 13.9875L12.9488 13.9862L15.528 16.1687C15.3455 16.3329 18.3333 14.1666 18.3333 9.99996C18.3333 9.44121 18.2758 8.89579 18.1713 8.36788Z" fill="#1976D2"/>
    </svg>
  );
}

interface AuthPageProps {
  initialTab?: 'login' | 'signup';
}

export function AuthPage({ initialTab = 'login' }: AuthPageProps) {
  const searchParams = useSearchParams();
  const tabFromUrl =
    searchParams.get('tab') === 'signup' ? 'signup' : initialTab;
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(tabFromUrl);
  const { startOAuth, loading: oauthLoading, error: oauthError } = useOAuth();
  const {
    login,
    signup,
    loading: emailLoading,
    error: emailError,
  } = useEmailAuth();
  const {
    testLogin,
    loading: testLoginLoading,
    error: testLoginError,
  } = useTestLogin();

  const loading = oauthLoading || emailLoading || testLoginLoading;
  const error = testLoginError || emailError || oauthError;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'login') {
      await login(email, password);
    } else {
      await signup(name, email, password, confirmPassword);
    }
  };

  const handleTestLogin = async () => {
    setActiveTab('login');
    await testLogin();
  };

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#141332]">
      {testLoginLoading && <LoadingOverlay message="Setting up test data..." />}
      <button
        type="button"
        onClick={handleTestLogin}
        disabled={loading}
        className="absolute right-4 top-4 z-20 rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {testLoginLoading ? 'Preparing Test User...' : 'Login as Test User'}
      </button>

      {/* Main container */}
      <div className="flex w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl mx-4">
        {/* Left panel */}
        <div className="panel-slide-left hidden md:flex md:w-2/5 bg-[#6359e9] px-8 py-12">
          <div className="flex flex-col items-center justify-center gap-6 w-full">
            <div className="grid h-36 w-36 place-items-center rounded-4xl bg-white text-[#1d1d41]">
              <WalletIcon className="h-24 w-24" />
            </div>

            <div className="space-y-3 text-center">
              <h1 className="text-[#1d1d41] font-extrabold text-2xl">
                Finance Tracker
              </h1>
              <p className="text-white font-semibold text-base">
                Smart Money Tracking
              </p>
              <p className="text-white/80 text-xs max-w-xs leading-relaxed">
                Your privacy and data security are our priority.
              </p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="panel-slide-right w-full md:w-3/5 bg-[#1d1d41] px-8 py-12">
          <div className="form-fade-up flex flex-col items-center justify-center w-full max-w-sm mx-auto">
            <h2 className="text-white font-bold text-2xl md:text-3xl mb-6">
              {activeTab === 'login' ? 'Login' : 'Sign Up'}
            </h2>

            {/* Tab toggle */}
            <div className="relative flex w-full bg-white rounded-full overflow-hidden mb-6 h-11 p-1">
              <span
                aria-hidden="true"
                className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-linear-to-r from-[#6359e9] to-[#090357] transition-transform duration-300 ease-in-out ${
                  activeTab === 'login' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`relative z-10 flex-1 text-sm font-semibold rounded-full transition-colors duration-300 cursor-pointer ${
                  activeTab === 'login' ? 'text-white' : 'text-black'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className={`relative z-10 flex-1 text-sm font-semibold rounded-full transition-colors duration-300 cursor-pointer ${
                  activeTab === 'signup' ? 'text-white' : 'text-black'
                }`}
              >
                Signup
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                className="w-full mb-4 text-red-400 text-xs text-center"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 w-full"
            >
              {activeTab === 'signup' && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-white px-4 text-black text-sm placeholder:text-black/50 outline-none focus:ring-2 focus:ring-[#6359e9] disabled:opacity-60"
                />
              )}

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full h-11 rounded-xl bg-white px-4 text-black text-sm placeholder:text-black/50 outline-none focus:ring-2 focus:ring-[#6359e9] disabled:opacity-60"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full h-11 rounded-xl bg-white px-4 text-black text-sm placeholder:text-black/50 outline-none focus:ring-2 focus:ring-[#6359e9] disabled:opacity-60"
              />

              {activeTab === 'signup' && (
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-white px-4 text-black text-sm placeholder:text-black/50 outline-none focus:ring-2 focus:ring-[#6359e9] disabled:opacity-60"
                />
              )}

              {activeTab === 'login' && (
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-[#009dff] text-xs hover:underline"
                  >
                    Forget password?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-linear-to-r from-[#6359e9] to-[#090357] text-white font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
              >
                {emailLoading
                  ? activeTab === 'login'
                    ? 'Signing in…'
                    : 'Creating account…'
                  : activeTab === 'login'
                    ? 'Login'
                    : 'Sign Up'}
              </button>
            </form>

            {/* Signup link */}
            <p className="text-white text-xs mt-3">
              {activeTab === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className="text-[#009dff] hover:underline cursor-pointer"
                  >
                    Signup
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-[#009dff] hover:underline cursor-pointer"
                  >
                    Login
                  </button>
                </>
              )}
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full my-4">
              <div className="flex-1 h-px bg-white/30" />
              <span className="text-white text-xs">Or</span>
              <div className="flex-1 h-px bg-white/30" />
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={() => startOAuth('google')}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full h-11 rounded-xl bg-white/10 text-white font-semibold text-sm disabled:opacity-60 hover:bg-white/20 transition-colors border border-white/20"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .panel-slide-left {
          animation: slideLeft 650ms ease-out both;
        }
        .panel-slide-right {
          animation: slideRight 650ms ease-out both;
        }
        .form-fade-up {
          animation: fadeUp 800ms ease-out 120ms both;
        }
        @keyframes slideLeft {
          from {
            opacity: 0;
            transform: translateX(-2rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideRight {
          from {
            opacity: 0;
            transform: translateX(2rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(1.25rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}