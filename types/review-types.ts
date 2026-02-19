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

export interface ReviewSummaryStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface Reviewer {
  full_name?: string;
  business_name?: string;
  store_name?: string;
  profile_image_url: string;
}

// Supabase Review Types

export interface Review {
  id: string;
  reviewer_id?: string;
  order_id?: string;
  order_type?: string;
  item_id?: string;
  reviewee_id?: string;
  dispatch_id?: string;
  rating: number;
  comment: string;
  reviewer?: Reviewer;
  created_at: string;
}

export interface UserReview {
  stats: ReviewSummaryStats;
  reviews: Review[];
}

export interface ReviewInsert {
  order_id?: string;
  order_type?: "DELIVERY" | "FOOD" | "LAUNDRY" | "PRODUCT";
  item_id?: string;
  reviewee_id?: string;
  dispatch_id?: string;
  rating: number;
  comment: string;
}
