import type { MiddlewareHandler } from "hono";

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
    return c.json(
      {
        error: {
          code: "INVALID_ORIGIN",
          message: "許可されていないリクエストです",
        },
      },
      403,
    );
  }

  await next();
};
