import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

// For production databases (like Supabase) SSL is usually required.
// We parse the ssl option dynamically or default to requiring it if it's external.
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

export const pool = new Pool({
  connectionString,
  ssl: isLocal
    ? false
    : {
        rejectUnauthorized: false,
      },
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Log slow queries or debug queries if needed
    if (duration > 500) {
      console.warn(`Slow Query: ${text} (${duration}ms)`);
    }
    return res;
  } catch (error) {
    console.error(`Database Query Error: ${text}`, error);
    throw error;
  }
};

// Check DB Connection
export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (err) {
    console.error("Failed to connect to the database", err);
    return false;
  }
};
