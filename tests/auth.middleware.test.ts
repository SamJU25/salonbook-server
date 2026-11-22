import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { generateKeyPair, SignJWT } from "jose";
import { createVerifyJWT } from "../src/middleware/auth.middleware.js";
import { requireRole } from "../src/middleware/role.middleware.js";
import { ApiError } from "../src/utils/apiError.js";

function mockRequest(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

describe("verifyJWT & requireRole middleware", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const verify = createVerifyJWT(() => ({
      issuer: "http://localhost:3000",
      audience: "http://localhost:3000",
      getKey: async () => {
        throw new Error("Should not be called");
      },
      findUserById: async () => null,
    }));

    let capturedError: unknown;
    await verify(mockRequest(), {} as Response, ((err?: unknown) => {
      capturedError = err;
    }) as NextFunction);

    assert.ok(capturedError instanceof ApiError);
    assert.equal(capturedError.statusCode, 401);
  });

  it("returns 401 when token signature is invalid", async () => {
    const signingPair = await generateKeyPair("EdDSA");
    const otherPair = await generateKeyPair("EdDSA");

    const token = await new SignJWT({ role: "customer" })
      .setProtectedHeader({ alg: "EdDSA", kid: "k1" })
      .setSubject("507f1f77bcf86cd799439011")
      .setIssuer("http://localhost:3000")
      .setAudience("http://localhost:3000")
      .setExpirationTime("5m")
      .sign(signingPair.privateKey);

    const verify = createVerifyJWT(() => ({
      issuer: "http://localhost:3000",
      audience: "http://localhost:3000",
      getKey: async () => otherPair.publicKey,
      findUserById: async () => null,
    }));

    let capturedError: unknown;
    await verify(
      mockRequest({ authorization: `Bearer ${token}` }),
      {} as Response,
      ((err?: unknown) => {
        capturedError = err;
      }) as NextFunction
    );

    assert.ok(capturedError instanceof ApiError);
    assert.equal(capturedError.statusCode, 401);
  });

  it("returns 403 when authenticated user is blocked", async () => {
    const { publicKey, privateKey } = await generateKeyPair("EdDSA");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "EdDSA", kid: "k1" })
      .setSubject("507f1f77bcf86cd799439011")
      .setIssuer("http://localhost:3000")
      .setAudience("http://localhost:3000")
      .setExpirationTime("5m")
      .sign(privateKey);

    const verify = createVerifyJWT(() => ({
      issuer: "http://localhost:3000",
      audience: "http://localhost:3000",
      getKey: async () => publicKey,
      findUserById: async (id) => ({
        id,
        name: "Blocked User",
        email: "blocked@example.com",
        role: "customer",
        isBlocked: true,
      }),
    }));

    let capturedError: unknown;
    await verify(
      mockRequest({ authorization: `Bearer ${token}` }),
      {} as Response,
      ((err?: unknown) => {
        capturedError = err;
      }) as NextFunction
    );

    assert.ok(capturedError instanceof ApiError);
    assert.equal(capturedError.statusCode, 403);
    assert.equal(capturedError.code, "ACCOUNT_BLOCKED");
  });

  it("attaches req.user on valid token and enforces requireRole", async () => {
    const { publicKey, privateKey } = await generateKeyPair("EdDSA");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "EdDSA", kid: "k1" })
      .setSubject("507f1f77bcf86cd799439011")
      .setIssuer("http://localhost:3000")
      .setAudience("http://localhost:3000")
      .setExpirationTime("5m")
      .sign(privateKey);

    const verify = createVerifyJWT(() => ({
      issuer: "http://localhost:3000",
      audience: "http://localhost:3000",
      getKey: async () => publicKey,
      findUserById: async (id) => ({
        id,
        name: "Active Customer",
        email: "customer@example.com",
        role: "customer",
        isBlocked: false,
      }),
    }));

    const req = mockRequest({ authorization: `Bearer ${token}` });
    let verifyErr: unknown;
    await verify(req, {} as Response, ((err?: unknown) => {
      verifyErr = err;
    }) as NextFunction);

    assert.equal(verifyErr, undefined);
    assert.equal(req.user?.role, "customer");

    // Admin role guard should reject customer with 403
    let roleErr: unknown;
    requireRole("admin")(req, {} as Response, ((err?: unknown) => {
      roleErr = err;
    }) as NextFunction);
    assert.ok(roleErr instanceof ApiError);
    assert.equal(roleErr.statusCode, 403);

    // Customer role guard should allow customer
    let customerErr: unknown;
    requireRole("customer")(req, {} as Response, ((err?: unknown) => {
      customerErr = err;
    }) as NextFunction);
    assert.equal(customerErr, undefined);
  });
});
