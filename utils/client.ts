import { create } from "apisauce";
import { supabase } from "./supabase";

export const apiClient = create({
  // baseURL: "https://api.servi-pal.com/api",
  baseURL: "https://servipal-backend.onrender.com/api/v1",
});

apiClient.addAsyncRequestTransform(async (request) => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error("User not authenticated");
  }

  request.headers!["Authorization"] = "Bearer " + session.access_token;
});

export const mapboxClient = create({
  baseURL: "https://api.mapbox.com",
});
