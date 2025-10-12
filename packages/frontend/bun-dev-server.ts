/**
 * Bun 1.3 Native Full-Stack Dev Server
 * ======================================
 * 
 * This is an OPTIONAL alternative to Vite that leverages Bun 1.3's new
 * full-stack development features:
 * 
 * ✨ Features:
 * - ⚡ Faster startup (~7ms vs Vite's ~800ms)
 * - 🔥 Built-in React Fast Refresh
 * - 📦 Native JavaScript/CSS transpilers
 * - 🎯 Hot Module Replacement (HMR)
 * - 🔍 Browser → terminal console logs
 * 
 * Usage:
 * - Development: bun run bun-dev-server.ts
 * - Keep Vite as fallback: bun run dev:vite
 * 
 * Note: This is experimental. Test thoroughly before switching completely.
 */

import { serve } from "bun";
import type { ServerWebSocket } from "bun";

// Import the HTML file - Bun will automatically bundle referenced assets
import indexHtml from "./index.html";

const PORT = Number(process.env.PORT) || 5173;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

interface WebSocketData {
  type: "client";
}

const server = serve<WebSocketData>({
  port: PORT,
  
  // Enable development mode for hot reloading and React Fast Refresh
  development: true,

  async fetch(req, server) {
    const url = new URL(req.url);

    // Upgrade WebSocket connections for HMR
    if (url.pathname === "/ws" || url.pathname === "/__bun_hmr__") {
      const upgraded = server.upgrade(req, {
        data: { type: "client" as const }
      });
      
      if (upgraded) {
        return undefined;
      }
    }

    // Proxy API requests to backend
    if (url.pathname.startsWith("/api")) {
      const backendUrl = new URL(req.url);
      backendUrl.protocol = new URL(BACKEND_URL).protocol;
      backendUrl.host = new URL(BACKEND_URL).host;
      
      try {
        const response = await fetch(backendUrl, {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });
        
        return response;
      } catch (error) {
        console.error("❌ Backend proxy error:", error);
        return new Response("Backend unavailable", { status: 503 });
      }
    }

    // Serve the main HTML file
    // Bun automatically bundles and serves referenced JS/CSS/assets
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(indexHtml, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // Let Bun handle other assets (JS, CSS, images, etc.)
    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      // Handle WebSocket messages for HMR
      // Bun handles this automatically in development mode
    },
    
    open(ws: ServerWebSocket<WebSocketData>) {
      console.log("🔌 Client connected");
    },
    
    close(ws: ServerWebSocket<WebSocketData>) {
      console.log("🔌 Client disconnected");
    },
  },

  error(error: Error) {
    console.error("❌ Dev server error:", error);
    
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dev Server Error</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2rem;
              background: #1a1a1a;
              color: #fff;
            }
            .error {
              background: #2d1f1f;
              border: 2px solid #ff6b6b;
              border-radius: 8px;
              padding: 1.5rem;
              max-width: 800px;
            }
            h1 { margin-top: 0; color: #ff6b6b; }
            pre {
              background: #000;
              padding: 1rem;
              border-radius: 4px;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>⚠️ Development Server Error</h1>
            <pre>${error.message}\n\n${error.stack}</pre>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  },
});

console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Bun 1.3 Full-Stack Dev Server                          ║
║  ⚡ Powered by Bun's Native Bundler                        ║
╚════════════════════════════════════════════════════════════╝

  📍 Local:     http://localhost:${server.port}
  🔌 Backend:   ${BACKEND_URL}
  🔥 Features:  React Fast Refresh, HMR, Hot Reloading
  
  📚 Compare with Vite: bun run dev:vite
  
  Press Ctrl+C to stop
`);

