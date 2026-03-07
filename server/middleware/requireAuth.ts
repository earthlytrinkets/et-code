/**
 * Auth Middleware
 *
 * Reads the Bearer token from the Authorization header, validates it against
 * Supabase, and attaches the user ID to the request.
 *
 * This is the Node.js equivalent of a Spring Security filter / OncePerRequestFilter.
 * - Request comes in → middleware runs first → if valid, calls next() → route handler runs
 * - If invalid → sends 401 immediately, route handler never runs
 */
import { Request, Response, NextFunction } from "express";
import supabaseAdmin from "../services/supabaseAdmin.js";

// Extend Express's Request type to carry the authenticated user ID
export interface AuthRequest extends Request {
  userId?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: missing token" });
    return;
  }

  const token = authHeader.slice(7);

  // Ask Supabase to verify the JWT and return the user
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Unauthorized: invalid token" });
    return;
  }

  req.userId = user.id;
  next(); // Passes control to the next handler (like chain.doFilter() in Spring)
};
