import { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, AtSign, Reply, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';
import { FollowButton } from '../components/social';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'reply';
  post_id?: string;
  comment_id?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
  content?: string; // For backward compatibility
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'like':
      return <Heart size={16} className="text-red-500" fill="currentColor" />;
    case 'comment':
      return <MessageCircle size={16} className="text-blue-500" />;
    case 'follow':
      return <UserPlus size={16} className="text-green-500" />;
    case 'mention':
      return <AtSign size={16} className="text-purple-500" />;
    case 'reply':
      return <Reply size={16} className="text-orange-500" />;
    default:
      return <Heart size={16} className="text-gray-500" />;
  }
}

function getNotificationText(notification: Notification): string {
  const username = notification.actor?.username || 'Someone';

  switch (notification.type) {
    case 'like':
      return `${username} liked your post`;
    case 'comment':
      return notification.message
        ? `${username} commented: "${notification.message.slice(0, 50)}${notification.message.length > 50 ? '...' : ''}"`
        : `${username} commented on your post`;
    case 'follow':
      return `${username} started following you`;
    case 'mention':
      return `${username} mentioned you in a comment`;
    case 'reply':
      return notification.message
        ? `${username} replied: "${notification.message.slice(0, 50)}${notification.message.length > 50 ? '...' : ''}"`
        : `${username} replied to your comment`;
    default:
      return `${username} interacted with you`;
  }
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(
            `
            id,
            user_id,
            actor_id,
            type,
            post_id,
            comment_id,
            message,
            is_read,
            created_at
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Fetch actor profiles separately
        if (data && data.length > 0) {
          const actorIds = [...new Set(data.map((n) => n.actor_id).filter(Boolean))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', actorIds);

          const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
          data.forEach((n) => {
            (n as Notification).actor = profileMap.get(n.actor_id);
          });
        }

        setNotifications((data as unknown as Notification[]) || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, [user?.id]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;

          // Fetch actor profile for the new notification
          if (newNotification.actor_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', newNotification.actor_id)
              .single();

            if (profile) {
              newNotification.actor = profile;
            }
          }

          // Add to the beginning of the list
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id || markingAllRead) return;

    setMarkingAllRead(true);
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Group notifications by date
  const groupedNotifications: { [key: string]: Notification[] } = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  notifications.forEach((notification) => {
    const dateStr = new Date(notification.created_at).toDateString();
    let group = 'Earlier';

    if (dateStr === today) {
      group = 'Today';
    } else if (dateStr === yesterday) {
      group = 'Yesterday';
    } else {
      const daysAgo = Math.floor(
        (Date.now() - new Date(notification.created_at).getTime()) / 86400000
      );
      if (daysAgo < 7) {
        group = 'This Week';
      } else if (daysAgo < 30) {
        group = 'This Month';
      }
    }

    if (!groupedNotifications[group]) {
      groupedNotifications[group] = [];
    }
    groupedNotifications[group].push(notification);
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
        <p className="text-gray-500">Please log in to see notifications</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-black dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
            >
              {markingAllRead ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Mark all read
            </button>
          )}
        </div>
        {unreadCount > 0 && <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Heart size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No notifications yet</p>
          <p className="text-sm text-gray-400 mt-1">
            When someone interacts with you, you will see it here.
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedNotifications).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
                <span className="text-sm font-semibold text-gray-500">{group}</span>
              </div>
              {items.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition ${
                    !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  {/* Avatar with notification type icon */}
                  <div className="relative">
                    <img
                      src={notification.actor?.avatar_url || 'https://via.placeholder.com/150'}
                      alt={notification.actor?.username}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-black rounded-full flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-black dark:text-white">
                      {getNotificationText(notification)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  {/* Action button for follow notifications */}
                  {notification.type === 'follow' && notification.actor && (
                    <FollowButton userId={notification.actor.id} size="sm" />
                  )}

                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
