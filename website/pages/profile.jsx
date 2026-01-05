import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function Profile() {
  const router = useRouter();
  const { id } = router.query;
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    if (id || user) {
      const userId = id || user?.id;
      if (userId) {
        fetchProfile(userId);
        fetchInventory(userId);
        fetchFriends(userId);
      }
    }
  }, [id, user, token]);

  const fetchProfile = async (userId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchInventory = async (userId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/inventory`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchFriends = async (userId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/friends`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friend_id: profile.id }),
      });
      // Refresh friends list
      fetchFriends(profile.id);
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  if (loading || !profile) {
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
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg overflow-hidden mb-8">
          <div className="h-40 bg-slate-800"></div>
          <div className="px-8 pb-8 flex gap-6 items-end -mt-16 relative z-10">
            <div className="w-32 h-32 bg-slate-700 rounded-full border-4 border-slate-950 flex items-center justify-center text-6xl">
              👤
            </div>
            <div className="mb-4">
              <h1 className="text-4xl font-bold">{profile.username}</h1>
              <p className="text-gray-200">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
            {user?.id !== profile.id && (
              <button
                onClick={handleAddFriend}
                className="ml-auto bg-cyan-500 hover:bg-cyan-600 px-6 py-2 rounded font-bold transition mb-4"
              >
                + Add Friend
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-800">
          {['about', 'inventory', 'friends', 'games'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-6 font-bold transition capitalize ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            {activeTab === 'about' && (
              <div className="bg-slate-900 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">About</h2>
                <div className="space-y-4 text-gray-300">
                  <div>
                    <p className="text-gray-400">Username</p>
                    <p className="text-lg font-semibold">{profile.username}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Account Status</p>
                    <p className="text-lg font-semibold">Active</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Member Since</p>
                    <p className="text-lg font-semibold">{new Date(profile.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="bg-slate-900 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Inventory</h2>
                {inventory.length === 0 ? (
                  <p className="text-gray-400">No items in inventory</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {inventory.map((item) => (
                      <div key={item.id} className="bg-slate-800 p-4 rounded text-center">
                        <div className="text-4xl mb-2">🎁</div>
                        <p className="font-semibold">{item.item_name}</p>
                        <p className="text-sm text-gray-400">x{item.quantity}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="bg-slate-900 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Friends ({friends.length})</h2>
                {friends.length === 0 ? (
                  <p className="text-gray-400">No friends yet</p>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div key={friend.id} className="bg-slate-800 p-3 rounded flex justify-between items-center">
                        <p className="font-semibold">{friend.username}</p>
                        <span className="text-green-400 text-sm">● Online</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'games' && (
              <div className="bg-slate-900 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Games Created</h2>
                <p className="text-gray-400">No games created yet</p>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="col-span-1">
            <div className="bg-slate-900 rounded-lg p-6 sticky top-4">
              <h3 className="text-lg font-bold mb-4">Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Games Played</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Friends</p>
                  <p className="text-3xl font-bold">{friends.length}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Items</p>
                  <p className="text-3xl font-bold">{inventory.length}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Robux</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
