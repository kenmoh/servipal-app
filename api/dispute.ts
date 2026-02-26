import {
  CreateDisputeRequest,
  Dispute,
  DisputeDetails,
  DisputeMessage,
  SendMessageRequest,
} from "@/types/dispute-types";
import { supabase } from "@/utils/supabase";
import * as Sentry from "@sentry/react-native";

/**
 * Create a new dispute
 */
export const createDispute = async (
  request: CreateDisputeRequest,
): Promise<{ dispute_id: string }> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    console.log("📋 Creating dispute...", request.order_type);
    Sentry.addBreadcrumb({ category: "api.dispute", message: `Creating dispute for ${request.order_type}`, level: "info" });

    const { data, error } = await supabase.rpc("create_dispute", {
      p_order_id: request.order_id,
      p_order_type: request.order_type,
      p_initiator_id: session.user.id,
      p_respondent_id: request.respondent_id,
      p_reason: request.reason,
    });

    if (error) {
      console.error("❌ Create dispute failed:", error);
      Sentry.captureException(error, { tags: { action: "create_dispute" } });
      throw new Error(error.message || "Failed to create dispute");
    }

    console.log("✅ Dispute created:", data);
    Sentry.addBreadcrumb({ category: "api.dispute", message: "Dispute created successfully", level: "info", data: { dispute_id: data?.dispute_id } });
    return data;
  } catch (error) {
    console.error("❌ Create dispute error:", error);
    Sentry.captureException(error, { tags: { action: "create_dispute" } });
    throw error;
  }
};

/**
 * Get all disputes for current user
 */
export const getMyDisputes = async (): Promise<Dispute[]> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .or(
        `initiator_id.eq.${session.user.id},respondent_id.eq.${session.user.id}`,
      )
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("❌ Get disputes failed:", error);
      Sentry.captureException(error, { tags: { action: "get_disputes" } });
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error("❌ Get disputes error:", error);
    Sentry.captureException(error, { tags: { action: "get_disputes" } });
    throw error;
  }
};

/**
 * Get dispute details with participants
 */
export const getDisputeDetails = async (
  disputeId: string,
): Promise<DisputeDetails> => {
  try {
    const { data, error } = await supabase.rpc("get_dispute_details", {
      p_dispute_id: disputeId,
    });

    if (error) {
      console.error("❌ Get dispute details failed:", error);
      Sentry.captureException(error, { tags: { action: "get_dispute_details" } });
      throw new Error(error.message);
    }

    return data as DisputeDetails;
  } catch (error) {
    console.error("❌ Get dispute details error:", error);
    Sentry.captureException(error, { tags: { action: "get_dispute_details" } });
    throw error;
  }
};

/**
 * Get messages for a dispute
 */
export const getDisputeMessages = async (
  disputeId: string,
): Promise<DisputeMessage[]> => {
  try {
    const { data, error } = await supabase
      .from("dispute_messages")
      .select("*")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Get messages failed:", error);
      Sentry.captureException(error, { tags: { action: "get_dispute_messages" } });
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error("❌ Get messages error:", error);
    Sentry.captureException(error, { tags: { action: "get_dispute_messages" } });
    throw error;
  }
};

/**
 * Send a message in dispute
 */
export const sendDisputeMessage = async (
  request: SendMessageRequest,
): Promise<{ message_id: string }> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    console.log("💬 Sending message...", request);
    Sentry.addBreadcrumb({ category: "api.dispute", message: "Sending dispute message", level: "info", data: { dispute_id: request.dispute_id } });

    const { data, error } = await supabase.rpc("send_dispute_message", {
      p_dispute_id: request.dispute_id,
      p_sender_id: session.user.id,
      p_message_text: request.message_text,
      p_attachments: request.attachments || null,
    });

    if (error) {
      console.error("❌ Send message failed:", error);
      Sentry.captureException(error, { tags: { action: "send_dispute_message" } });
      throw new Error(error.message || "Failed to send message");
    }

    console.log("✅ Message sent:", data);
    Sentry.addBreadcrumb({ category: "api.dispute", message: "Dispute message sent", level: "info" });
    return data;
  } catch (error) {
    console.error("❌ Send message error:", error);
    Sentry.captureException(error, { tags: { action: "send_dispute_message" } });
    throw error;
  }
};

