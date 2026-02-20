import {
  Review,
  ReviewInsert,
  ReviewSummaryStats,
  UserReview,
} from "@/types/review-types";
import { supabase } from "@/utils/supabase";

export const ReviewsService = {
  /**
   * Fetch reviews with optional filtering.
   * Joins with profiles to get reviewer details.
   */

  async fetcUserReviews(
    userId: string,
    asReviewee: boolean = true,
  ): Promise<UserReview> {
    const { data, error } = await supabase.rpc("get_user_reviews", {
      target_user_id: userId,
      as_reviewee: asReviewee,
    });

    if (error) {
      console.log(error.message);
      throw new Error(error.message);
    }

    return data as UserReview;
  },

  async getUserReviewsById(
    userId: string,
    limit: number = 50,
  ): Promise<UserReview> {
    const { data, error } = await supabase.rpc("get_user_reviews_by_id", {
      user_id: userId,
      review_limit: limit,
    });

    if (error) {
      console.log(error.message);
      throw new Error(error.message);
    }

    return data as UserReview;
  },

  async fetchReviews({
    item_id,
    reviewee_id,
    dispatch_id,
    limit = 20,
  }: {
    item_id?: string;
    reviewee_id?: string;
    dispatch_id?: string;
    limit?: number;
  }): Promise<UserReview> {
    let query = supabase
      .from("reviews")
      .select(
        `
        *,
        reviewer:reviewer_id (
          full_name,
          business_name,
          store_name,
          profile_image_url
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (item_id) {
      query = query.eq("item_id", item_id);
    }
    if (reviewee_id) {
      query = query.eq("reviewee_id", reviewee_id);
    }
    if (dispatch_id) {
      query = query.eq("dispatch_id", dispatch_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Map the response to ensure nested profile data is correctly typed if needed
    // Supabase returns the joined data in the structure requested
    return data as any as UserReview;
  },

  /**
   * Create a new review.
   */

  async createReview(review: ReviewInsert): Promise<Review> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({ ...review, reviewer_id: session.user.id })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Parse constraint name to give specific error
        const constraint = error.details?.match(/Key \(([^)]+)\)/)?.[1];

        if (constraint?.includes("order_id")) {
          throw new Error("You have already reviewed this order");
        } else if (constraint?.includes("dispatch_id")) {
          throw new Error("You have already reviewed this dispatch");
        } else if (constraint?.includes("item_id")) {
          throw new Error("You have already reviewed this item");
        }

        // Fallback generic message
        throw new Error("You have already submitted a review for this order");
      }
      throw new Error(error.message);
    }

    return data as Review;
  },
};
