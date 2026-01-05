import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function Friends() {
  const { user, token } = useAuth();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [user, token]);

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}/friends`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/requests`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setFriendRequests(data || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const handleAcceptRequest = async (friendId) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friend_id: friendId }),
      });
      fetchFriends();
      fetchFriendRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friend_id: friendId }),
      });
      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navigation />
        <div className="text-center pt-20">Please login to view friends</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Friends</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-800">
          {['friends', 'requests', 'online'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-6 font-bold transition capitalize ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab} {tab === 'requests' && friendRequests.length > 0 && `(${friendRequests.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div>
            {activeTab === 'friends' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.length === 0 ? (
                  <p className="text-gray-400">No friends yet</p>
                ) : (
                  friends.map((friend) => (
                    <div key={friend.id} className="bg-slate-900 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-xl">
                          👤
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{friend.username}</p>
                          <p className="text-sm text-green-400">● Online</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-cyan-600 hover:bg-cyan-700 py-2 rounded text-sm font-bold transition">
                          Message
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="flex-1 bg-red-900 hover:bg-red-800 py-2 rounded text-sm font-bold transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friendRequests.length === 0 ? (
                  <p className="text-gray-400">No friend requests</p>
                ) : (
                  friendRequests.map((request) => (
                    <div key={request.id} className="bg-slate-900 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-xl">
                          👤
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{request.username}</p>
                          <p className="text-xs text-gray-400">Sent {new Date(request.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-sm font-bold transition"
                        >
                          Accept
                        </button>
                        <button className="flex-1 bg-red-900 hover:bg-red-800 py-2 rounded text-sm font-bold transition">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'online' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.filter((f) => f.online).length === 0 ? (
                  <p className="text-gray-400">No friends online</p>
                ) : (
                  friends.filter((f) => f.online).map((friend) => (
                    <div key={friend.id} className="bg-slate-900 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-xl relative">
                          👤
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{friend.username}</p>
                          <p className="text-xs text-gray-400">{friend.current_game || 'In Hub'}</p>
                        </div>
                      </div>
                      <button className="w-full bg-cyan-600 hover:bg-cyan-700 py-2 rounded font-bold transition">
                        Message
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
