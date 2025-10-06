// Deno Edge Function for avatar proxying
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  console.log(`[AVATAR_PROXY] ${req.method} request to ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[AVATAR_PROXY] Handling CORS preflight request");
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
  
  console.log(`[AVATAR_PROXY] Requested path: ${path}`);
  
  if (!path) {
    console.log("[AVATAR_PROXY] Missing path parameter");
    return new Response("Missing path parameter", { 
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  // Validate path to prevent directory traversal
  if (path.includes("..") || path.startsWith("/")) {
    console.log(`[AVATAR_PROXY] Invalid path detected: ${path}`);
    return new Response("Invalid path", { 
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  const auth = req.headers.get("Authorization") ?? "";
  console.log(`[AVATAR_PROXY] Authorization header present: ${auth ? 'Yes' : 'No'}`);
  
  if (!auth.startsWith("Bearer ")) {
    console.log("[AVATAR_PROXY] Missing or invalid authorization header");
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

  const { data: userRes, error: userError } = await anon.auth.getUser();
  console.log(`[AVATAR_PROXY] User authentication result: ${userRes?.user ? 'Success' : 'Failed'}`);
  console.log(`[AVATAR_PROXY] User error: ${userError ? userError.message : 'None'}`);
  
  if (!userRes?.user) {
    console.log("[AVATAR_PROXY] No authenticated user found");
    console.log(`[AVATAR_PROXY] User error details: ${JSON.stringify(userError)}`);
    return new Response("Unauthorized", { 
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  console.log(`[AVATAR_PROXY] Authenticated user ID: ${userRes.user.id}`);

  // Optional: enforce your own ACL (e.g., only active profiles)
  const { data: profile, error: profileError } = await anon
    .from('user_profiles')
    .select('is_active')
    .eq('id', userRes.user.id)
    .single();
    
  console.log(`[AVATAR_PROXY] Profile query result: ${profile ? 'Found' : 'Not found'}, Error: ${profileError ? profileError.message : 'None'}`);
    
  if (!profile?.is_active) {
    console.log(`[AVATAR_PROXY] User profile is not active: ${profile?.is_active}`);
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
  
  console.log(`[AVATAR_PROXY] Attempting to download avatar from storage: ${path}`);
  
  const { data, error } = await service.storage
    .from("avatars")
    .download(path);
    
  console.log(`[AVATAR_PROXY] Storage download result: ${data ? 'Success' : 'Failed'}, Error: ${error ? error.message : 'None'}`);
  
  if (error || !data) {
    console.log(`[AVATAR_PROXY] Avatar not found in storage for path: ${path}`);
    return new Response("Avatar not found", { 
      status: 404,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  console.log(`[AVATAR_PROXY] Avatar found, content type: ${data.type}, size: ${data.size}`);

  // Basic CORS (lock to your domain in prod)
  const cors = {
    "Access-Control-Allow-Origin": "*", // Change to your domain in production
    "Vary": "Origin",
  };

  const arrayBuffer = await data.arrayBuffer();
  console.log(`[AVATAR_PROXY] Returning avatar with ${arrayBuffer.byteLength} bytes`);

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
      ...cors,
    },
  });
});
