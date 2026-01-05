import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function Studio() {
  const { user, token } = useAuth();
  const [games, setGames] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyGames();
    }
  }, [user]);

  const fetchMyGames = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games/my-games`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async () => {
    if (!newGameName.trim()) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGameName,
          description: 'New game created with Zamar Studio',
        }),
      });

      if (response.ok) {
        const newGame = await response.json();
        setGames([...games, newGame]);
        setNewGameName('');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const launchStudio = (gameId) => {
    window.open(`zamar-studio://open/${gameId}`, '_blank');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navigation />
        <div className="text-center pt-20">
          <p>Please login to access Zamar Studio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Games</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-500 hover:bg-cyan-600 px-6 py-2 rounded font-bold transition"
          >
            Create New Game
          </button>
        </div>

        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-slate-900 rounded-lg overflow-hidden hover:border-cyan-500 border-2 border-transparent transition cursor-pointer"
              >
                <div className="bg-slate-800 h-40 flex items-center justify-center">
                  <span className="text-4xl">🎮</span>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{game.description}</p>
                  <button
                    onClick={() => launchStudio(game.id)}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 py-2 rounded font-bold transition"
                  >
                    Open in Studio
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
              <input
                type="text"
                placeholder="Game Name"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                className="w-full bg-slate-800 text-white px-4 py-2 rounded mb-4 focus:outline-none focus:border-cyan-500 border-2 border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateGame}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 py-2 rounded font-bold transition"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
