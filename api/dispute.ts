import {
  CreateDisputeRequest,
  Dispute,
  DisputeDetails,
  DisputeMessage,
  DisputeMessagesResponse,
  DisputeUnreadCount,
  SendMessageRequest,
} from "@/types/dispute-types";
import { supabase } from "@/utils/supabase";
import * as Sentry from "@sentry/react-native";
import { fetch } from "expo/fetch";

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
    Sentry.addBreadcrumb({
      category: "api.dispute",
      message: `Creating dispute for ${request.order_type}`,
      level: "info",
    });

    const { data, error } = await supabase.rpc("create_dispute", {
      p_order_id: request.order_id,
      p_order_type: request.order_type,
      p_initiator_id: session.user.id,
      p_respondent_id: request.respondent_id,
      p_reason: request.reason,
    });

    if (error) {
      Sentry.captureException(error, { tags: { action: "create_dispute" } });
      throw new Error(error.message || "Failed to create dispute");
    }

    Sentry.addBreadcrumb({
      category: "api.dispute",
      message: "Dispute created successfully",
      level: "info",
      data: { dispute_id: data?.dispute_id },
    });
    return data;
  } catch (error) {
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
        `initiator_id.eq.${session.user.id},respondent_id.eq.${session.user.id}, dispatch_id.eq.${session.user.id}`,
      )
      .order("updated_at", { ascending: false });

    if (error) {
      Sentry.captureException(error, { tags: { action: "get_disputes" } });
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
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
      Sentry.captureException(error, {
        tags: { action: "get_dispute_details" },
      });
      throw new Error(error.message);
    }

    return data as DisputeDetails;
  } catch (error) {
    Sentry.captureException(error, { tags: { action: "get_dispute_details" } });
    throw error;
  }
};

/**
 * Get messages for a dispute
 */

export const getDisputeMessages = async (
  disputeId: string,
  limit = 50,
  offset = 0,
): Promise<DisputeMessagesResponse> => {
  const { data, error } = await supabase.rpc("get_dispute_messages", {
    p_dispute_id: disputeId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    Sentry.captureException(error, {
      tags: { action: "get_dispute_messages" },
    });
    throw new Error(error.message);
  }

  return data as DisputeMessagesResponse;
};

export const sendDisputeMessage = async (
  request: SendMessageRequest,
): Promise<{ message_id: string }> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) throw new Error("User not authenticated");

  const { data, error } = await supabase.rpc("send_dispute_message", {
    p_dispute_id: request.dispute_id,
    p_sender_id: session.user.id,
    p_message_text: request.message_text,
    p_attachments: request.attachments || null,
  });

  if (error) {
    Sentry.captureException(error, {
      tags: { action: "send_dispute_message" },
    });
    throw new Error(error.message || "Failed to send message");
  }

  return data;
};

export const markDisputeAsRead = async (disputeId: string): Promise<void> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) throw new Error("User not authenticated");

  const { error } = await supabase.rpc("mark_dispute_read", {
    p_dispute_id: disputeId,
    p_user_id: session.user.id,
  });

  if (error) {
    Sentry.captureException(error, { tags: { action: "mark_dispute_read" } });
    throw new Error(error.message);
  }
};

// export const getDisputeMessages = async (
//   disputeId: string,
// ): Promise<DisputeMessage[]> => {
//   try {
//     const { data, error } = await supabase
//       .from("dispute_messages")
//       .select("*")
//       .eq("dispute_id", disputeId)
//       .order("created_at", { ascending: true });

//     if (error) {
//       Sentry.captureException(error, {
//         tags: { action: "get_dispute_messages" },
//       });
//       throw new Error(error.message);
//     }

//     return data || [];
//   } catch (error) {
//     Sentry.captureException(error, {
//       tags: { action: "get_dispute_messages" },
//     });
//     throw error;
//   }
// };

/**
 * Send a message in dispute
 */
// export const sendDisputeMessage = async (
//   request: SendMessageRequest,
// ): Promise<{ message_id: string }> => {
//   try {
//     const {
//       data: { session },
//       error: sessionError,
//     } = await supabase.auth.getSession();

//     if (sessionError || !session) {
//       throw new Error("User not authenticated");
//     }

//     Sentry.addBreadcrumb({
//       category: "api.dispute",
//       message: "Sending dispute message",
//       level: "info",
//       data: { dispute_id: request.dispute_id },
//     });

//     const { data, error } = await supabase.rpc("send_dispute_message", {
//       p_dispute_id: request.dispute_id,
//       p_sender_id: session.user.id,
//       p_message_text: request.message_text,
//       p_attachments: request.attachments || null,
//     });

