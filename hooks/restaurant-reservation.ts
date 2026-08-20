import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PaginatedResponse,
  ReservationSummary,
} from "@/types/reservation-types";
import { supabase } from "@/utils/supabase";

// Customer Hook
export const useCustomerReservations = (
  page: number = 1,
  pageSize: number = 20,
) => {
  return useQuery<PaginatedResponse<ReservationSummary>>({
    queryKey: ["customer-reservations", page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_customer_reservations", {
        p_page: page,
        p_page_size: pageSize,
      });
      if (error) throw error;
      return data as PaginatedResponse<ReservationSummary>;
    },
  });
};

// Vendor Hook
export const useVendorReservations = (
  page: number = 1,
  pageSize: number = 20,
  filters?: { start_date?: string; end_date?: string; status?: string },
) => {
  return useQuery<PaginatedResponse<ReservationSummary>>({
    queryKey: ["vendor-reservations", page, pageSize, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_vendor_reservations", {
        p_page: page,
        p_page_size: pageSize,
        ...filters,
      });
      if (error) throw error;
      return data as PaginatedResponse<ReservationSummary>;
    },
  });
};
