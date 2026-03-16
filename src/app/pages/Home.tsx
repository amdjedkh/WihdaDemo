import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import MobileContainer from '../components/MobileContainer';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import PageTransition from '../components/PageTransition';
import PullToRefresh from '../components/PullToRefresh';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import babyClothesImg from 'figma:asset/6ca96903cfde7315c572f9598645ca9fc8a8e6ca.png';
import {
  Utensils,
  Package,
  Handshake,
  HeartHandshake,
  HelpCircle,
  ArrowLeftRight,
  Sparkles,
  Calendar,
  Users,
  ChevronRight,
} from 'lucide-react';

const categories = [
  {
    id: 'leftovers',
    title: 'Leftovers',
    subtitle: 'Share extra food',
    icon: Utensils,
    gradient: 'from-orange-400 to-orange-500',
    bg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    image: 'https://images.unsplash.com/photo-1551386170-8b63c22c94e8?w=400&h=300&fit=crop',
  },
  {
    id: 'old-items',
    title: 'Old Items',
    subtitle: 'Give or reuse',
    icon: Package,
    gradient: 'from-blue-400 to-blue-500',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    image: 'https://images.unsplash.com/photo-1669379799444-8f328db1970f?w=400&h=300&fit=crop',
  },
  {
    id: 'borrow',
    title: 'Borrow',
    subtitle: 'Lend or borrow',
    icon: Handshake,
    gradient: 'from-purple-400 to-purple-500',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-500',
    image: 'https://images.unsplash.com/photo-1585406666850-82f7532fdae3?w=400&h=300&fit=crop',
  },
  {
    id: 'offer-help',
    title: 'Offer Help',
    subtitle: 'Support neighbors',
    icon: HeartHandshake,
    gradient: 'from-green-400 to-green-500',
    bg: 'bg-green-50',
    iconColor: 'text-green-500',
    image: 'https://images.unsplash.com/photo-1601566674556-3ac2a27fec9f?w=400&h=300&fit=crop',
  },
  {
    id: 'ask-help',
    title: 'Ask Help',
    subtitle: 'Request support',
    icon: HelpCircle,
    gradient: 'from-rose-400 to-rose-500',
    bg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    image: 'https://images.unsplash.com/photo-1601566674556-3ac2a27fec9f?w=400&h=300&fit=crop',
  },
  {
    id: 'exchange',
    title: 'Exchange',
    subtitle: 'Swap items',
    icon: ArrowLeftRight,
    gradient: 'from-teal-400 to-teal-500',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-500',
    image: 'https://images.unsplash.com/photo-1631758537805-d6fe64e1c8ce?w=400&h=300&fit=crop',
  },
];

