import { describe, expect, it, vi } from "vitest";
import { HttpFaceAuthClient } from "../src/clients/face-auth-client";
import {
  FaceAuthAppRejectedError,
  FaceAuthAppUnavailableError,
} from "../src/errors/admin-errors";

describe("HttpFaceAuthClient", () => {
  it("sends the student number and images as authenticated multipart data", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new HttpFaceAuthClient(
      "http://127.0.0.1:8000/api/face-images",
      "face-secret",
      { fetch: fetchMock },
    );

    await client.replaceFaceImages("1234567890", [
      {
        name: "face.jpg",
        type: "image/jpeg",
        data: new Blob(["image"], { type: "image/jpeg" }),
      },
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://127.0.0.1:8000/api/face-images");
    expect(request).toMatchObject({
      method: "PUT",
      headers: { authorization: "Bearer face-secret" },
    });
    const body = request?.body as FormData;
    expect(body.get("studentNumber")).toBe("1234567890");
    expect((body.getAll("images")[0] as File).name).toBe("face.jpg");
  });

  it("maps connection failures and rejected requests to application errors", async () => {
    const unavailable = new HttpFaceAuthClient("http://face", "token", {
      fetch: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
    });
    const rejected = new HttpFaceAuthClient("http://face", "token", {
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 422 })),
    });

    await expect(
      unavailable.replaceFaceImages("1234567890", []),
    ).rejects.toBeInstanceOf(FaceAuthAppUnavailableError);
    await expect(
      rejected.replaceFaceImages("1234567890", []),
    ).rejects.toBeInstanceOf(FaceAuthAppRejectedError);
  });
});
