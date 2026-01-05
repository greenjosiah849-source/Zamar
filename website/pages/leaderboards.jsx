import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function Leaderboards() {
  const router = useRouter();
  const { gameId } = router.query;
  const { user, token } = useAuth();
  const [leaderboards, setLeaderboards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [entries, setEntries] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId) {
      fetchLeaderboards();
    }
  }, [gameId, token]);

  useEffect(() => {
    if (selectedBoard) {
      fetchLeaderboardEntries(selectedBoard.id);
    }
  }, [selectedBoard]);

  const fetchLeaderboards = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/games/${gameId}/leaderboards`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      );
      const data = await response.json();
      setLeaderboards(data || []);
      if (data.length > 0) {
        setSelectedBoard(data[0]);
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboardEntries = async (leaderboardId) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/features/leaderboards/${leaderboardId}?limit=100`
      );
      const data = await response.json();
      setEntries(data || []);

      // Find user's rank if logged in
      if (user) {
        const userEntry = data.find(e => e.user_id === user.id);
        setUserRank(userEntry);
      }
    } catch (error) {
      console.error('Error fetching leaderboard entries:', error);
    }
  };

  if (loading || !selectedBoard) {
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
        <h1 className="text-4xl font-bold mb-8">Leaderboards</h1>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {leaderboards.map((board) => (
            <button
              key={board.id}
              onClick={() => setSelectedBoard(board)}
              className={`py-3 px-4 rounded font-bold transition ${
                selectedBoard.id === board.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {board.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Leaderboard */}
          <div className="col-span-2 bg-slate-900 rounded-lg overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-bold">{selectedBoard.name}</h2>
              <p className="text-gray-400 text-sm">{selectedBoard.description}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-3 text-left text-gray-400 font-semibold">Rank</th>
                    <th className="px-6 py-3 text-left text-gray-400 font-semibold">Player</th>
                    <th className="px-6 py-3 text-right text-gray-400 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 50).map((entry, index) => (
                    <tr key={entry.id} className="border-b border-slate-800 hover:bg-slate-800">
                      <td className="px-6 py-3">
                        <span className="font-bold text-lg">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `#${index + 1}`}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-semibold">{entry.username}</td>
                      <td className="px-6 py-3 text-right font-bold text-cyan-400">
                        {entry.score.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Rank Card */}
          <div>
            {user ? (
              <div className="bg-slate-900 rounded-lg p-6 sticky top-4">
                <h3 className="text-lg font-bold mb-4">Your Rank</h3>
                {userRank ? (
                  <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-400 mb-2">#{userRank.rank}</div>
                    <div className="text-2xl font-bold mb-4">{userRank.score.toLocaleString()}</div>
                    <p className="text-gray-400">Points</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <p>Not on leaderboard yet</p>
                    <p className="text-sm mt-2">Play and submit scores!</p>
                  </div>
                )}

                <button className="w-full bg-cyan-600 hover:bg-cyan-700 py-2 rounded font-bold mt-6 transition">
                  Play Game
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-lg p-6">
                <p className="text-center text-gray-400">
                  <a href="/login" className="text-cyan-400 hover:underline">Login</a> to see your rank
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
