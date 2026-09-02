import { describe, expect, it } from "vitest";
import { readAuthAppBearerToken } from "../src/app";

describe("readAuthAppBearerToken", () => {
  it("returns the configured token", () => {
    expect(
      readAuthAppBearerToken({ AUTH_APP_BEARER_TOKEN: "secret-token" }),
    ).toBe("secret-token");
  });

  it.each([undefined, "", "   "])(
    "throws when the token is not configured (%s)",
    (token) => {
      expect(() =>
        readAuthAppBearerToken({ AUTH_APP_BEARER_TOKEN: token }),
      ).toThrow("AUTH_APP_BEARER_TOKEN is required");
    },
  );
});
