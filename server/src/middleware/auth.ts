import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db/db.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  "fallback-dummy-secret-for-local-testing";
if (!process.env.JWT_SECRET && !process.env.SUPABASE_JWT_SECRET) {
  console.warn(
    "WARNING: JWT_SECRET and SUPABASE_JWT_SECRET are missing from environment variables. Using a fallback secret key for local startup. Authenticated operations will fail until you provide a valid JWT secret.",
  );
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: payload.sub || payload.id,
      email: payload.email,
    };
    next();
  } catch (err: any) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// WebSocket connection token verifier
export const verifyWebSocketToken = (token: string): { id: string; email: string } | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: payload.sub || payload.id,
      email: payload.email,
    };
  } catch {
    return null;
  }
};

// Admin validation middleware
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await query(
      "SELECT 1 FROM public.user_roles WHERE user_id = $1 AND role = 'admin'",
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: "Admin resource. Access denied." });
    }

    next();
  } catch (err) {
    console.error("Admin verification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
