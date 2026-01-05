import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/store';
import Navigation from '../components/Navigation';

export default function CatalogItemDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, token } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    if (id) {
      fetchItemDetail();
    }
  }, [id, token]);

  const fetchItemDetail = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/catalog/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setItem(data);
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/catalog/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_id: item.id,
          quantity,
        }),
      });

      if (response.ok) {
        setPurchased(true);
        setTimeout(() => router.push('/catalog'), 2000);
      }
    } catch (error) {
      console.error('Error purchasing item:', error);
    }
  };

  if (loading || !item) {
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
        <div className="grid grid-cols-2 gap-12">
          {/* Item Display */}
          <div>
            <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg overflow-hidden mb-6">
              <div className="h-96 flex items-center justify-center text-8xl">
                {item.icon || '🎁'}
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2">Creator Info</h2>
              <p className="text-gray-400 mb-4">by {item.creator_name || 'Zamar'}</p>
              <button className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded font-bold mb-2">
                Visit Creator
              </button>
            </div>
          </div>

          {/* Item Details */}
          <div>
            <h1 className="text-4xl font-bold mb-4">{item.name}</h1>
            <p className="text-gray-300 mb-6">{item.description}</p>

            <div className="bg-slate-900 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-gray-400 text-sm">Price</p>
                  <p className="text-3xl font-bold text-cyan-400">{item.price}</p>
                  <p className="text-xs text-gray-500">Robux</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Category</p>
                  <p className="text-xl font-bold">{item.category || 'Item'}</p>
                </div>
                {item.limited && (
                  <div>
                    <p className="text-gray-400 text-sm">Remaining</p>
                    <p className="text-xl font-bold text-orange-400">{item.remaining || 0}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 text-sm">Sales</p>
                  <p className="text-xl font-bold">{item.sales || 0}</p>
                </div>
              </div>

              {item.limited && (
                <div className="bg-orange-900 border border-orange-600 rounded p-4 mb-6">
                  <p className="text-orange-100 font-bold">⚠️ LIMITED ITEM</p>
                  <p className="text-orange-200 text-sm mt-1">Only {item.remaining} copies remaining!</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={item.limited ? 1 : 999}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-cyan-500 border-2 border-transparent"
                />
              </div>

              {purchased ? (
                <div className="bg-green-900 text-green-100 p-4 rounded font-bold text-center">
                  ✅ Purchase successful! Redirecting...
                </div>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={item.limited && item.remaining === 0}
                  className={`w-full py-3 rounded font-bold text-lg transition ${
                    item.limited && item.remaining === 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {item.limited && item.remaining === 0 ? 'Out of Stock' : `Buy for ${item.price * quantity} Robux`}
                </button>
              )}
            </div>

            {/* Additional Info */}
            <div className="bg-slate-900 rounded-lg p-6">
              <h3 className="font-bold mb-4">Item Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className="font-semibold">{item.type || 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Released</span>
                  <span className="font-semibold">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                {item.limited && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rarity</span>
                    <span className="font-semibold text-orange-400">LIMITED</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Bought By</span>
                  <span className="font-semibold">{item.sales || 0} players</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
