import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function GamePasses() {
  const router = useRouter();
  const { gameId } = router.query;
  const { user, token } = useAuth();
  const [passes, setPasses] = useState([]);
  const [owned, setOwned] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId) {
      fetchGamePasses();
      if (user) {
        fetchOwnedPasses();
      }
    }
  }, [gameId, user, token]);

  const fetchGamePasses = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/features/game-passes/${gameId}`
      );
      const data = await response.json();
      setPasses(data || []);
    } catch (error) {
      console.error('Error fetching game passes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnedPasses = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/features/game-passes/${gameId}/owned`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setOwned(data.map(p => p.id));
    } catch (error) {
      console.error('Error fetching owned passes:', error);
    }
  };

  const handleBuyPass = async (passId, price) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/features/game-passes/${gameId}/buy`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gamePassId: passId }),
        }
      );

      if (response.ok) {
        setOwned([...owned, passId]);
        alert('Game pass purchased!');
      }
    } catch (error) {
      console.error('Error buying game pass:', error);
      alert('Failed to purchase game pass');
    }
  };

  if (loading) {
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
        <h1 className="text-4xl font-bold mb-8">Game Passes</h1>

        {passes.length === 0 ? (
          <div className="text-center text-gray-400">
            <p>No game passes available for this game</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {passes.map((pass) => (
              <div
                key={pass.id}
                className="bg-slate-900 rounded-lg overflow-hidden hover:border-cyan-500 border-2 border-transparent transition"
              >
                {/* Pass Icon */}
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 h-40 flex items-center justify-center text-5xl">
                  🎫
                </div>

                {/* Pass Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{pass.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{pass.description}</p>

                  {/* Price */}
                  <div className="bg-slate-800 rounded p-3 mb-4">
                    <p className="text-gray-400 text-xs">Price</p>
                    <p className="text-2xl font-bold text-cyan-400">{pass.price}</p>
                  </div>

                  {/* Button */}
                  {owned.includes(pass.id) ? (
                    <button
                      disabled
                      className="w-full bg-green-900 text-green-100 py-2 rounded font-bold"
                    >
                      ✓ Owned
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyPass(pass.id, pass.price)}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 py-2 rounded font-bold transition"
                    >
                      Buy for {pass.price} Robux
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
