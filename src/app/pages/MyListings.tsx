import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import { apiFetch } from '../lib/api';
import { ArrowLeft, Package, MessageCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';

export default function MyListings() {
  const navigate = useNavigate();
  const { language } = useApp();
  const [activeTab, setActiveTab] = useState<'posts' | 'matches'>('posts');
  const [offers, setOffers] = useState<any[]>([]);
  const [needs, setNeeds] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      apiFetch('/v1/leftovers/offers?status=mine'),
      apiFetch('/v1/leftovers/needs?status=mine'),
      apiFetch('/v1/leftovers/matches'),
    ]).then(([offersRes, needsRes, matchesRes]) => {
      if (offersRes.status === 'fulfilled') setOffers(offersRes.value?.data?.offers || []);
      if (needsRes.status === 'fulfilled') setNeeds(needsRes.value?.data?.needs || []);
      if (matchesRes.status === 'fulfilled') setMatches(matchesRes.value?.data?.matches || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <MobileContainer>
      <PageTransition>
      <div className="flex flex-col size-full bg-white dark:bg-gray-900">
        <div className="px-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-800 dark:text-gray-200"><ArrowLeft className="size-6" /></button>
            <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white flex-1 font-[Poppins,sans-serif]">{t(language, 'myListingsTitle')}</h1>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${activeTab === 'posts' ? 'bg-[#14ae5c] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {t(language, 'myPosts')}
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${activeTab === 'matches' ? 'bg-[#14ae5c] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {t(language, 'myMatches')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-8 text-[#14ae5c] animate-spin" /></div>
          ) : activeTab === 'posts' ? (
            <div className="space-y-3">
              {offers.length === 0 && needs.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="size-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-[14px]">{t(language, 'noPosts')}</p>
                  <button onClick={() => navigate('/home')} className="mt-3 text-[#14ae5c] text-[13px] font-semibold">{t(language, 'startSharing')}</button>
                </div>
              ) : (
                <>
                  {offers.map((o: any) => (
                    <div key={o.id} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-semibold text-gray-800">{o.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Offer · {o.survey?.food_type}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${o.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {needs.map((n: any) => (
                    <div key={n.id} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-semibold text-gray-800">Food Request</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Need · {n.survey?.food_type}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${n.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          {n.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {matches.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="size-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-[14px]">{t(language, 'noMatches')}</p>
                  <p className="text-gray-400 text-[12px] mt-1">{t(language, 'noMatchesDesc')}</p>
                </div>
              ) : matches.map((m: any) => (
                <div key={m.id} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[14px] font-semibold text-gray-800">{m.offer?.title || 'Exchange'}</p>
                      <p className="text-[11px] text-gray-400">with {m.other_user?.display_name || 'Neighbor'}</p>
                    </div>
                    {m.status === 'closed' ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : (
                      <Clock className="size-5 text-blue-400" />
                    )}
                  </div>
                  {m.chat_thread_id && m.status !== 'closed' && (
                    <button
                      onClick={() => navigate(`/chat/${m.chat_thread_id}`)}
                      className="w-full bg-[#14ae5c] text-white py-2 rounded-xl text-[12px] font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <MessageCircle className="size-4" /> {t(language, 'openChat')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </PageTransition>
    </MobileContainer>
  );
}