//     if (error) {
//       Sentry.captureException(error, {
//         tags: { action: "send_dispute_message" },
//       });
//       throw new Error(error.message || "Failed to send message");
//     }

//     Sentry.addBreadcrumb({
//       category: "api.dispute",
//       message: "Dispute message sent",
//       level: "info",
//     });
//     return data;
//   } catch (error) {
//     Sentry.captureException(error, {
//       tags: { action: "send_dispute_message" },
//     });
//     throw error;
//   }
// };

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
        Sentry.addBreadcrumb({
          category: "realtime.dispute",
          message: "New dispute message received",
          level: "info",
        });
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
        Sentry.addBreadcrumb({
          category: "realtime.dispute",
          message: "Dispute updated via realtime",
          level: "info",
        });
        onUpdate(payload.new as Dispute);
      },
    )
    .subscribe();

  return channel;
};

/**
 * Mark messages as read for a dispute
 */
// export const markMessagesAsRead = async (disputeId: string): Promise<void> => {
//   try {
//     const {
//       data: { session },
//       error: sessionError,
//     } = await supabase.auth.getSession();

//     if (sessionError || !session) {
//       throw new Error("User not authenticated");
//     }

//     // Mark all unread messages as read (where current user is NOT the sender)
//     const { error: messageError } = await supabase
//       .from("dispute_messages")
//       .update({ is_read: true, read_at: new Date().toISOString() })
//       .eq("dispute_id", disputeId)
//       .neq("sender_id", session.user.id)
//       .eq("is_read", false);

//     if (messageError) {
//       Sentry.captureException(messageError, {
//         tags: { action: "mark_messages_read" },
//       });
//       throw new Error(messageError.message);
//     }

//     // Reset unread count on the dispute
//     const { error: disputeError } = await supabase
//       .from("disputes")
//       .update({ unread_count: 0 })
//       .eq("id", disputeId);

//     if (disputeError) {
//       Sentry.captureException(disputeError, {
//         tags: { action: "reset_unread_count" },
//       });
//     }

//     Sentry.addBreadcrumb({
//       category: "api.dispute",
//       message: "Messages marked as read",
//       level: "info",
//     });
//   } catch (error) {
//     Sentry.captureException(error, { tags: { action: "mark_messages_read" } });
//     throw error;
//   }
// };

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

    const userId = session.user.id;
    const uri = imageUri;

    if (/^https?:\/\//i.test(uri)) {
      return uri;
    }

    // Generate unique filename - prefix with userId to satisfy common RLS policies
    const fileExt = imageUri.split(".").pop() || "jpg";
    const fileName = `${userId}/${disputeId}/${Date.now()}.${fileExt}`;

    // Fetch the image and convert to Uint8Array as per profile upload pattern
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage
    const { data: uploadData, error } = await supabase.storage
      .from("dispute-images")
      .upload(fileName, bytes, {
        contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
        upsert: true,
      });

    if (error) {
     
      Sentry.captureException(error, {
        tags: { action: "upload_dispute_image" },
      });
      throw new Error(error.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("dispute-images")
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error("Failed to get public URL");
    }

    const timestamp = Date.now();
    const publicUrl = `${urlData.publicUrl}?t=${timestamp}`;

 
    return publicUrl;
  } catch (error) {
  
    Sentry.captureException(error, {
      tags: { action: "upload_dispute_image" },
    });
    throw error;
  }
};

export const getUserDisputeUnreadCount =
  async (): Promise<DisputeUnreadCount> => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) throw new Error("User not authenticated");

    const { data, error } = await supabase.rpc(
      "get_user_dispute_unread_count",
      {
        p_user_id: session.user.id,
      },
    );

    if (error) {
      Sentry.captureException(error, {
        tags: { action: "get_user_dispute_unread_count" },
      });
      throw new Error(error.message);
    }

    return data as DisputeUnreadCount;
  };

export const getDisputeUnreadCount = async (
  disputeId: string,
  userId?: string,
): Promise<DisputeUnreadCount> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) throw new Error("User not authenticated");

  const targetUserId = userId || session.user.id;

  const { data, error } = await supabase.rpc("get_dispute_unread_count", {
    p_dispute_id: disputeId,
    p_user_id: targetUserId,
  });

  if (error) {
    Sentry.captureException(error, {
      tags: { action: "get_dispute_unread_count" },
    });
    throw new Error(error.message);
  }

  return data as DisputeUnreadCount;
};
