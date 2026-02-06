/**
 * Dispute Types
 * Types for the dispute/support ticket system with messaging
 */

// Dispute status enum
export type DisputeStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

// Order type for disputes
export type DisputeOrderType =
  | "DELIVERY"
  | "RESTAURANT"
  | "MARKETPLACE"
  | "LAUNDRY";

/**
 * Main dispute record from the disputes table
 */
export interface Dispute {
  id: string;
  order_id: string;
  order_type: DisputeOrderType;
  initiator_id: string;
  respondent_id: string;
  reason: string;
  status: DisputeStatus;
  resolution_notes: string | null;
  resolved_by_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
}

/**
 * Dispute message from the dispute_messages table
 */
export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  message_text: string;
  attachments: string[] | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
}

/**
 * Participant info for dispute details
 */
export interface DisputeParticipant {
  id: string;
  full_name: string;
  profile_image_url: string | null;
  user_type: string;
}

/**
 * Extended dispute details with participant info (from RPC)
 */
export interface DisputeDetails extends Dispute {
  initiator: DisputeParticipant;
  respondent: DisputeParticipant;
  messages: DisputeMessage[];
}

/**
 * Request payload for creating a dispute
 */
export interface CreateDisputeRequest {
  order_id: string;
  order_type: DisputeOrderType;
  respondent_id: string;
  reason: string;
}

/**
 * Request payload for sending a message
 */
export interface SendMessageRequest {
  dispute_id: string;
  message_text: string;
  attachments?: string[];
}

/**
 * Dispute list item for UI display (includes computed fields)
 */
export interface DisputeListItem extends Dispute {
  other_party_name?: string;
  other_party_avatar?: string | null;
}
