import { useState, useEffect } from 'react';
import { Send, X, Search, Loader2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

interface ShareButtonProps {
  postId: string;
  postTitle?: string;
  postArtist?: string;
  postThumbnail?: string;
  size?: number;
}

interface UserToShare {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ShareButton({
  postId,
  postTitle,
  postArtist,
  postThumbnail,
  size = 26,
}: ShareButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserToShare[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string[]>([]);

  // Search users when query changes
  useEffect(() => {
    async function searchUsers() {
      if (!searchQuery.trim() || !user?.id) {
        // Show recent conversations / following users when no search
        if (user?.id && showModal) {
          try {
            const { data: following } = await supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', user.id)
              .limit(20);

            if (following && following.length > 0) {
              const ids = following.map((f) => f.following_id);
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .in('id', ids);

              setUsers(profiles || []);
            }
          } catch {
            setUsers([]);
          }
        }
        return;
      }

      setSearching(true);
      try {
        const query = searchQuery.trim();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .neq('id', user.id)
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(20);

        if (!error) {
          setUsers(data || []);
        }
      } catch {
        setUsers([]);
      } finally {
        setSearching(false);
      }
    }

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id, showModal]);

  const handleShare = async (targetUserId: string) => {
    if (!user?.id || sending) return;

    setSending(targetUserId);
    try {
      // Find or create conversation
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      let conversationId: string | null = null;

      if (existingParticipations && existingParticipations.length > 0) {
        const conversationIds = existingParticipations.map((p) => p.conversation_id);

        const { data: otherParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', conversationIds);

        if (otherParticipations && otherParticipations.length > 0) {
          conversationId = otherParticipations[0].conversation_id;
        }
      }

      // Create new conversation if needed
      if (!conversationId) {
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({})
          .select('id')
          .single();

        if (convError) throw convError;

        conversationId = newConversation.id;

        await supabase.from('conversation_participants').insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: targetUserId },
        ]);
      }

      // Send message with shared post
      const messageContent = postTitle
        ? `Shared: ${postTitle}${postArtist ? ` - ${postArtist}` : ''}`
        : 'Shared a post';

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
        shared_track_id: postId,
        shared_track_title: postTitle,
        shared_track_artist: postArtist,
        shared_track_thumbnail: postThumbnail,
      });

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      setSentTo((prev) => [...prev, targetUserId]);
    } catch (err) {
      console.error('Error sharing post:', err);
    } finally {
      setSending(null);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSearchQuery('');
    setSentTo([]);
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="hover:opacity-60 text-black dark:text-white"
      >
        <Send size={size} />
      </button>

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 w-full sm:w-[400px] sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-black dark:text-white">
                {t('share.title')}
              </h3>
              <button
                onClick={handleClose}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={t('share.searchUsers')}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  {searchQuery.trim() ? t('share.noUsersFound') : t('share.searchToShare')}
                </div>
              ) : (
                <div>
                  {users.map((targetUser) => {
                    const isSent = sentTo.includes(targetUser.id);
                    const isSending = sending === targetUser.id;

                    return (
                      <div
                        key={targetUser.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={targetUser.avatar_url || 'https://via.placeholder.com/150'}
                            alt={targetUser.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-semibold text-black dark:text-white">
                              {targetUser.username}
                            </p>
                            {targetUser.full_name && (
                              <p className="text-sm text-gray-500">{targetUser.full_name}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleShare(targetUser.id)}
                          disabled={isSending || isSent}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                            isSent
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          } disabled:opacity-50`}
                        >
                          {isSending ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : isSent ? (
                            <span className="flex items-center gap-1">
                              <Check size={14} /> {t('share.sent')}
                            </span>
                          ) : (
                            t('share.send')
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
