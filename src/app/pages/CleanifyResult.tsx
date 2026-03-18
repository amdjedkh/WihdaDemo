import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import SwipeBack from '../components/SwipeBack';
import { apiFetch, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, RotateCcw, Award } from 'lucide-react';

interface SubmissionDetail {
  id: string;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  created_at: string;
  completed_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  coins_awarded: number | null;
  description: string | null;
}

export default function CleanifyResult() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { refreshProfile } = useAuth();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    apiFetch(`/v1/cleanify/submissions/${id}`)
      .then((data) => {
        if (data.success) {
          setSubmission(data.data);
          if (data.data.status === 'approved') refreshProfile();
        } else {
          setError('Submission not found');
        }
      })
      .catch(() => setError('Failed to load submission'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <MobileContainer>
      <PageTransition>
        <SwipeBack>
          <div className="flex flex-col size-full bg-white">
            {/* Header */}
            <div className="px-5 pt-[env(safe-area-inset-top)]">
              <div className="flex items-center gap-3 h-14">
                <button onClick={() => navigate(-1)} className="text-gray-800">
                  <ArrowLeft className="size-6" />
                </button>
                <h1 className="text-[18px] font-semibold text-gray-900">Submission Result</h1>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-10">
              {loading ? (
                <div className="flex justify-center pt-20">
                  <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
                </div>
              ) : error || !submission ? (
                <div className="flex flex-col items-center pt-20">
                  <p className="text-gray-400 text-[14px]">{error || 'Not found'}</p>
                  <button onClick={() => navigate(-1)} className="mt-4 text-[#14ae5c] text-[14px] font-medium">Go back</button>
                </div>
              ) : submission.status === 'pending_review' ? (
                <div className="flex flex-col items-center pt-10">
                  <div className="bg-blue-50 rounded-3xl p-8 mb-6">
                    <Loader2 className="size-16 text-blue-400 animate-spin" />
                  </div>
                  <h2 className="text-[22px] font-semibold text-gray-900 mb-2">Under Review</h2>
                  <p className="text-gray-500 text-[14px] text-center px-6 mb-8">
                    Your submission is being reviewed by our AI. You'll receive a notification when done.
                  </p>
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 w-full mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="size-2 rounded-full bg-blue-400 animate-pulse" />
                      <p className="text-[13px] font-semibold text-blue-700">AI is comparing your photos</p>
                    </div>
                    <p className="text-[12px] text-gray-400 pl-4">
                      Submitted {new Date(submission.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {(submission.before_photo_url || submission.after_photo_url) && (
                    <div className="grid grid-cols-2 gap-3 w-full mb-6">
                      {submission.before_photo_url && (
                        <div className="rounded-xl overflow-hidden border border-gray-100">
                          <img src={`${API_BASE}${submission.before_photo_url}`} alt="Before" className="w-full h-[110px] object-cover" />
                          <div className="bg-gray-50 px-2 py-1 text-[10px] text-gray-500 font-medium text-center">Before</div>
                        </div>
                      )}
                      {submission.after_photo_url && (
                        <div className="rounded-xl overflow-hidden border border-gray-100">
                          <img src={`${API_BASE}${submission.after_photo_url}`} alt="After" className="w-full h-[110px] object-cover" />
                          <div className="bg-gray-50 px-2 py-1 text-[10px] text-gray-500 font-medium text-center">After</div>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/activities')}
                    className="w-full border border-gray-200 text-gray-500 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                  >
                    Back to Activities
                  </button>
                </div>
              ) : submission.status === 'approved' ? (
                <div className="flex flex-col items-center pt-10">
                  <div className="bg-green-50 rounded-3xl p-6 mb-4">
                    <CheckCircle2 className="size-16 text-[#14ae5c]" />
                  </div>
                  <h2 className="text-[22px] font-semibold text-[#14ae5c] mb-2">Approved!</h2>
                  <p className="text-gray-500 text-[14px] text-center mb-6">Great job making your neighborhood cleaner!</p>

                  {submission.coins_awarded != null && (
                    <div className="bg-gradient-to-br from-[#fff9e6] to-[#fff3cc] rounded-2xl p-6 w-full text-center mb-6">
                      <p className="text-[12px] text-gray-500 mb-2">Coins Earned</p>
                      <div className="flex items-center justify-center gap-2">
                        <Award className="size-7 text-[#f0a326]" />
                        <span className="text-[40px] font-bold text-[#f0a326]">{submission.coins_awarded}</span>
                      </div>
                    </div>
                  )}

                  {(submission.before_photo_url || submission.after_photo_url) && (
                    <div className="grid grid-cols-2 gap-3 w-full mb-6">
                      {submission.before_photo_url && (
                        <div className="rounded-xl overflow-hidden border border-gray-100">
                          <img src={`${API_BASE}${submission.before_photo_url}`} alt="Before" className="w-full h-[100px] object-cover" />
                          <div className="bg-red-50 px-2 py-1 text-[10px] text-red-500 font-medium text-center">Before</div>
                        </div>
                      )}
                      {submission.after_photo_url && (
                        <div className="rounded-xl overflow-hidden border border-gray-100">
                          <img src={`${API_BASE}${submission.after_photo_url}`} alt="After" className="w-full h-[100px] object-cover" />
                          <div className="bg-green-50 px-2 py-1 text-[10px] text-[#14ae5c] font-medium text-center">After</div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[12px] text-gray-400 mb-6">
                    Reviewed {submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </p>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => navigate('/activities')}
                      className="flex-1 bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => navigate('/clean-earn')}
                      className="flex-1 border-2 border-[#14ae5c] text-[#14ae5c] py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="size-4" /> Again
                    </button>
                  </div>
                </div>
              ) : submission.status === 'rejected' ? (
                <div className="flex flex-col items-center pt-10">
                  <div className="bg-red-50 rounded-3xl p-6 mb-4">
                    <XCircle className="size-16 text-red-500" />
                  </div>
                  <h2 className="text-[22px] font-semibold text-red-500 mb-2">Not Approved</h2>
                  <p className="text-gray-500 text-[14px] text-center mb-6 px-4">
                    We couldn't verify enough improvement in your photos.
                  </p>

                  {submission.review_note && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 w-full mb-6">
                      <p className="text-[13px] font-semibold text-red-600 mb-1">Reason</p>
                      <p className="text-[13px] text-gray-600">{submission.review_note}</p>
                    </div>
                  )}

                  {(submission.before_photo_url || submission.after_photo_url) && (
                    <div className="grid grid-cols-2 gap-3 w-full mb-6">
                      {submission.before_photo_url && (
                        <div className="rounded-xl overflow-hidden border border-gray-100">
                          <img src={`${API_BASE}${submission.before_photo_url}`} alt="Before" className="w-full h-[100px] object-cover" />
                          <div className="bg-gray-50 px-2 py-1 text-[10px] text-gray-500 font-medium text-center">Before</div>
                        </div>
                      )}
                      {submission.after_photo_url && (
                        <div className="rounded-xl overflow-hidden border border-gray-100">
                          <img src={`${API_BASE}${submission.after_photo_url}`} alt="After" className="w-full h-[100px] object-cover" />
                          <div className="bg-gray-50 px-2 py-1 text-[10px] text-gray-500 font-medium text-center">After</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => navigate('/clean-earn')}
                      className="flex-1 bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="size-4" /> Try Again
                    </button>
                    <button
                      onClick={() => navigate('/activities')}
                      className="flex-1 border-2 border-gray-200 text-gray-500 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center pt-10">
                  <div className="bg-orange-50 rounded-3xl p-6 mb-4">
                    <Clock className="size-16 text-orange-400" />
                  </div>
                  <h2 className="text-[22px] font-semibold text-gray-900 mb-2">
                    {submission.status === 'in_progress' ? 'In Progress' : 'Draft'}
                  </h2>
                  <p className="text-gray-500 text-[14px] text-center mb-6">
                    This session is still active.
                  </p>
                  <button
                    onClick={() => navigate('/clean-earn')}
                    className="w-full bg-[#14ae5c] text-white py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                  >
                    Continue Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}
