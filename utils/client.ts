import { create } from "apisauce";
import { supabase } from "./supabase";

export const apiClient = create({
  // baseURL: "https://api.servi-pal.com/api",
  // baseURL: "https://servipal-backend-334769928993.us-central1.run.app/api/v1",
  baseURL: "https://servipal-backend.onrender.com/api/v1",
  // baseURL: "https://servipal-backend.fastapicloud.dev/api/v1",
});

apiClient.addAsyncRequestTransform(async (request) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    request.headers!["Authorization"] = "Bearer " + session.access_token;
  }
});

export const mapboxClient = create({
  baseURL: "https://api.mapbox.com",
});
