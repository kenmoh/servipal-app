import { create } from "apisauce";
import { supabase } from "./supabase";

export const apiClient = create({
  baseURL: "https://api.servi-pal.com/api/v1",
  // baseURL: "https://servipal-backend-334769928993.us-central1.run.app/api/v1",

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


let isSigningOut = false;

apiClient.addAsyncResponseTransform(async (response) => {
  if (response.status !== 401 || isSigningOut) return;

  isSigningOut = true;
  try {
    // Last chance: if a refresh works, the session is still alive
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      await supabase.auth.signOut({ scope: "local" });
    }
  } catch {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {}
  } finally {
    isSigningOut = false;
  }
});