const upcomingActivities = [
  {
    id: 1,
    title: 'Red Cross First Aid Training',
    date: 'Mar 5',
    participants: 24,
    coins: 300,
    image: 'https://images.unsplash.com/photo-1605714007165-c15eac9c647b?w=400&h=200&fit=crop',
  },
  {
    id: 2,
    title: 'Community Park Cleanup',
    date: 'Mar 8',
    participants: 18,
    coins: 200,
    image: 'https://images.unsplash.com/photo-1612159788732-e189a4dd2284?w=400&h=200&fit=crop',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'neighbor' | 'neighborhood'>('neighbor');
  const navigate = useNavigate();

  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    toast('Feed refreshed!', {
      description: 'Latest posts loaded',
      duration: 2000,
    });
  }, []);

  return (
    <MobileContainer>
      <PageTransition type="fade">
        <div className="flex flex-col size-full bg-white">
          <Header />

          {/* Toggle */}
          <div className="px-5 mb-4">
            <div className="bg-gray-100 rounded-full p-1 flex">
              <button
                onClick={() => setActiveTab('neighbor')}
                className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-all duration-300 ${
                  activeTab === 'neighbor'
                    ? 'bg-[#14ae5c] text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                My Neighbor
              </button>
              <button
                onClick={() => setActiveTab('neighborhood')}
                className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-all duration-300 ${
                  activeTab === 'neighborhood'
                    ? 'bg-[#14ae5c] text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                My Neighborhood
              </button>
            </div>
          </div>

          {/* Content */}
          <PullToRefresh onRefresh={handleRefresh} className="pb-24 px-5">
            {activeTab === 'neighbor' ? (
              <>
                <p className="text-[15px] font-semibold text-gray-800 mb-4 animate-slide-up">
                  Need something or want to share today?
                </p>

                {/* Category Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6 stagger-children">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/category/${cat.id}`)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-90 transition-all duration-150"
                    >
                      <div className={`${cat.bg} rounded-xl p-3`}>
                        <cat.icon className={`size-6 ${cat.iconColor}`} />
                      </div>
                      <div className="text-center">
                        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{cat.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{cat.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="relative rounded-2xl overflow-hidden mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <img
                    src="https://images.unsplash.com/photo-1758599667718-684569efe224?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHBlb3BsZSUyMGNsZWFuaW5nJTIwY29tbXVuaXR5JTIwdm9sdW50ZWVyfGVufDF8fHx8MTc3MjIwNTAxNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Happy people cleaning"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#14ae5c]/90 via-[#14ae5c]/75 to-transparent" />
                  <div className="relative p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="size-4 text-yellow-300" />
                      <span className="text-white/80 text-[12px] font-medium">Featured</span>
                    </div>
                    <h3 className="text-white text-[16px] font-semibold mb-1">Clean & Earn</h3>
                    <p className="text-white/70 text-[12px] mb-3">Clean your area, earn coins!</p>
                    <button
                      onClick={() => navigate('/clean-earn')}
                      className="bg-white text-[#14ae5c] px-4 py-2 rounded-full text-[12px] font-semibold active:scale-95 transition-transform"
                    >
                      Start Now
                    </button>
                  </div>
                </div>

                {/* Recent Posts Preview */}
                <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-semibold text-gray-800">Recent Shares</h3>
                    <button className="text-[#14ae5c] text-[12px] font-medium flex items-center gap-0.5">
                      See all <ChevronRight className="size-3" />
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2">
                    <RecentPostCard
                      name="Oualid L."
                      item="Fresh homemade bread"
                      time="1hr ago"
                      coins={100}
                      image="https://images.unsplash.com/photo-1661509833506-266e183dbe6c?w=200&h=200&fit=crop"
                    />
                    <RecentPostCard
                      name="Sara M."
                      item="Baby clothes (6mo)"
                      time="3hr ago"
                      coins={80}
                      image={babyClothesImg}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-gray-800 mb-4 animate-slide-up">
                  What's happening in your neighborhood
                </p>

                {/* Clean & Earn CTA */}
                <button
                  onClick={() => navigate('/clean-earn')}
                  className="w-full bg-gradient-to-r from-[#14ae5c] to-[#0d9e4f] text-white rounded-2xl p-4 mb-5 flex items-center gap-3 active:scale-[0.97] transition-all duration-150 animate-slide-up"
                >
                  <div className="bg-white/20 rounded-full p-2.5">
                    <Sparkles className="size-5 text-yellow-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[14px] font-semibold">Clean & Earn Coins</p>
                    <p className="text-[11px] text-white/70">Make your neighborhood shine</p>
                  </div>
                  <ChevronRight className="size-5 text-white/60" />
                </button>

                {/* Upcoming Activities */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-semibold text-gray-800">Upcoming Activities</h3>
                  <button
                    onClick={() => navigate('/activities')}
                    className="text-[#14ae5c] text-[12px] font-medium flex items-center gap-0.5"
                  >
                    View all <ChevronRight className="size-3" />
                  </button>
                </div>

                <div className="stagger-children">
                  {upcomingActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3 shadow-sm"
                    >
                      <ImageWithFallback
                        src={activity.image}
                        alt={activity.title}
                        className="w-full h-[130px] object-cover"
                      />
                      <div className="p-3">
                        <h4 className="text-[14px] font-semibold text-gray-800">{activity.title}</h4>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                            <Calendar className="size-3" />
                            {activity.date}
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                            <Users className="size-3" />
                            {activity.participants} joined
                          </div>
                          <div className="flex items-center gap-1 text-[#f0a326] text-[11px] font-semibold ml-auto">
                            <div className="size-[14px] rounded-full border-[1.5px] border-[#f0a326] flex items-center justify-center">
                              <span className="text-[6px] font-bold">$</span>
                            </div>
                            {activity.coins}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/activities')}
                          className="mt-3 w-full bg-[#14ae5c] text-white py-2.5 rounded-xl text-[13px] font-semibold active:scale-[0.97] transition-all duration-150"
                        >
                          Join Activity
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PullToRefresh>

          <BottomNav />
        </div>
      </PageTransition>
    </MobileContainer>
  );
}

function RecentPostCard({ name, item, time, coins, image }: {
  name: string;
  item: string;
  time: string;
  coins: number;
  image: string;
}) {
  return (
    <div className="min-w-[200px] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:scale-95 transition-all duration-150">
      <ImageWithFallback src={image} alt={item} className="w-full h-[100px] object-cover" />
      <div className="p-3">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{item}</p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-gray-400">{name} &middot; {time}</p>
          <div className="flex items-center gap-1 text-[#f0a326] text-[11px] font-semibold">
            <div className="size-[12px] rounded-full border border-[#f0a326] flex items-center justify-center">
              <span className="text-[6px] font-bold">$</span>
            </div>
            {coins}
          </div>
        </div>
      </div>
    </div>
  );
}
