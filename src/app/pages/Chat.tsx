import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import MobileContainer from '../components/MobileContainer';
import PageTransition from '../components/PageTransition';
import SwipeBack from '../components/SwipeBack';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft, Send, MoreVertical, CheckCheck, Award, Loader2, Clock,
} from 'lucide-react';

interface Message {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  message_type: string;
}

interface ThreadInfo {
  id: string;
  match_id: string;
  match?: {
    id: string;
    status: string;
    score?: number;
  } | null;
  other_user?: {
    id: string;
    display_name: string;
  } | null;
  status: string;
  created_at: string;
  closed_at?: string | null;
}

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loadingThread, setLoadingThread] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [confirmationState, setConfirmationState] = useState<'idle' | 'completed'>('idle');
  const [confirmingClose, setConfirmingClose] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadThread = useCallback(async () => {
    if (!chatId) return;
    try {
      const data = await apiFetch(`/v1/chats/${chatId}`);
      if (data.success) {
        setThread(data.data);
        // If thread/match is already closed, mark completed
        if (data.data.status === 'closed' || data.data.match?.status === 'closed') {
          setConfirmationState('completed');
        }
      }
    } catch {}
  }, [chatId]);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const data = await apiFetch(`/v1/chats/${chatId}/messages`);
      if (data.success) {
        setMessages(data.data.messages || []);
        scrollToBottom();
      }
    } catch {}
  }, [chatId]);

  useEffect(() => {
    const init = async () => {
      setLoadingThread(true);
      await Promise.all([loadThread(), loadMessages()]);
      setLoadingThread(false);
    };
    init();

    // Poll for new messages every 4 seconds
    pollRef.current = setInterval(() => {
      loadMessages();
      loadThread();
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadThread, loadMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage || !chatId) return;
    setSendingMessage(true);
    const text = newMessage.trim();
    setNewMessage('');
    try {
      await apiFetch(`/v1/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: text, message_type: 'text' }),
      });
      await loadMessages();
    } catch {
      toast.error('Failed to send message');
      setNewMessage(text);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRequestClose = async () => {
    if (!thread?.match_id || confirmingClose) return;
    setConfirmingClose(true);
    try {
      const data = await apiFetch(`/v1/leftovers/matches/${thread.match_id}/close`, {
        method: 'POST',
        body: JSON.stringify({ closure_type: 'successful' }),
      });
      if (data.success) {
        setConfirmationState('completed');
        toast.success('Exchange confirmed!', { description: 'Coins have been awarded!' });
        await loadThread();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not confirm exchange');
    } finally {
      setConfirmingClose(false);
    }
  };

  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const otherUserName = thread?.other_user?.display_name || 'Exchange Chat';

  if (loadingThread) {
    return (
      <MobileContainer>
        <div className="flex items-center justify-center size-full bg-white">
          <Loader2 className="size-8 text-[#14ae5c] animate-spin" />
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <PageTransition>
      <Toaster position="top-center" />
      <SwipeBack>
      <div className="flex flex-col size-full bg-gray-50">
        {/* Header */}
        <div className="bg-white px-4 pt-[env(safe-area-inset-top)] pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3 h-14">
            <button onClick={() => navigate(-1)} className="text-gray-800">
              <ArrowLeft className="size-6" />
            </button>
            <div className="size-10 rounded-full bg-[#14ae5c]/10 flex items-center justify-center">
              <span className="text-[18px]">💬</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-gray-800 truncate">
                {otherUserName}
              </p>
              <p className="text-[11px] text-gray-400 truncate">Item Exchange</p>
            </div>
            <button className="text-gray-400">
              <MoreVertical className="size-5" />
            </button>
          </div>

          <div className="bg-green-50 rounded-xl px-3 py-2 flex items-center gap-2 mt-1">
            <div className="size-2 rounded-full bg-[#14ae5c] animate-pulse" />
            <p className="text-[11px] text-gray-600">
              <span className="font-medium text-gray-800">Exchange</span> · Active transaction
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:max-w-3xl md:mx-auto md:w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-[48px] mb-3">👋</span>
              <p className="text-[14px] font-medium text-gray-700">Start the conversation</p>
              <p className="text-[12px] text-gray-400 mt-1">Coordinate your exchange here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 ${
                      isMe
                        ? 'bg-[#14ae5c] text-white rounded-2xl rounded-br-md'
                        : 'bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm'
                    }`}>
                      <p className="text-[14px] leading-relaxed">{msg.body}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                        <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                        {isMe && <CheckCheck className="size-3 text-white/60" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Exchange Confirmation Panel */}
          {confirmationState !== 'completed' && thread?.match_id && (
            <div className="bg-white rounded-2xl p-4 mt-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Award className="size-5 text-[#f0a326]" />
                <p className="text-[14px] font-semibold text-gray-800">
                  Mark Exchange as Complete?
                </p>
              </div>
              <p className="text-[12px] text-gray-500 mb-3">
                Once confirmed, coins will be awarded to both parties!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRequestClose}
                  disabled={confirmingClose}
                  className="flex-1 bg-[#14ae5c] text-white py-2.5 rounded-xl text-[13px] font-semibold active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {confirmingClose
                    ? <Loader2 className="size-4 animate-spin" />
                    : 'I gave / received the item'}
                </button>
              </div>
            </div>
          )}

          {confirmationState === 'completed' && (
            <div className="bg-green-50 rounded-2xl p-4 mt-4 border border-green-100">
              <div className="flex items-center gap-2">
                <span className="text-[20px]">🎉</span>
                <div>
                  <p className="text-[14px] font-semibold text-green-800">Exchange Completed!</p>
                  <p className="text-[12px] text-green-600">Coins have been awarded to both parties.</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="bg-white px-4 py-3 border-t border-gray-100 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex items-center gap-2 md:max-w-3xl md:mx-auto">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-[14px] placeholder:text-gray-400 border border-gray-100 focus:border-[#14ae5c] focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              className={`size-[42px] rounded-full flex items-center justify-center transition-all active:scale-95 ${
                newMessage.trim() && !sendingMessage
                  ? 'bg-[#14ae5c] text-white shadow-md'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {sendingMessage ? <Loader2 className="size-4 animate-spin text-gray-400" /> : <Send className="size-5" />}
            </button>
          </div>
        </form>
      </div>
      </SwipeBack>
      </PageTransition>
    </MobileContainer>
  );
}
