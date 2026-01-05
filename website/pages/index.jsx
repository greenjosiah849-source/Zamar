import React from 'react';
import Navigation from '@/components/Navigation';

export default function HomePage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#0a0e27]">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-[#1a1f3a] to-[#0a0e27] py-20 border-b border-[#00D7FF]">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-6xl font-bold text-[#00D7FF] mb-4">ZAMAR</h1>
            <p className="text-2xl text-[#888888] mb-8">The Community-Driven Game Platform</p>
            <div className="flex gap-4 justify-center">
              <button className="btn-primary px-8 py-3 text-lg">Download Client</button>
              <button className="btn-secondary px-8 py-3 text-lg">Explore Games</button>
            </div>
          </div>
        </div>

        {/* Featured Games */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-[#00D7FF] mb-8">Featured Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card hover:border-[#00FF00] transition cursor-pointer">
                <div className="bg-[#2a3050] w-full h-40 rounded mb-4"></div>
                <h3 className="text-lg font-bold text-white">Featured Game {i}</h3>
                <p className="text-[#888888] text-sm mb-2">By Creator</p>
                <div className="flex justify-between">
                  <span className="text-[#00D7FF]">👥 1.2K</span>
                  <span className="text-[#888888]">👍 95%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-[#1a1f3a] border-t border-b border-[#00D7FF] py-16">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#00D7FF] mb-2">10K+</div>
              <div className="text-[#888888]">Games</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#00D7FF] mb-2">50K+</div>
              <div className="text-[#888888]">Players</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#00D7FF] mb-2">1M+</div>
              <div className="text-[#888888]">Playtime Hours</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
