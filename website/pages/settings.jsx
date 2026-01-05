import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function Settings() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState({
    email_notifications: true,
    public_profile: true,
    allow_friend_requests: true,
    show_online_status: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSettingChange = (key) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleSaveSettings = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <div className="flex gap-8">
          {/* Sidebar Tabs */}
          <div className="w-48">
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              {['account', 'privacy', 'notifications', 'billing'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-3 transition capitalize ${
                    activeTab === tab
                      ? 'bg-cyan-600 font-bold'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'account' && (
              <div className="bg-slate-900 rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full bg-slate-800 text-gray-400 px-4 py-2 rounded border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-slate-800 text-gray-400 px-4 py-2 rounded border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Account Created</label>
                    <p className="text-white">{new Date(user?.created_at).toLocaleDateString()}</p>
                  </div>
                  <button className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-bold transition">
                    Change Password
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="bg-slate-900 rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-6">Privacy Settings</h2>
                <div className="space-y-4">
                  {Object.entries({
                    public_profile: 'Public Profile',
                    allow_friend_requests: 'Allow Friend Requests',
                    show_online_status: 'Show Online Status',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between bg-slate-800 p-4 rounded">
                      <label className="font-semibold">{label}</label>
                      <button
                        onClick={() => handleSettingChange(key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          settings[key] ? 'bg-cyan-600' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            settings[key] ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-slate-900 rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-6">Notification Settings</h2>
                <div className="space-y-4">
                  {['email_notifications'].map((key) => (
                    <div key={key} className="flex items-center justify-between bg-slate-800 p-4 rounded">
                      <label className="font-semibold">Email Notifications</label>
                      <button
                        onClick={() => handleSettingChange(key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          settings[key] ? 'bg-cyan-600' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            settings[key] ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-slate-900 rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-6">Billing & Robux</h2>
                <div className="space-y-6">
                  <div className="bg-slate-800 p-6 rounded">
                    <p className="text-gray-400 mb-2">Current Robux Balance</p>
                    <p className="text-4xl font-bold text-cyan-400">0</p>
                  </div>
                  <button className="bg-cyan-600 hover:bg-cyan-700 px-6 py-2 rounded font-bold transition">
                    Buy Robux
                  </button>
                </div>
              </div>
            )}

            {/* Save Changes Button */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSaveSettings}
                className="bg-cyan-600 hover:bg-cyan-700 px-6 py-2 rounded font-bold transition"
              >
                Save Changes
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-bold transition"
              >
                Logout
              </button>
            </div>

            {saved && (
              <div className="mt-4 bg-green-900 text-green-100 p-4 rounded">
                Settings saved successfully!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
