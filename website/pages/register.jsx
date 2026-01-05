import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/router';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const result = await register(username, email, password);
    if (result) {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } else {
      setError('Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
      <div className="w-full max-w-md card">
        <h1 className="text-3xl font-bold text-[#00D7FF] mb-6 text-center">CREATE ACCOUNT</h1>
        
        {success && (
          <div className="bg-green-900 text-green-100 p-4 rounded mb-4">
            Account created successfully! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[#00D7FF] font-semibold mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-[#0f1219] border border-[#1a1f3a] rounded text-white focus:outline-none focus:border-[#00D7FF]"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-[#00D7FF] font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-[#0f1219] border border-[#1a1f3a] rounded text-white focus:outline-none focus:border-[#00D7FF]"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-[#00D7FF] font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#0f1219] border border-[#1a1f3a] rounded text-white focus:outline-none focus:border-[#00D7FF]"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-[#00D7FF] font-semibold mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#0f1219] border border-[#1a1f3a] rounded text-white focus:outline-none focus:border-[#00D7FF]"
              required
            />
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary font-bold py-2"
          >
            {isLoading ? 'Creating account...' : 'SIGN UP'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[#888888]">
            Already have an account? <a href="/login" className="text-[#00D7FF] hover:underline">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
