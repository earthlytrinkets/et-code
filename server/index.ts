/**
 * Server Entry Point
 *
 * Loads .env variables and starts the Express HTTP server.
 * This is the equivalent of your main() method in Spring Boot.
 *
 * Run with:   npm run dev:server
 * Or combined: npm run dev  (starts both Vite + this server via concurrently)
 */
import "dotenv/config";
import app from "./app.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});
