// In-app notifications (issue #28). The server writes them with the service role key;
// users read their own and mark them read from the browser (see
// supabase/invite-approvals-notifications.sql).
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger.js";

export function createNotifier({ supabaseUrl, serviceKey }) {
  const admin =
    supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;

  // Adds a notification for `userId`. Never throws: a notification is never worth failing
  // the action that caused it.
  async function notify(userId, type, { tripId = null, data = {} } = {}) {
    if (!admin || !userId) return;
    const { error } = await admin
      .from("notifications")
      .insert({ user_id: userId, type, trip_id: tripId == null ? null : String(tripId), data });
    if (error) logger.error({ err: error, type }, "Couldn't create notification");
  }

  // Marks a join request's notification as handled ("approved" / "declined"), so it no
  // longer shows Approve / Deny
  async function resolveJoinRequest(memberId, resolution) {
    if (!admin) return;
    const { data: rows, error } = await admin
      .from("notifications")
      .select("id, data")
      .eq("type", "join_request")
      .eq("data->>member_id", memberId);
    if (error) return logger.error({ err: error }, "Couldn't find join request notification");
    await Promise.all(
      (rows || []).map((n) =>
        admin
          .from("notifications")
          .update({ data: { ...n.data, resolution }, read_at: new Date().toISOString() })
          .eq("id", n.id)
      )
    );
  }

  return { notify, resolveJoinRequest };
}
