import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';

interface ToggleConfig {
  table: string;
  userIdColumn: string;
  targetIdColumn: string;
  targetId: string;
}

interface UseToggleStateResult {
  isActive: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
}

export default function useToggleState(config: ToggleConfig): UseToggleStateResult {
  const { user } = useAuthStore();
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const { table, userIdColumn, targetIdColumn, targetId } = config;

  useEffect(() => {
    async function checkStatus() {
      if (!user?.id || !targetId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from(table)
          .select('id')
          .eq(userIdColumn, user.id)
          .eq(targetIdColumn, targetId)
          .maybeSingle();

        setIsActive(!!data);
      } catch {
        // Error checking status
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [user?.id, targetId, table, userIdColumn, targetIdColumn]);

  const toggle = useCallback(async () => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      if (isActive) {
        await supabase.from(table).delete().eq(userIdColumn, user.id).eq(targetIdColumn, targetId);
        setIsActive(false);
      } else {
        await supabase.from(table).insert({
          [userIdColumn]: user.id,
          [targetIdColumn]: targetId,
        });
        setIsActive(true);
      }
    } catch {
      // Error toggling state
    } finally {
      setLoading(false);
    }
  }, [user?.id, loading, isActive, table, userIdColumn, targetIdColumn, targetId]);

  return { isActive, loading, toggle };
}
