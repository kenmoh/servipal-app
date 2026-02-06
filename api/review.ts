import { Review, ReviewInsert, ReviewSummaryStats } from "@/types/review-types";
import { supabase } from "@/utils/supabase";

export const ReviewsService = {
  /**
   * Fetch reviews with optional filtering.
   * Joins with profiles to get reviewer details.
   */
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
  }): Promise<Review[]> {
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
    return data as any as Review[];
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
      throw new Error(error.message);
    }

    return data as Review;
  },

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
