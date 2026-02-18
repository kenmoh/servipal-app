import {
  CreateDisputeRequest,
  Dispute,
  DisputeDetails,
  DisputeMessage,
  SendMessageRequest,
} from "@/types/dispute-types";
import { supabase } from "@/utils/supabase";

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

    const { data, error } = await supabase.rpc("create_dispute", {
      p_order_id: request.order_id,
      p_order_type: request.order_type,
      p_initiator_id: session.user.id,
      p_respondent_id: request.respondent_id,
      p_reason: request.reason,
    });

    if (error) {
      console.error("❌ Create dispute failed:", error);
      throw new Error(error.message || "Failed to create dispute");
    }

    console.log("✅ Dispute created:", data);
    return data;
  } catch (error) {
    console.error("❌ Create dispute error:", error);
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
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error("❌ Get disputes error:", error);
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
      throw new Error(error.message);
    }

    return data as DisputeDetails;
  } catch (error) {
    console.error("❌ Get dispute details error:", error);
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
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error("❌ Get messages error:", error);
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

    const { data, error } = await supabase.rpc("send_dispute_message", {
      p_dispute_id: request.dispute_id,
      p_sender_id: session.user.id,
      p_message_text: request.message_text,
      p_attachments: request.attachments || null,
    });

    if (error) {
      console.error("❌ Send message failed:", error);
      throw new Error(error.message || "Failed to send message");
    }

    console.log("✅ Message sent:", data);
    return data;
  } catch (error) {
    console.error("❌ Send message error:", error);
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
      throw new Error(messageError.message);
    }

    // Reset unread count on the dispute
    const { error: disputeError } = await supabase
      .from("disputes")
      .update({ unread_count: 0 })
      .eq("id", disputeId);

    if (disputeError) {
      console.error("❌ Reset unread count failed:", disputeError);
    }

    console.log("✅ Messages marked as read");
  } catch (error) {
    console.error("❌ Mark as read error:", error);
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
      throw new Error(error.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("dispute-images")
      .getPublicUrl(data.path);

    console.log("✅ Image uploaded:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("❌ Upload image error:", error);
    throw error;
  }
};
