import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, markNotificationsRead } from "../utils/notifications";
import { useAuth } from "../context/AuthContext";

// The signed-in user's notifications, newest first. Checked every minute (and whenever the
// window regains focus), so join requests show up without a reload.
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchNotifications(),
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// mutate(ids) marks those read; mutate() marks everything read
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => markNotificationsRead(ids),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
