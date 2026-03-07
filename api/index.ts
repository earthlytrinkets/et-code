/**
 * Vercel Serverless Entry Point
 *
 * Vercel treats every file inside the /api directory as a serverless function.
 * By exporting the Express app here, Vercel wraps it and handles routing.
 *
 * Combined with the rewrite rule in vercel.json:
 *   { "source": "/api/(.*)", "destination": "/api/index" }
 * ...all /api/* traffic is routed to this single handler.
 *
 * This means the same Express app works:
 *   - Locally → runs as a normal HTTP server on port 3001
 *   - On Vercel → runs as a serverless function (no server management needed)
 */
import "dotenv/config";
import app from "../server/app.js";

export default app;
