import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import SwipeBack from '../components/SwipeBack';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, ChevronRight, Leaf } from 'lucide-react';

interface Submission {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  coins_awarded: number | null;
  review_note: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  approved: { label: 'Approved', color: 'text-[#14ae5c]', bg: 'bg-green-50', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-500', bg: 'bg-red-50', icon: XCircle },
  pending_review: { label: 'Under Review', color: 'text-blue-500', bg: 'bg-blue-50', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-orange-500', bg: 'bg-orange-50', icon: Clock },
  draft_before: { label: 'Draft', color: 'text-gray-500', bg: 'bg-gray-50', icon: Clock },
  expired: { label: 'Expired', color: 'text-gray-400', bg: 'bg-gray-50', icon: XCircle },
};

export default function CleanifyHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useApp();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    apiFetch('/v1/cleanify/submissions')
      .then((data) => {
        if (data.success) setSubmissions(data.data.submissions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <MobileContainer>
      <PageTransition>
        <SwipeBack>
          <div className="flex flex-col size-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="px-5 pt-[env(safe-area-inset-top)]">
              <div className="flex items-center gap-3 h-14">
                <button onClick={() => navigate(-1)} className="text-gray-800 dark:text-gray-200">
                  <ArrowLeft className="size-6" />
                </button>
                <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white">{t(language, 'cleanHistoryTitle')}</h1>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8">
              {!user ? (
                <div className="flex flex-col items-center pt-20">
                  <Leaf className="size-12 text-gray-200 mb-3" />
                  <p className="text-gray-400 text-[14px]">{t(language, 'signInForHistory')}</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="mt-4 bg-[#14ae5c] text-white px-6 py-2.5 rounded-xl text-[14px] font-semibold"
                  >
                    {t(language, 'signIn')}
                  </button>
                </div>
              ) : loading ? (
                <div className="flex justify-center pt-20">
                  <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="flex flex-col items-center pt-20">
                  <Leaf className="size-12 text-gray-200 mb-3" />
                  <p className="text-[16px] font-semibold text-gray-700 dark:text-gray-200 mb-1">{t(language, 'noSubmissions')}</p>
                  <p className="text-gray-400 text-[13px] text-center px-8">{t(language, 'noSubmissionsDesc')}</p>
                  <button
                    onClick={() => navigate('/clean-earn')}
                    className="mt-5 bg-[#14ae5c] text-white px-6 py-2.5 rounded-xl text-[14px] font-semibold"
                  >
                    {t(language, 'startCleaning')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {submissions.map((sub) => {
                    const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG['expired'];
                    const StatusIcon = cfg.icon;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => navigate(`/cleanify-result/${sub.id}`)}
                        className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors text-left shadow-sm"
                      >
                        <div className={`${cfg.bg} rounded-xl p-2.5 shrink-0`}>
                          <StatusIcon className={`size-5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                            {t(language, 'cleaningSubmission')}
                          </p>
                          <p className="text-[12px] text-gray-400 mt-0.5">
                            {new Date(sub.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[12px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                          {sub.status === 'approved' && sub.coins_awarded != null && (
                            <span className="text-[11px] text-[#f0a326] font-medium">+{sub.coins_awarded} coins</span>
                          )}
                        </div>
                        <ChevronRight className="size-4 text-gray-300 shrink-0 ml-1" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}
