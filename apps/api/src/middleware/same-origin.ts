import type { MiddlewareHandler } from "hono";
import { InvalidOriginError } from "../errors/auth-errors";

export const requireSameOrigin: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header("origin");
  // Cookie認証の変更系APIを、別オリジンからのリクエストから保護する。
  const host = (c.req.header("host") ?? new URL(c.req.url).host).toLowerCase();
  let originHost: string | undefined;

  try {
    originHost = origin ? new URL(origin).host.toLowerCase() : undefined;
  } catch {
    originHost = undefined;
  }

  if (!host || originHost !== host) {
    throw new InvalidOriginError();
  }

  await next();
};
