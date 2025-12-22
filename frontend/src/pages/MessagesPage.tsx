import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Edit, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';

interface SearchedUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Participant {
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
    full_name?: string;
  };
}

interface Conversation {
  id: string;
  updated_at: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unreadCount: number;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  // Fetch conversations
  useEffect(() => {
    async function fetchConversations() {
      if (!user?.id) return;

      try {
        // Get conversations with participants
        const { data: participantData, error } = await supabase
          .from('conversation_participants')
          .select(
            `
            conversation_id,
            last_read_at,
            conversations!inner (
              id,
              updated_at
            )
          `
          )
          .eq('user_id', user.id)
          .order('conversations(updated_at)', { ascending: false });

        if (error) throw error;

        const conversationIds = (participantData || []).map((p) => p.conversation_id);

        if (conversationIds.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get all participants for these conversations
        const { data: allParticipants } = await supabase
          .from('conversation_participants')
          .select(
            `
            conversation_id,
            user_id,
            profiles:user_id (
              username,
              avatar_url,
              full_name
            )
          `
          )
          .in('conversation_id', conversationIds)
          .neq('user_id', user.id);

        // Get last message for each conversation
        const { data: lastMessages } = await supabase
          .from('messages')
          .select('conversation_id, content, created_at, sender_id')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false });

        // Get unread counts
        const lastReadMap: { [key: string]: string } = {};
        (participantData || []).forEach((p) => {
          lastReadMap[p.conversation_id] = p.last_read_at;
        });

        // Build conversation objects
        const conversationMap: { [key: string]: Conversation } = {};
        (participantData || []).forEach((p) => {
          const conv = p.conversations as unknown as { id: string; updated_at: string };
          conversationMap[p.conversation_id] = {
            id: conv.id,
            updated_at: conv.updated_at,
            participants: [],
            unreadCount: 0,
          };
        });

        // Add participants
        (allParticipants || []).forEach((p) => {
          if (conversationMap[p.conversation_id]) {
            const participant = {
              user_id: p.user_id,
              profiles: p.profiles as unknown as {
                username: string;
                avatar_url: string;
                full_name?: string;
              },
            };
            conversationMap[p.conversation_id].participants.push(participant);
          }
        });

        // Add last messages and calculate unread
        interface LastMessage {
          conversation_id: string;
          content: string;
          created_at: string;
          sender_id: string;
        }
        const lastMessageMap: { [key: string]: LastMessage } = {};
        (lastMessages || []).forEach((m) => {
          const msg = m as LastMessage;
          if (!lastMessageMap[msg.conversation_id]) {
            lastMessageMap[msg.conversation_id] = msg;
          }
        });

        Object.keys(conversationMap).forEach((convId) => {
          const lastMsg = lastMessageMap[convId];
          if (lastMsg) {
            conversationMap[convId].lastMessage = lastMsg;
            // Count unread
            const lastRead = new Date(lastReadMap[convId]);
            const msgTime = new Date(lastMsg.created_at);
            if (lastMsg.sender_id !== user.id && msgTime > lastRead) {
              conversationMap[convId].unreadCount = 1;
            }
          }
        });

        setConversations(Object.values(conversationMap));
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [user?.id]);

  // Search users for new conversation
  useEffect(() => {
    async function searchUsers() {
      if (!userSearchQuery.trim() || !user?.id) {
        setSearchedUsers([]);
        return;
      }

      setSearchingUsers(true);
      try {
        // Sanitize search query to prevent SQL injection
        const sanitizedQuery = userSearchQuery.trim().replace(/[%_'"\\]/g, '');
        if (!sanitizedQuery) {
          setSearchedUsers([]);
          setSearchingUsers(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .neq('id', user.id)
          .or(`username.ilike.%${sanitizedQuery}%,full_name.ilike.%${sanitizedQuery}%`)
          .limit(20);

        if (error) throw error;
        setSearchedUsers(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchedUsers([]);
      } finally {
        setSearchingUsers(false);
      }
    }

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearchQuery, user?.id]);

  // Start or find existing conversation
  const startConversation = async (otherUserId: string) => {
    if (!user?.id || creatingConversation) return;

    setCreatingConversation(true);
    try {
      // Check if conversation already exists between these users
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existingParticipations && existingParticipations.length > 0) {
        const conversationIds = existingParticipations.map((p) => p.conversation_id);

        const { data: otherParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', conversationIds);

        if (otherParticipations && otherParticipations.length > 0) {
          // Existing conversation found
          navigate(`/messages/${otherParticipations[0].conversation_id}`);
          setShowNewMessageModal(false);
          setUserSearchQuery('');
          return;
        }
      }

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .single();

      if (convError) throw convError;

      // Add both participants
      const { error: participantsError } = await supabase.from('conversation_participants').insert([
        { conversation_id: newConversation.id, user_id: user.id },
        { conversation_id: newConversation.id, user_id: otherUserId },
      ]);

      if (participantsError) throw participantsError;

      // Navigate to the new conversation
      navigate(`/messages/${newConversation.id}`);
      setShowNewMessageModal(false);
      setUserSearchQuery('');
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setCreatingConversation(false);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'now';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return conv.participants.some(
      (p) =>
        p.profiles?.username?.toLowerCase().includes(query) ||
        p.profiles?.full_name?.toLowerCase().includes(query)
    );
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
        <p className="text-gray-500">Please log in to view messages</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-black dark:text-white">Messages</h1>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="p-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full"
            title="New message"
          >
            <Edit size={22} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search messages..."
            className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="py-16 text-center">
          <Edit size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No messages yet</p>
          <p className="text-sm text-gray-400 mt-1">Start a conversation with someone you follow</p>
        </div>
      ) : (
        <div>
          {filteredConversations.map((conversation) => {
            const otherUser = conversation.participants[0]?.profiles;
            if (!otherUser) return null;

            return (
              <div
                key={conversation.id}
                onClick={() => navigate(`/messages/${conversation.id}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition"
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={otherUser.avatar_url || 'https://via.placeholder.com/150'}
                    alt={otherUser.username}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {conversation.unreadCount > 0 && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-black" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`font-semibold truncate ${
                        conversation.unreadCount > 0
                          ? 'text-black dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {otherUser.username}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {conversation.lastMessage && formatTime(conversation.lastMessage.created_at)}
                    </span>
                  </div>
                  <p
                    className={`text-sm truncate ${
                      conversation.unreadCount > 0
                        ? 'text-black dark:text-white font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {conversation.lastMessage
                      ? conversation.lastMessage.sender_id === user.id
                        ? `You: ${conversation.lastMessage.content}`
                        : conversation.lastMessage.content
                      : 'No messages yet'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-900 w-full sm:w-[400px] sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowNewMessageModal(false);
                  setUserSearchQuery('');
                  setSearchedUsers([]);
                }}
                className="p-1 text-black dark:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-lg font-semibold text-black dark:text-white">New message</h2>
              <div className="w-8" />
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* User Results */}
            <div className="flex-1 overflow-y-auto">
              {searchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : searchedUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  {userSearchQuery.trim() ? 'No users found' : 'Search for users to message'}
                </div>
              ) : (
                <div>
                  {searchedUsers.map((searchedUser) => (
                    <button
                      key={searchedUser.id}
                      onClick={() => startConversation(searchedUser.id)}
                      disabled={creatingConversation}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
                    >
                      <img
                        src={searchedUser.avatar_url || 'https://via.placeholder.com/150'}
                        alt={searchedUser.username || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="text-left">
                        <p className="font-semibold text-black dark:text-white">
                          {searchedUser.username || searchedUser.full_name || 'User'}
                        </p>
                        {searchedUser.full_name && searchedUser.username && (
                          <p className="text-sm text-gray-500">{searchedUser.full_name}</p>
                        )}
                      </div>
                      {creatingConversation && (
                        <Loader2 size={18} className="animate-spin text-gray-400 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
