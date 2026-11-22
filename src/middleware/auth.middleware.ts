import type { NextFunction, Request, Response } from "express";
import {
  createRemoteJWKSet,
  importJWK,
  jwtVerify,
  type JWK,
  type JWTHeaderParameters,
} from "jose";
import mongoose from "mongoose";
import { getEnv } from "../config/env.js";
import type { UserRole } from "../constants/salon.js";
import { User } from "../models/user.model.js";
import type { AuthenticatedUser } from "../types/express.js";
import { ApiError } from "../utils/apiError.js";
import { isValidObjectId } from "../utils/objectId.js";

type ResolvedKey = Awaited<ReturnType<typeof importJWK>>;

interface StoredJwkDoc {
  _id?: unknown;
  id?: string;
  publicKey?: string;
  alg?: string;
}

export interface AuthMiddlewareDeps {
  getKey: (header: JWTHeaderParameters) => Promise<ResolvedKey>;
  issuer: string;
  audience: string;
  findUserById: (userId: string) => Promise<AuthenticatedUser | null>;
}

const JWKS_CACHE_TTL_MS = 60_000;
let cachedKeys: Map<string, { jwk: JWK; alg?: string }> = new Map();
let cachedAt = 0;

async function loadDbJwks(): Promise<Map<string, { jwk: JWK; alg?: string }>> {
  const db = mongoose.connection.db;
  if (!db) return new Map();

  const docs = (await db.collection("jwks").find({}).toArray()) as StoredJwkDoc[];
  const nextMap = new Map<string, { jwk: JWK; alg?: string }>();

  for (const doc of docs) {
    const kid = doc.id || (doc._id ? String(doc._id) : undefined);
    if (!kid || !doc.publicKey) continue;
    try {
      const parsed = JSON.parse(doc.publicKey) as JWK;
      nextMap.set(kid, { jwk: parsed, alg: doc.alg });
    } catch {
      // Ignore malformed key entries
    }
  }

  cachedKeys = nextMap;
  cachedAt = Date.now();
  return nextMap;
}

async function resolveDefaultUser(userId: string): Promise<AuthenticatedUser | null> {
  const query = isValidObjectId(userId)
    ? { _id: new mongoose.Types.ObjectId(userId) }
    : { _id: userId };

  const user = await User.findOne(query)
    .select("name email role isBlocked image phone")
    .lean();

  if (!user) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    isBlocked: Boolean(user.isBlocked),
    image: user.image ?? null,
    phone: user.phone ?? null,
  };
}

function createDefaultDeps(): AuthMiddlewareDeps {
  const { BETTER_AUTH_URL } = getEnv();
  const baseUrl = BETTER_AUTH_URL.replace(/\/+$/, "");
  const remoteJwks = createRemoteJWKSet(new URL(`${baseUrl}/api/auth/jwks`));

  return {
    issuer: baseUrl,
    audience: baseUrl,
    findUserById: resolveDefaultUser,
    getKey: async (header: JWTHeaderParameters) => {
      if (header.kid) {
        const isStale = Date.now() - cachedAt > JWKS_CACHE_TTL_MS;
        if (isStale || !cachedKeys.has(header.kid)) {
          await loadDbJwks();
        }
        const entry = cachedKeys.get(header.kid);
        if (entry) {
          const alg = entry.alg || header.alg || "EdDSA";
          return importJWK(entry.jwk, alg);
        }
      }
      return remoteJwks(header) as Promise<ResolvedKey>;
    },
  };
}

/**
 * Factory creating Express JWT verification middleware with injectable dependencies for testing.
 */
export function createVerifyJWT(depsFactory: () => AuthMiddlewareDeps = createDefaultDeps) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new ApiError(401, "Authentication token is required", "UNAUTHORIZED");
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        throw new ApiError(401, "Authentication token is required", "UNAUTHORIZED");
      }

      const deps = depsFactory();
      const { payload } = await jwtVerify(
        token,
        (header) => deps.getKey(header),
        {
          issuer: deps.issuer,
          audience: deps.audience,
        }
      );

      if (!payload.sub) {
        throw new ApiError(401, "Invalid token subject", "UNAUTHORIZED");
      }

      const user = await deps.findUserById(payload.sub);
      if (!user) {
        throw new ApiError(401, "User account no longer exists", "UNAUTHORIZED");
      }

      if (user.isBlocked) {
        throw new ApiError(
          403,
          "Your account has been blocked by an administrator",
          "ACCOUNT_BLOCKED"
        );
      }

      req.user = user;
      next();
    } catch (err) {
      if (err instanceof ApiError) {
        next(err);
        return;
      }
      next(new ApiError(401, "Invalid or expired authentication token", "INVALID_TOKEN"));
    }
  };
}

export const verifyJWT = createVerifyJWT();
