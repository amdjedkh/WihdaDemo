import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import { ArrowLeft, Flame, Award, Package, Leaf, TrendingUp, Loader2 } from 'lucide-react';

export default function MyImpact() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ cleanify: 0, coins: 0, badgesEarned: 0, itemsShared: 0, totalCoinsEarned: 0 });
  const [coinHistory, setCoinHistory] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      apiFetch('/v1/cleanify/stats'),
      apiFetch('/v1/me/coins'),
      apiFetch('/v1/me/badges'),
      apiFetch('/v1/leftovers/offers?status=mine'),
    ]).then(([cleanifyRes, coinsRes, badgesRes, offersRes]) => {
      const newStats = { cleanify: 0, coins: 0, badgesEarned: 0, itemsShared: 0, totalCoinsEarned: 0 };
      if (cleanifyRes.status === 'fulfilled') newStats.cleanify = cleanifyRes.value?.data?.user?.total_approved ?? 0;
      if (coinsRes.status === 'fulfilled') {
        const entries = coinsRes.value?.data?.entries || [];
        setCoinHistory(entries.slice(0, 5));
        newStats.totalCoinsEarned = entries.filter((e: any) => e.amount > 0).reduce((sum: number, e: any) => sum + e.amount, 0);
        newStats.coins = entries.reduce((sum: number, e: any) => sum + e.amount, 0);
      }
      if (badgesRes.status === 'fulfilled') newStats.badgesEarned = (badgesRes.value?.data?.badges || []).filter((b: any) => b.earned).length;
      if (offersRes.status === 'fulfilled') newStats.itemsShared = (offersRes.value?.data?.offers || []).length;
      setStats(newStats);
    }).finally(() => setLoading(false));
  }, []);

  const impactItems = [
    { label: 'Cleanify Actions', value: stats.cleanify, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Community cleanups completed' },
    { label: 'Items Shared', value: stats.itemsShared, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Items shared with neighbors' },
    { label: 'Badges Earned', value: stats.badgesEarned, icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50', desc: 'Community achievements' },
    { label: 'Coins Earned', value: stats.totalCoinsEarned, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', desc: 'Total rewards earned' },
  ];

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-white">
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-800"><ArrowLeft className="size-6" /></button>
            <h1 className="text-[18px] font-semibold text-gray-900 flex-1 font-[Poppins,sans-serif]">My Impact</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-8 text-[#14ae5c] animate-spin" /></div>
          ) : (
            <>
              {/* Hero stat */}
              <div className="bg-gradient-to-r from-[#14ae5c] to-emerald-500 rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="size-5 text-white" />
                  <p className="text-white/80 text-[13px]">Your community contribution</p>
                </div>
                <p className="text-white text-[32px] font-bold">{stats.cleanify + stats.itemsShared}</p>
                <p className="text-white/70 text-[12px]">total community actions</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {impactItems.map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-2xl p-4">
                    <div className={`${item.bg} rounded-full w-10 h-10 flex items-center justify-center mb-2`}>
                      <item.icon className={`size-5 ${item.color}`} />
                    </div>
                    <p className="text-[22px] font-bold text-gray-800">{item.value}</p>
                    <p className="text-[12px] font-medium text-gray-600">{item.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Recent coin history */}
              {coinHistory.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-800 mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {coinHistory.map((entry: any) => (
                      <div key={entry.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="size-8 rounded-full bg-yellow-50 flex items-center justify-center">
                          <Award className="size-4 text-[#f0a326]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-gray-700 truncate">{entry.description || entry.category}</p>
                          <p className="text-[10px] text-gray-400">{new Date(entry.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[12px] font-semibold ${entry.amount >= 0 ? 'text-[#14ae5c]' : 'text-red-500'}`}>
                          {entry.amount >= 0 ? '+' : ''}{entry.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
