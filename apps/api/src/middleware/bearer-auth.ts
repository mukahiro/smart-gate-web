import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";

const extractBearerToken = (authorization: string | undefined) => {
  const match = authorization?.match(/^Bearer (.+)$/i);
  return match?.[1];
};

export const isValidBearerToken = (
  authorization: string | undefined,
  expectedToken?: string,
) => {
  if (!expectedToken) {
    return false;
  }

  const actualToken = extractBearerToken(authorization);

  if (!actualToken) {
    return false;
  }

  const actualBuffer = Buffer.from(actualToken);
  const expectedBuffer = Buffer.from(expectedToken);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

export const createBearerAuthMiddleware =
  (expectedToken?: string): MiddlewareHandler =>
  async (c, next) => {
    if (isValidBearerToken(c.req.header("authorization"), expectedToken)) {
      await next();
      return;
    }

    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "認証が必要です",
        },
      },
      401,
    );
  };
