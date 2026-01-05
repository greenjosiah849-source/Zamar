import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function GameDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, token } = useAuth();
  const [game, setGame] = useState(null);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchGameDetail();
      fetchServers();
    }
  }, [id, token]);

  const fetchGameDetail = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setGame(data);
    } catch (error) {
      console.error('Error fetching game:', error);
    }
  };

  const fetchServers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/game-servers?gameId=${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setServers(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (serverId) => {
    if (!user) {
      router.push('/login');
      return;
    }
    // Launch game client with server ID
    window.open(`zamar://play/${id}/${serverId}`, '_blank');
  };

  if (loading || !game) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navigation />
        <div className="text-center pt-20">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        {/* Game Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg overflow-hidden mb-8">
          <div className="h-64 bg-slate-800 flex items-center justify-center text-6xl">
            🎮
          </div>
          <div className="p-8">
            <h1 className="text-4xl font-bold mb-2">{game.name}</h1>
            <p className="text-lg text-gray-100">By {game.creator}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Game Info */}
          <div className="col-span-2">
            <div className="bg-slate-900 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">About This Game</h2>
              <p className="text-gray-300 mb-4">{game.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Created</span>
                  <p className="text-white font-semibold">{new Date(game.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-400">Visits</span>
                  <p className="text-white font-semibold">{game.visits || 0}</p>
                </div>
                <div>
                  <span className="text-gray-400">Favorites</span>
                  <p className="text-white font-semibold">{game.likes || 0}</p>
                </div>
                <div>
                  <span className="text-gray-400">Genre</span>
                  <p className="text-white font-semibold">{game.genre || 'Action'}</p>
                </div>
              </div>
            </div>

            {/* Servers */}
            <div className="bg-slate-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Game Servers</h2>
              {servers.length === 0 ? (
                <p className="text-gray-400">No servers available</p>
              ) : (
                <div className="space-y-3">
                  {servers.map((server) => (
                    <div
                      key={server.id}
                      className="bg-slate-800 p-4 rounded flex justify-between items-center hover:bg-slate-700 transition"
                    >
                      <div>
                        <p className="font-semibold">{server.name}</p>
                        <p className="text-sm text-gray-400">
                          {server.current_players}/{server.max_players} players • {server.region}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePlay(server.id)}
                        className="bg-cyan-500 hover:bg-cyan-600 px-6 py-2 rounded font-bold transition"
                      >
                        Play
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-1">
            <div className="bg-slate-900 rounded-lg p-6 sticky top-4">
              <div className="bg-slate-800 h-32 flex items-center justify-center mb-4 rounded text-4xl">
                👤
              </div>
              <h3 className="font-bold mb-4">{game.creator}</h3>
              <p className="text-sm text-gray-400 mb-6">Creator Info</p>
              
              <div className="space-y-2 mb-6">
                <p className="text-sm"><span className="text-gray-400">Visits:</span> <span className="font-bold text-lg">{game.visits || 0}</span></p>
                <p className="text-sm"><span className="text-gray-400">Likes:</span> <span className="font-bold text-lg">{game.likes || 0}%</span></p>
                <p className="text-sm"><span className="text-gray-400">Rating:</span> <span className="font-bold text-lg">{game.rating || 'N/A'}</span></p>
              </div>

              <button className="w-full bg-cyan-500 hover:bg-cyan-600 py-2 rounded font-bold mb-2 transition">
                ⭐ Favorite
              </button>
              <button className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded font-bold transition">
                📢 Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
