// Deno Edge Function for avatar proxying
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  
  if (!path) {
    return new Response("Missing path parameter", { 
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  // Validate path to prevent directory traversal
  if (path.includes("..") || path.startsWith("/")) {
    return new Response("Invalid path", { 
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  const auth = req.headers.get("Authorization") ?? "";
  
  if (!auth.startsWith("Bearer ")) {
    return new Response("Missing or invalid authorization", { 
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!, 
    Deno.env.get("SUPABASE_ANON_KEY")!, 
    {
      global: { headers: { Authorization: auth } },
    }
  );

  const { data: userRes } = await anon.auth.getUser();
  
  if (!userRes?.user) {
    return new Response("Unauthorized", { 
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  // Optional: enforce your own ACL (e.g., only active profiles)
  const { data: profile } = await anon
    .from('user_profiles')
    .select('is_active')
    .eq('id', userRes.user.id)
    .single();
    
  if (!profile?.is_active) {
    return new Response("Forbidden", { 
      status: 403,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  // Use service role only inside this trusted function for Storage access
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!, 
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  const { data, error } = await service.storage
    .from("avatars")
    .download(path);
    
  if (error || !data) {
    return new Response("Avatar not found", { 
      status: 404,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  // Basic CORS (lock to your domain in prod)
  const cors = {
    "Access-Control-Allow-Origin": "*", // Change to your domain in production
    "Vary": "Origin",
  };

  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
      ...cors,
    },
  });
});
