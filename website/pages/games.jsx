import React, { useEffect, useState } from 'react';
import { useGameStore, useAuthStore } from '@/lib/store';
import Navigation from '@/components/Navigation';

export default function GamesPage() {
  const { games, isLoading, fetchGames } = useGameStore();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchGames(token);
    }
  }, [token]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#0a0e27] py-8">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-bold text-[#00D7FF] mb-8">GAMES</h1>

          {isLoading ? (
            <div className="text-center text-[#888888]">Loading games...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {games.map((game) => (
                <div key={game.gameId} className="card hover:border-[#00FF00] transition">
                  <div className="bg-[#2a3050] w-full h-40 rounded mb-4"></div>
                  <h2 className="text-lg font-bold text-white">{game.title}</h2>
                  <p className="text-[#888888] text-sm mb-2">{game.creatorName}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[#00D7FF]">👥 {game.playerCount}</span>
                    <span className="text-[#888888]">👍 {(game.likeRatio * 100).toFixed(0)}%</span>
                  </div>
                  <button className="w-full btn-primary mt-4 py-2 text-sm">PLAY</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
