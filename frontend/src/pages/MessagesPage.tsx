import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, MessageCircle } from 'lucide-react';
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
  const [searchResults, setSearchResults] = useState<string[]>([]); // conversation IDs with matching messages
  const [searching, setSearching] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

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

  // Search messages when query changes
  useEffect(() => {
    async function searchMessages() {
      if (!searchQuery.trim() || !user?.id) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        // Get conversation IDs the user is part of
        const conversationIds = conversations.map((c) => c.id);
        if (conversationIds.length === 0) {
          setSearchResults([]);
          return;
        }

        // Search messages in user's conversations
        const { data: matchingMessages } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .ilike('content', `%${searchQuery.trim()}%`);

        // Get unique conversation IDs that have matching messages
        const matchedConvIds = [...new Set((matchingMessages || []).map((m) => m.conversation_id))];
        setSearchResults(matchedConvIds);
      } catch (error) {
        console.error('Error searching messages:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }

    const debounce = setTimeout(searchMessages, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id, conversations]);

  // Search all users when query changes
  useEffect(() => {
    async function searchUsers() {
      if (!searchQuery.trim() || !user?.id) {
        setSearchedUsers([]);
        setSearchingUsers(false);
        return;
      }

      setSearchingUsers(true);
      try {
        const query = searchQuery.trim();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .neq('id', user.id)
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(10);

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
  }, [searchQuery, user?.id]);

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

  // Filter conversations by participant name OR message content (from DB search)
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    // Search in participant names
    const matchesParticipant = conv.participants?.some((p) => {
      const username = p.profiles?.username || '';
      const fullName = p.profiles?.full_name || '';
      return username.toLowerCase().includes(query) || fullName.toLowerCase().includes(query);
    });

    // Check if conversation has matching messages (from DB search)
    const matchesMessage = searchResults.includes(conv.id);

    return matchesParticipant || matchesMessage;
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

      {/* User Search Results */}
      {searchQuery.trim() && (
        <div className="border-b border-gray-100 dark:border-gray-800">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
            <p className="text-xs font-semibold text-gray-500 uppercase">Users</p>
          </div>
          {searchingUsers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : searchedUsers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No users found</div>
          ) : (
            <div>
              {searchedUsers.map((searchedUser) => (
                <div
                  key={searchedUser.id}
                  onClick={() => navigate(`/profile/${searchedUser.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition"
                >
                  <img
                    src={searchedUser.avatar_url || 'https://via.placeholder.com/150'}
                    alt={searchedUser.username || 'User'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-black dark:text-white">
                      {searchedUser.username}
                    </p>
                    {searchedUser.full_name && (
                      <p className="text-sm text-gray-500">{searchedUser.full_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations List */}
      {searchQuery.trim() && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase">Conversations</p>
        </div>
      )}
      {loading || searching ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      ) : filteredConversations.length === 0 ? (
        searchQuery.trim() ? (
          <div className="px-4 py-3 text-sm text-gray-500">No matching conversations</div>
        ) : (
          <div className="py-16 text-center">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Search for users above to start a conversation
            </p>
          </div>
        )
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
    </div>
  );
}
