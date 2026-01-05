import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';

export const Navigation = () => {
  const { user, logout } = useAuthStore();

  return (
    <nav className="bg-[#1a1f3a] border-b border-[#00D7FF] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/">
          <span className="text-2xl font-bold text-[#00D7FF]">ZAMAR</span>
        </Link>

        <div className="flex gap-6">
          <Link href="/" className="nav-item">Home</Link>
          <Link href="/games" className="nav-item">Games</Link>
          <Link href="/catalog" className="nav-item">Catalog</Link>
          <Link href="/avatar" className="nav-item">Avatar</Link>
          <Link href="/friends" className="nav-item">Friends</Link>
          <Link href="/messages" className="nav-item">Messages</Link>
          {user && <Link href="/studio" className="nav-item">Studio</Link>}
          {user?.is_admin && <Link href="/admin" className="nav-item text-red-400">Admin</Link>}
        </div>

        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <Link href={`/profile/${user.id}`} className="text-white hover:text-cyan-400">
                {user.username}
              </Link>
              <Link href="/settings" className="text-gray-400 hover:text-white">⚙️</Link>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm">Login</Link>
              <Link href="/register" className="btn-primary text-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
