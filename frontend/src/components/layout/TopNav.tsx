import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread counts
  useEffect(() => {
    let isMounted = true;

    async function fetchUnreadMessageCount() {
      if (!user?.id) return;
      const userId = user.id;

      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId);

      if (participantData && participantData.length > 0) {
        let unread = 0;
        for (const p of participantData) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', p.conversation_id)
            .neq('sender_id', userId)
            .gt('created_at', p.last_read_at || '1970-01-01');
          unread += count || 0;
        }
        if (isMounted) setUnreadMessages(unread);
      } else if (isMounted) {
        setUnreadMessages(0);
      }
    }

    async function fetchUnreadCounts() {
      if (!user?.id) return;
      const userId = user.id;

      // Unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (isMounted) setUnreadNotifications(notifCount || 0);

      // Fetch unread messages
      await fetchUnreadMessageCount();
    }

    fetchUnreadCounts();

    // Subscribe to real-time notifications
    const notifChannel = supabase
      .channel('topnav-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => setUnreadNotifications((prev) => prev + 1)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new && payload.old) {
            const wasUnread = !payload.old.is_read;
            const isNowRead = payload.new.is_read;
            if (wasUnread && isNowRead) {
              setUnreadNotifications((prev) => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    // Subscribe to new messages (increment unread count)
    const msgChannel = supabase
      .channel('topnav-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string; conversation_id: string };
          // Only increment if message is from someone else and user is not in that chat
          if (newMsg.sender_id !== user?.id) {
            const isInChat = location.pathname.includes(`/messages/${newMsg.conversation_id}`);
            if (!isInChat) {
              setUnreadMessages((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to conversation_participants updates (when user reads messages)
    const participantChannel = supabase
      .channel('topnav-participants')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          // Refetch unread count when last_read_at is updated
          fetchUnreadMessageCount();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(participantChannel);
    };
  }, [user?.id, location.pathname]);

  return (
    <header className="h-[44px] bg-white dark:bg-black px-4 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center">
        <h1
          className="text-2xl font-bold tracking-tight text-black dark:text-white"
          style={{ fontFamily: 'cursive' }}
        >
          MusicGram
        </h1>
      </div>

      <div className="flex items-center gap-5">
        <button
          onClick={() => navigate('/notifications')}
          className="relative hover:opacity-70 transition-opacity"
        >
          <Heart size={26} strokeWidth={2} className="text-black dark:text-white" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/messages')}
          className="relative hover:opacity-70 transition-opacity"
        >
          <MessageCircle size={26} strokeWidth={2} className="text-black dark:text-white" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
