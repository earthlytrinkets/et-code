/**
 * Express Application
 *
 * This is the equivalent of your Spring Boot @SpringBootApplication class —
 * it wires up middleware and routes, then exports the app.
 *
 * Middleware stack (runs in order for every request):
 *   1. cors()        — allows the browser (port 8080) to call this server (port 3001)
 *   2. express.json() — parses the JSON request body (like @RequestBody in Spring)
 *   3. Routes        — your @RestController equivalents
 */
import express from "express";
import cors from "cors";
import orderRoutes from "./routes/orders.js";
import couponRoutes from "./routes/coupons.js";

const app = express();

// Allow requests from Vite dev server and production domain
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      process.env.FRONTEND_URL ?? "http://localhost:8080",
    ],
  })
);

app.use(express.json());

// Mount route groups (like @RequestMapping("/api/orders") in Spring)
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);

// Health check — useful for Vercel / Render uptime monitoring
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

export default app;
