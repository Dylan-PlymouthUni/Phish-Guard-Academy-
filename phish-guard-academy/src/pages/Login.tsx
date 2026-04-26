/**
 * Login component/module file.
 * This file defines the Login page, which allows users to log into their accounts in the PhishGuard Academy application. It includes a form for entering email and password, as well as handling multi-factor authentication (MFA) if required. The component manages form state, handles API calls for login and MFA verification, and provides feedback to the user through notifications and error messages.
 * It includes the following responsibilities:
 * - Managing form state for email, password, OTP, and backup code.
 * - Handling form submission for login and MFA verification.
 * - Displaying error messages and loading states.
 * - Navigating to the dashboard upon successful login.
 * - Providing a link to the registration page for new users.
 * - Using the AuthContext for authentication-related functions and state.
 * - Using the react-hot-toast library for user notifications.
 * - Styling the component with Tailwind CSS for a modern and responsive design.
 * - Ensuring accessibility and usability for all users.
 * 
 * The component is structured to provide a smooth and secure login experience, guiding users through the necessary steps while providing clear feedback on their actions.
 * It also handles edge cases such as MFA requirements and provides options for users who may have trouble with their authenticator app by allowing backup codes.
 * Overall, this component serves as the gateway for users to access the features and content of the PhishGuard Academy application while ensuring security and usability.
 * 
 
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GradientButton from '../components/GradientButton';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result?.mfaRequired) {
        setMfaRequired(true);
        setPendingEmail(result.email || email);
        toast('Enter your 6-digit code', { icon: '🔐' });
        return;
      }

      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

    const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!pendingEmail) throw new Error('No email found for MFA flow');
      await verifyMfa(pendingEmail, otp, backupCode || undefined);
      toast.success('MFA verified!');
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            PhishGuard
          </h1>
          <p className="text-center text-slate-400 mb-8">Login to your account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  placeholder="••••••••"
                />
              </div>

              <GradientButton
                disabled={isLoading}
                className="w-full py-2"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </GradientButton>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="text-slate-300 text-sm">
                Multi-factor authentication required for <span className="font-semibold text-white">{pendingEmail}</span>.
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  6-digit code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  placeholder="123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Backup code (optional)
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  placeholder="XXXX-XXXX"
                />
                <p className="text-xs text-slate-500 mt-1">Use only if you can’t access your authenticator app.</p>
              </div>

              <GradientButton
                disabled={isLoading}
                className="w-full py-2"
              >
                {isLoading ? 'Verifying...' : 'Verify & Sign in'}
              </GradientButton>
            </form>
          )}

          <div className="mt-6 border-t border-slate-700 pt-6">
            <p className="text-center text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
