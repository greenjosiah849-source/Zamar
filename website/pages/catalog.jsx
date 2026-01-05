import React, { useEffect, useState } from 'react';
import { useCatalogStore, useAuthStore } from '@/lib/store';
import Navigation from '@/components/Navigation';

export default function CatalogPage() {
  const { items, isLoading, fetchCatalog } = useCatalogStore();
  const { token } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categories = [
    'Hats', 'Hair', 'Faces', 'Shirts', 'Pants', 'Accessories', 'Bundles'
  ];

  useEffect(() => {
    if (token) {
      fetchCatalog(token, selectedCategory);
    }
  }, [token, selectedCategory]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#0a0e27] py-8">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-bold text-[#00D7FF] mb-8">CATALOG</h1>

          {/* Category Filter */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                !selectedCategory ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded whitespace-nowrap ${
                  selectedCategory === cat ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          {isLoading ? (
            <div className="text-center text-[#888888]">Loading items...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {items.map((item) => (
                <div key={item.itemId} className="card">
                  <div className="bg-[#2a3050] w-full h-48 rounded mb-4 flex items-center justify-center">
                    <span className="text-[#888888]">Item Preview</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                  <p className="text-[#888888] text-sm mb-3">{item.category}</p>
                  <p className="text-[#888888] text-xs mb-3">{item.description}</p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#00D7FF] font-bold">{item.price} 💰</span>
                    {item.isLimited && (
                      <span className="text-red-500 text-xs">Limited: {item.remainingSupply}</span>
                    )}
                  </div>

                  <button className="w-full btn-primary py-2 text-sm">
                    BUY NOW
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
