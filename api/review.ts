import {
  ItemReview,
  Review,
  ReviewInsert,
  UserReview,
} from "@/types/review-types";
import { supabase } from "@/utils/supabase";
import * as Sentry from "@sentry/react-native";

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
      Sentry.captureException(error, {
        tags: { action: "fetch_user_reviews" },
      });
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
      Sentry.captureException(error, {
        tags: { action: "get_user_reviews_by_id" },
      });
      throw new Error(error.message);
    }

    return data as UserReview;
  },

  // get_item_reviews
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
   * Fetch reviews for a product item
   */

  async fetchItemReviews(itemId: string): Promise<ItemReview> {
    const { data, error } = await supabase.rpc("get_item_reviews", {
      p_item_id: itemId,
    });

    if (error) {
      console.log(error.message);
      Sentry.captureException(error, {
        tags: { action: "fetch_item_reviews" },
      });
      throw new Error(error.message);
    }

    return data as ItemReview;
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
      console.log(error);
    }

    if (error) {
      throw new Error(error.message);
    }

    return data as Review;
  },
};
