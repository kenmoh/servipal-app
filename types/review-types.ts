export type ReportType =
  | "damage_items"
  | "wrong_items"
  | "late_delivery"
  | "rider_behaviour"
  | "customer_behaviour"
  | "others";

export type IssueStatus =
  | "pending"
  | "investigating"
  | "resolved"
  | "dismissed";
export type ReportTag = "complainant" | "defendant";

export type ReportedUserType = "vendor" | "customer" | "dispatch";

export type ReviewerType = "order" | "product" | "rider";

export interface ReportCreate {
  order_id: string;
  description: string;
  report_type: ReportType;
  reported_user_type: ReportedUserType;
}

interface SenderInfo {
  name?: string;
  avatar?: string;
}

export interface MessageCreate {
  content: string;
}

export interface ThreadMessage {
  sender: SenderInfo;
  message_type: string;
  role: string;
  date: string;
  content: string;
  read: boolean;
}

export interface ReportResponse {
  id: string;
  complainant_id: string;
  description: string;
  report_status: IssueStatus;
  report_tag: ReportTag;
  report_type: ReportedUserType;
  created_at: string;
  is_read: boolean;
  thread: ThreadMessage[];
}

export interface ReportStatusUpdate {
  issue_status: IssueStatus;
}

// Supabase Review Types

export interface Review {
  id: string;
  reviewer_id?: string;
  order_id?: string;
  order_type?: string;
  item_id?: string;
  item_type?: string; // e.g., 'food', 'product', 'laundry'
  reviewee_id?: string;
  dispatch_id?: string;
  rating: number;
  review_type: string; // 'order', 'product', 'rider'
  comment: string;
  created_at: string;
  updated_at?: string;
  reviewee_type?: string;

  // Joined fields
  reviewer?: {
    full_name: string;
    business_name?: string;
    store_name?: string;
    profile_image_url: string;
  };
}

export interface ReviewInsert {
  order_id?: string;
  order_type?: string;
  item_id?: string;
  item_type?: string;
  reviewee_id?: string;
  dispatch_id?: string;
  rating: number;
  review_type: string;
  comment: string;
  reviewee_type?: string;
}

export interface ReviewSummaryStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
