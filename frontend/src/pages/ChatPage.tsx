import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image, Music, Loader2, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore from '../stores/usePlayerStore';
import { DEFAULT_AVATAR } from '../components/common';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  shared_track_id?: string;
  shared_track_title?: string;
  shared_track_artist?: string;
  shared_track_thumbnail?: string;
  created_at: string;
}

interface OtherUser {
  id: string;
  username: string;
  avatar_url?: string;
  full_name?: string;
  member_type?: string;
  artist_browse_id?: string;
}

// Backend API URL
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { startPlayback } = usePlayerStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset parent scroll position on mount
  useLayoutEffect(() => {
    // Find and reset the parent main scroll container
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
    // Also reset body scroll
    window.scrollTo(0, 0);
  }, [conversationId]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages and other user
  useEffect(() => {
    async function fetchData() {
      if (!conversationId || !user?.id) return;

      try {
        // Get other participant
        const { data: participantData } = await supabase
          .from('conversation_participants')
          .select(
            `
            user_id,
            profiles:user_id (
              id,
              username,
              avatar_url,
              full_name,
              member_type,
              artist_browse_id
            )
          `
          )
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
          .single();

        if (participantData?.profiles) {
          const profiles = participantData.profiles as unknown as OtherUser;
          setOtherUser(profiles);
        }

        // Get messages
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(messagesData || []);

        // Update last_read_at
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error fetching chat:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [conversationId, user?.id]);

  // Check if message is a temporary duplicate
  const isTemporaryDuplicate = useCallback(
    (existingMsg: Message, newMsg: Message) =>
      existingMsg.id.startsWith('temp-') &&
      existingMsg.content === newMsg.content &&
      existingMsg.sender_id === newMsg.sender_id,
    []
  );

  // Replace temporary message with real one
  const replaceTempMessage = useCallback(
    (msg: Message, newMsg: Message) => (isTemporaryDuplicate(msg, newMsg) ? newMsg : msg),
    [isTemporaryDuplicate]
  );

  // Handle new message from realtime subscription
  const handleNewMessage = useCallback(
    (newMsg: Message) => {
      setMessages((prev) => {
        const exists = prev.some(
          (msg) => msg.id === newMsg.id || isTemporaryDuplicate(msg, newMsg)
        );
        if (exists) {
          return prev.map((msg) => replaceTempMessage(msg, newMsg));
        }
        return [...prev, newMsg];
      });
      scrollToBottom();
    },
    [isTemporaryDuplicate, replaceTempMessage, scrollToBottom]
  );

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          handleNewMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, handleNewMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user?.id || sending) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistically add message to UI immediately
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: user.id,
      content: messageContent,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    scrollToBottom();

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one from database
      if (data) {
        setMessages((prev) => prev.map((msg) => (msg.id === tempId ? data : msg)));
      }

      // If recipient is a virtual member (artist), request auto-reply
      if (otherUser?.member_type === 'artist' || otherUser?.artist_browse_id) {
        try {
          await fetch(`${API_BASE_URL}/api/messages/auto-reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientId: otherUser.id,
              userMessage: messageContent,
              conversationId: conversationId,
            }),
          });
        } catch (autoReplyError) {
          console.error('Auto-reply request failed:', autoReplyError);
          // Don't throw - auto-reply failure shouldn't affect message sending
        }
      }

      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(messageContent); // Restore the message
    } finally {
      setSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Play shared track
  const handlePlayTrack = (message: Message) => {
    if (!message.shared_track_id) return;
    startPlayback(
      [
        {
          videoId: message.shared_track_id,
          title: message.shared_track_title || 'Unknown',
          artist: message.shared_track_artist || 'Unknown',
          thumbnail: message.shared_track_thumbnail || '',
        },
      ],
      0
    );
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach((message) => {
      const msgDate = new Date(message.created_at).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [] });
      }
      groups[groups.length - 1].messages.push(message);
    });

    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-black">
        <p className="text-gray-500">Please log in to view messages</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex flex-col bg-white dark:bg-black overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
        <button onClick={() => navigate('/messages')} className="p-1 text-black dark:text-white">
          <ArrowLeft size={24} />
        </button>
        {otherUser && (
          <button
            type="button"
            className="flex items-center gap-3 flex-1 cursor-pointer p-0 bg-transparent border-0"
            onClick={() => navigate(`/profile/${otherUser.id}`)}
          >
            <img
              src={otherUser.avatar_url || DEFAULT_AVATAR}
              alt={otherUser.username}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="text-left">
              <p className="font-semibold text-black dark:text-white">{otherUser.username}</p>
              {otherUser.full_name && (
                <p className="text-xs text-gray-500">{otherUser.full_name}</p>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <img
              src={otherUser?.avatar_url || DEFAULT_AVATAR}
              alt={otherUser?.username}
              className="w-20 h-20 rounded-full object-cover mb-4"
            />
            <p className="font-semibold text-black dark:text-white">{otherUser?.username}</p>
            <p className="text-sm text-gray-500 mt-1">Start a conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupMessagesByDate().map((group) => (
              <div key={group.date}>
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {formatDateHeader(group.date)}
                  </span>
                </div>
                {group.messages.map((message) => {
                  const isOwn = message.sender_id === user.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-bl-md'
                        }`}
                      >
                        {/* Shared track */}
                        {message.shared_track_id && (
                          <button
                            type="button"
                            onClick={() => handlePlayTrack(message)}
                            className={`flex items-center gap-2 p-2 rounded-lg mb-2 cursor-pointer w-full text-left ${
                              isOwn ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <img
                              src={
                                message.shared_track_thumbnail || 'https://via.placeholder.com/50'
                              }
                              alt={message.shared_track_title}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {message.shared_track_title}
                              </p>
                              <p
                                className={`text-xs ${isOwn ? 'text-blue-200' : 'text-gray-500'} truncate`}
                              >
                                {message.shared_track_artist}
                              </p>
                            </div>
                            <Play size={18} fill="currentColor" />
                          </button>
                        )}

                        {/* Message text */}
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex items-center gap-2">
          <button className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <Image size={22} />
          </button>
          <button className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <Music size={22} />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Message..."
            className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-full py-2.5 px-4 text-sm focus:outline-none"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0 p-2 text-blue-500 disabled:opacity-50"
          >
            {sending ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
}
