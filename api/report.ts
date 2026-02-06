import { apiClient } from "@/utils/client";
import { ApiResponse } from "apisauce";
import { ErrorResponse } from "./auth";
import {
  ReportResponse,
  ReportCreate,
  ReportStatusUpdate,
  MessageCreate,
  BadgeCount,
} from "@/types/review-types";

const REPORT_BASE_URL = "/reports";

// Fetch report
export const fetchReport = async (
  reportId: string
): Promise<ReportResponse> => {
  try {
    const response: ApiResponse<ReportResponse | ErrorResponse> =
      await apiClient.get(`${REPORT_BASE_URL}/${reportId}/report`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching report.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};
// Fetch report
export const fetchUnreadBadgeCount = async (
  userId: string
): Promise<BadgeCount> => {
  try {
    const response: ApiResponse<BadgeCount | ErrorResponse> =
      await apiClient.get(`${REPORT_BASE_URL}/${userId}/unread-badge-count`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching badge count";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Fetch reports
export const fetchCurrentUserReports = async (
  userId: string
): Promise<ReportResponse[]> => {
  try {
    const response: ApiResponse<ReportResponse[] | ErrorResponse> =
      await apiClient.get(`${REPORT_BASE_URL}/${userId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error fetching reports.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Create Report
export const createReport = async (
  orderId: string,
  reportData: ReportCreate
): Promise<ReportResponse> => {
  const data = {
    description: reportData.description,
    reported_user_type: reportData.reported_user_type,
    report_type: reportData.report_type,
    order_id: reportData.order_id,
  };
  try {
    const response: ApiResponse<ReportResponse | ErrorResponse> =
      await apiClient.post(`${REPORT_BASE_URL}/${orderId}/report`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error creating report.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};
// Create Report
export const addMessage = async (
  reportId: string,
  reportData: MessageCreate
): Promise<ReportResponse> => {
  const data = {
    content: reportData.content,
  };
  try {
    const response: ApiResponse<ReportResponse | ErrorResponse> =
      await apiClient.post(`${REPORT_BASE_URL}/${reportId}/message`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error creating message.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// Update Report
export const updateReportStatus = async (
  reportData: ReportStatusUpdate,
  reportId: string
): Promise<ReportStatusUpdate> => {
  const data = {
    issue_status: reportData.issue_status,
  };
  try {
    const response: ApiResponse<ReportStatusUpdate | ErrorResponse> =
      await apiClient.post(`${REPORT_BASE_URL}/${reportId}/update}`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

    if (!response.ok || !response.data || "detail" in response.data) {
      const errorMessage =
        response.data && "detail" in response.data
          ? response.data.detail
          : "Error updating report status.";
      throw new Error(errorMessage);
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred");
  }
};

// --- NOTIFICATION ENDPOINTS ---

// Fetch all notifications (paginated)
export const fetchAllNotifications = async (
  limit = 20,
  skip = 0,
  markRead = false
) => {
  try {
    const response: ApiResponse<any> = await apiClient.get(
      `/notification?limit=${limit}&skip=${skip}&mark_read=${markRead}`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error fetching notifications");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Fetch notification by ID
export const fetchNotificationById = async (notificationId: string) => {
  try {
    const response: ApiResponse<any> = await apiClient.get(
      `/notification/${notificationId}`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error fetching notification");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Mark notification as read
export const markReportRead = async (reportId: string) => {
  try {
    const response: ApiResponse<any> = await apiClient.post(
      `${REPORT_BASE_URL}/${reportId}/mark-read`,
      {},
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error marking notification as read");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Mark all notifications as read
export const markAllNotificationsRead = async () => {
  try {
    const response: ApiResponse<any> = await apiClient.post(
      `/notification/read-all`,
      {},
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error marking all notifications as read");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Delete a notification (admin only)
export const deleteNotification = async (notificationId: string) => {
  try {
    const response: ApiResponse<any> = await apiClient.delete(
      `/notification/${notificationId}`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok) throw new Error("Error deleting notification");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Add a message to a notification thread
export const addNotificationThreadMessage = async (
  notificationId: string,
  content: string,
  senderRole?: "reporter" | "reportee" | "admin"
) => {
  try {
    const response: ApiResponse<any> = await apiClient.post(
      `/notification/${notificationId}/detail`,
      senderRole ? { content, sender_role: senderRole } : { content },
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error adding message to thread");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Create a notification for a report thread (admin only)
export const createReportThreadNotification = async (
  reportIssueId: string,
  title: string,
  content: string
) => {
  try {
    const response: ApiResponse<any> = await apiClient.post(
      `/notification/report-thread`,
      { report_issue_id: reportIssueId, title, content },
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error creating report thread notification");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Mark all messages in a notification thread as read
export const markThreadRead = async (notificationId: string) => {
  try {
    const response: ApiResponse<any> = await apiClient.post(
      `/notification/${notificationId}/read-one`,
      {},
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error marking thread as read");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Mark a notification as read on view (automatic)
export const markReadOnView = async (notificationId: string) => {
  try {
    const response: ApiResponse<any> = await apiClient.post(
      `/notification/${notificationId}/view-message`,
      {},
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error marking notification as read on view");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Get notification badge count (unread notifications)
export const fetchNotificationBadgeCount = async () => {
  try {
    const response: ApiResponse<any> = await apiClient.get(
      `/notification/badge-count`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error fetching badge count");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Get notification statistics (total, unread, etc)
export const fetchNotificationStatistics = async () => {
  try {
    const response: ApiResponse<any> = await apiClient.get(
      `/notification/stats`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error fetching notification statistics");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// SSE: Get real-time notification stream (for frontend EventSource)
export const getNotificationStreamUrl = () => {
  // This returns the URL for SSE, to be used with EventSource on the frontend
  return `${apiClient.getBaseURL()}/notification/stream`;
};

// Mark a single notification as read (explicit)
export const markSingleNotificationRead = async (notificationId: string) => {
  try {
    const response: ApiResponse<any> = await apiClient.post(
      `/notification/${notificationId}/read-message`,
      {},
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error marking notification as read");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};

// Mark all notifications as read for the current user (explicit)
export const markAllUserNotificationsRead = async () => {
  try {
    const response: ApiResponse<any> = await apiClient.post(
      `/notification/read-all`,
      {},
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok || !response.data)
      throw new Error("Error marking all user notifications as read");
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
};
