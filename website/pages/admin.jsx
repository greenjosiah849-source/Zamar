import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function Admin() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_users: 0,
    total_games: 0,
    online_players: 0,
    active_servers: 0,
  });

  useEffect(() => {
    if (user?.is_admin) {
      fetchDashboardData();
    } else {
      router.push('/');
    }
  }, [user, router, token]);

  const fetchDashboardData = async () => {
    try {
      // Fetch users
      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      setUsers(usersData || []);

      // Fetch moderation cases
      const reportsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/cases`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const reportsData = await reportsRes.json();
      setReports(reportsData || []);

      // Fetch stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      setStats(statsData || {});
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          duration: 'permanent',
          reason: 'Admin action',
        }),
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  if (!user?.is_admin) {
    return null;
  }

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
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 rounded-lg p-6">
            <p className="text-gray-400 mb-2">Total Users</p>
            <p className="text-4xl font-bold">{stats.total_users}</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-6">
            <p className="text-gray-400 mb-2">Total Games</p>
            <p className="text-4xl font-bold">{stats.total_games}</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-6">
            <p className="text-gray-400 mb-2">Online Players</p>
            <p className="text-4xl font-bold text-green-400">{stats.online_players}</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-6">
            <p className="text-gray-400 mb-2">Active Servers</p>
            <p className="text-4xl font-bold">{stats.active_servers}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-800">
          {['users', 'moderation', 'servers', 'reports'].map((tab) => (
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
        {activeTab === 'users' && (
          <div className="bg-slate-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left">Username</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Created</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-700 hover:bg-slate-800">
                    <td className="px-6 py-3">{u.username}</td>
                    <td className="px-6 py-3">{u.email}</td>
                    <td className="px-6 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      <span className="bg-green-900 text-green-100 px-2 py-1 rounded text-sm">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleBanUser(u.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Ban
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="bg-slate-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left">User</th>
                  <th className="px-6 py-3 text-left">Reason</th>
                  <th className="px-6 py-3 text-left">Action</th>
                  <th className="px-6 py-3 text-left">Duration</th>
                  <th className="px-6 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t border-slate-700 hover:bg-slate-800">
                    <td className="px-6 py-3">{report.reported_username}</td>
                    <td className="px-6 py-3">{report.reason}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        report.action === 'BAN' ? 'bg-red-900 text-red-100' :
                        report.action === 'MUTE' ? 'bg-yellow-900 text-yellow-100' :
                        'bg-blue-900 text-blue-100'
                      }`}>
                        {report.action}
                      </span>
                    </td>
                    <td className="px-6 py-3">{report.duration || 'Permanent'}</td>
                    <td className="px-6 py-3">{new Date(report.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'servers' && (
          <div className="bg-slate-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Game Servers</h2>
            <p className="text-gray-400">Server monitoring coming soon</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-slate-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">User Reports</h2>
            <p className="text-gray-400">Total Reports: {reports.length}</p>
          </div>
        )}
      </div>
    </div>
  );
}
