import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient: Redis | null = null;
let useMemoryFallback = false;
const memoryStore = new Map<string, string>();

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      if (times > 2) {
        console.warn("Redis connection failed. Falling back to in-memory store.");
        useMemoryFallback = true;
        return null; // Stop retrying
      }
      return Math.min(times * 100, 2000);
    },
  });

  redisClient.on("error", (err: any) => {
    // Suppress console spam if it keeps failing
    if (!useMemoryFallback) {
      console.warn("Redis client encountered an error:", err.message);
    }
    useMemoryFallback = true;
  });

  redisClient.on("connect", () => {
    console.log("Redis connected successfully.");
    useMemoryFallback = false;
  });
} catch (err) {
  console.warn("Failed to initialize Redis client. Using in-memory fallback.", err);
  useMemoryFallback = true;
}

export const get = async (key: string): Promise<string | null> => {
  if (useMemoryFallback || !redisClient) {
    return memoryStore.get(key) || null;
  }
  try {
    return await redisClient.get(key);
  } catch (err) {
    return memoryStore.get(key) || null;
  }
};

export const set = async (key: string, value: string, expireSeconds?: number): Promise<void> => {
  if (useMemoryFallback || !redisClient) {
    memoryStore.set(key, value);
    return;
  }
  try {
    if (expireSeconds) {
      await redisClient.set(key, value, "EX", expireSeconds);
    } else {
      await redisClient.set(key, value);
    }
  } catch (err) {
    memoryStore.set(key, value);
  }
};

export const del = async (key: string): Promise<void> => {
  if (useMemoryFallback || !redisClient) {
    memoryStore.delete(key);
    return;
  }
  try {
    await redisClient.del(key);
  } catch (err) {
    memoryStore.delete(key);
  }
};

export const incr = async (key: string): Promise<number> => {
  if (useMemoryFallback || !redisClient) {
    const val = parseInt(memoryStore.get(key) || "0", 10) + 1;
    memoryStore.set(key, val.toString());
    return val;
  }
  try {
    return await redisClient.incr(key);
  } catch (err) {
    const val = parseInt(memoryStore.get(key) || "0", 10) + 1;
    memoryStore.set(key, val.toString());
    return val;
  }
};

export const checkRedisConnection = async (): Promise<boolean> => {
  if (useMemoryFallback || !redisClient) return false;
  try {
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
};
