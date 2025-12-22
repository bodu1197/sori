import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

export default function TopNav() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread counts
  useEffect(() => {
    async function fetchUnreadCounts() {
      if (!user?.id) return;

      // Unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadNotifications(notifCount || 0);

      // Unread messages - check conversations with unread messages
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (participantData && participantData.length > 0) {
        let unread = 0;
        for (const p of participantData) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', p.conversation_id)
            .neq('sender_id', user.id)
            .gt('created_at', p.last_read_at || '1970-01-01');
          unread += count || 0;
        }
        setUnreadMessages(unread);
      }
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
          // When notification is marked as read, decrease count
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

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user?.id]);

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
