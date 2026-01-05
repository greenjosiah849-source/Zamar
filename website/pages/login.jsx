import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const success = await login(username, password);
    if (success) {
      router.push('/');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
      <div className="w-full max-w-md card">
        <h1 className="text-3xl font-bold text-[#00D7FF] mb-6 text-center">ZAMAR LOGIN</h1>
        
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

          <div className="mb-6">
            <label className="block text-[#00D7FF] font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {isLoading ? 'Logging in...' : 'LOGIN'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[#888888]">
            Don't have an account? <a href="/register" className="text-[#00D7FF] hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
