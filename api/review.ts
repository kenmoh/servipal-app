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

  // async createReview(review: ReviewInsert): Promise<Review> {
  //   const {
  //     data: { session },
  //   } = await supabase.auth.getSession();

  //   if (!session) {
  //     throw new Error("User not authenticated");
  //   }

  //   // Check for duplicate review
  //   let duplicateQuery = supabase
  //     .from("reviews")
  //     .select("id")
  //     .eq("reviewer_id", session.user.id)
  //     .eq("reviewee_id", review.reviewee_id);

  //   // Add condition based on what's provided
  //   if (review.order_id) {
  //     duplicateQuery = duplicateQuery.eq("order_id", review.order_id);
  //   } else if (review.dispatch_id) {
  //     duplicateQuery = duplicateQuery.eq("dispatch_id", review.dispatch_id);
  //   } else if (review.item_id) {
  //     duplicateQuery = duplicateQuery.eq("item_id", review.item_id);
  //   }

  //   const { data: existing } = await duplicateQuery;

  //   if (existing && existing.length > 0) {
  //     const reviewType = review.order_id
  //       ? "order"
  //       : review.dispatch_id
  //         ? "dispatch"
  //         : "item";
  //     throw new Error(`You have already reviewed this order`);
  //   }

  //   // Create review
  //   const { data, error } = await supabase
  //     .from("reviews")
  //     .insert({ ...review, reviewer_id: session.user.id })
  //     .select()
  //     .single();

  //   if (error) {
  //     if (error.code === "23505") {
  //       throw new Error("You have already submitted a review for this order");
  //     }
  //     throw new Error(error.message);
  //   }

  //   return data as Review;
  // },

  /**
   * Calculate review summary statistics (average rating, distribution).
   * Note: For large datasets, this should be done via an RPC or edge function.
   * For now, we'll fetch lighter data or calculate from a reasonable subset/RPC if available.
   * Since no RPC exists, we will fetch all ratings for the target to calculate stats.
   */
  async fetchReviewSummary({
    item_id,
    reviewee_id,
    dispatch_id,
  }: {
    item_id?: string;
    reviewee_id?: string;
    dispatch_id?: string;
  }): Promise<ReviewSummaryStats> {
    let query = supabase.from("reviews").select("rating");

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

    const total_reviews = data.length;
    const rating_distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let total_rating = 0;

    data.forEach((review) => {
      const rating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        rating_distribution[rating]++;
        total_rating += review.rating;
      }
    });

    const average_rating = total_reviews > 0 ? total_rating / total_reviews : 0;

    return {
      average_rating,
      total_reviews,
      rating_distribution,
    };
  },
};