/**
 * Subscribe to new messages in a dispute (Real-time)
 */
export const subscribeToDisputeMessages = (
  disputeId: string,
  onNewMessage: (message: DisputeMessage) => void,
) => {
  const channel = supabase
    .channel(`dispute-${disputeId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "dispute_messages",
        filter: `dispute_id=eq.${disputeId}`,
      },
      (payload) => {
        console.log("🔔 New message received:", payload);
        Sentry.addBreadcrumb({ category: "realtime.dispute", message: "New dispute message received", level: "info" });
        onNewMessage(payload.new as DisputeMessage);
      },
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to dispute updates (Real-time)
 */
export const subscribeToDisputeUpdates = (
  disputeId: string,
  onUpdate: (dispute: Dispute) => void,
) => {
  const channel = supabase
    .channel(`dispute-updates-${disputeId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "disputes",
        filter: `id=eq.${disputeId}`,
      },
      (payload) => {
        console.log("🔔 Dispute updated:", payload);
        Sentry.addBreadcrumb({ category: "realtime.dispute", message: "Dispute updated via realtime", level: "info" });
        onUpdate(payload.new as Dispute);
      },
    )
    .subscribe();

  return channel;
};

/**
 * Mark messages as read for a dispute
 */
export const markMessagesAsRead = async (disputeId: string): Promise<void> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    // Mark all unread messages as read (where current user is NOT the sender)
    const { error: messageError } = await supabase
      .from("dispute_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("dispute_id", disputeId)
      .neq("sender_id", session.user.id)
      .eq("is_read", false);

    if (messageError) {
      console.error("❌ Mark messages as read failed:", messageError);
      Sentry.captureException(messageError, { tags: { action: "mark_messages_read" } });
      throw new Error(messageError.message);
    }

    // Reset unread count on the dispute
    const { error: disputeError } = await supabase
      .from("disputes")
      .update({ unread_count: 0 })
      .eq("id", disputeId);

    if (disputeError) {
      console.error("❌ Reset unread count failed:", disputeError);
      Sentry.captureException(disputeError, { tags: { action: "reset_unread_count" } });
    }

    console.log("✅ Messages marked as read");
    Sentry.addBreadcrumb({ category: "api.dispute", message: "Messages marked as read", level: "info" });
  } catch (error) {
    console.error("❌ Mark as read error:", error);
    Sentry.captureException(error, { tags: { action: "mark_messages_read" } });
    throw error;
  }
};

/**
 * Upload an image to dispute-images bucket
 */
export const uploadDisputeImage = async (
  disputeId: string,
  imageUri: string,
): Promise<string> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }

    // Generate unique filename
    const fileExt = imageUri.split(".").pop() || "jpg";
    const fileName = `${disputeId}/${Date.now()}.${fileExt}`;

    // Fetch the image and convert to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("dispute-images")
      .upload(fileName, blob, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (error) {
      console.error("❌ Upload image failed:", error);
      Sentry.captureException(error, { tags: { action: "upload_dispute_image" } });
      throw new Error(error.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("dispute-images")
      .getPublicUrl(data.path);

    console.log("✅ Image uploaded:", urlData.publicUrl);
    Sentry.addBreadcrumb({ category: "api.dispute", message: "Dispute image uploaded", level: "info" });
    return urlData.publicUrl;
  } catch (error) {
    console.error("❌ Upload image error:", error);
    Sentry.captureException(error, { tags: { action: "upload_dispute_image" } });
    throw error;
  }
};
