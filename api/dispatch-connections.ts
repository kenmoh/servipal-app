import type {
  ConnectionActionResponse,
  ConnectionListResponse,
  ConnectionStatus,
  DispatchDirectoryResponse,
} from "@/types/dispatch-connection";
import { apiClient } from "@/utils/client";
import type { ApiResponse } from "apisauce";

const unwrap = async <T>(
  response: ApiResponse<unknown>,
  fallback: string,
): Promise<T> => {
  if (!response.ok) {
    const body = response.data as
      | { detail?: unknown; message?: string }
      | null
      | undefined;
    const detail = body?.detail;
    let message = "";
    if (typeof detail === "string") {
      message = detail;
    } else if (detail && typeof detail === "object") {
      message =
        (detail as { message?: string }).message ||
        (detail as { msg?: string }).msg ||
        "";
    } else {
      message = body?.message || "";
    }
    throw new Error(message || fallback);
  }
  return response.data as T;
};

export const fetchDispatchDirectory = async (
  params: { q?: string; page?: number; page_size?: number } = {},
): Promise<DispatchDirectoryResponse> =>
  await unwrap<DispatchDirectoryResponse>(
    await apiClient.get("/dispatches", params),
    "Failed to load dispatch companies",
  );

export const createDispatchConnection = async (
  dispatchId: string,
): Promise<ConnectionActionResponse> =>
  await unwrap<ConnectionActionResponse>(
    await apiClient.post("/vendor/dispatch-connections", {
      dispatch_id: dispatchId,
    }),
    "Could not send the connection request",
  );

export const fetchVendorConnections = async (
  status?: ConnectionStatus,
): Promise<ConnectionListResponse> =>
  await unwrap<ConnectionListResponse>(
    await apiClient.get(
      "/vendor/dispatch-connections",
      status ? { status } : {},
    ),
    "Could not load your connections",
  );

export const disconnectVendorConnection = async (
  dispatchId: string,
): Promise<ConnectionActionResponse> =>
  await unwrap<ConnectionActionResponse>(
    await apiClient.delete(`/vendor/dispatch-connections/${dispatchId}`),
    "Could not disconnect",
  );

export const fetchDispatchConnectionRequests = async (
  status?: ConnectionStatus,
): Promise<ConnectionListResponse> =>
  await unwrap<ConnectionListResponse>(
    await apiClient.get(
      "/dispatch/connection-requests",
      status ? { status } : {},
    ),
    "Could not load connection requests",
  );

export const acceptConnectionRequest = async (
  connectionId: string,
): Promise<ConnectionActionResponse> =>
  await unwrap<ConnectionActionResponse>(
    await apiClient.post(
      `/dispatch/connection-requests/${connectionId}/accept`,
    ),
    "Could not accept the request",
  );

export const declineConnectionRequest = async (
  connectionId: string,
  note?: string,
): Promise<ConnectionActionResponse> =>
  await unwrap<ConnectionActionResponse>(
    await apiClient.post(
      `/dispatch/connection-requests/${connectionId}/decline`,
      note ? { note } : {},
    ),
    "Could not decline the request",
  );

export const disconnectDispatchConnection = async (
  connectionId: string,
): Promise<ConnectionActionResponse> =>
  await unwrap<ConnectionActionResponse>(
    await apiClient.delete(`/dispatch/connection-requests/${connectionId}`),
    "Could not disconnect",
  );
