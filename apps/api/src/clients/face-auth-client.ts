import {
  FaceAuthAppRejectedError,
  FaceAuthAppUnavailableError,
} from "../errors/admin-errors";

export type FaceImage = {
  name: string;
  type: string;
  data: Blob;
};

export interface FaceAuthClient {
  replaceFaceImages(studentNumber: string, images: FaceImage[]): Promise<void>;
}

type HttpFaceAuthClientOptions = {
  fetch?: typeof fetch;
  timeoutMilliseconds?: number;
};

export class HttpFaceAuthClient implements FaceAuthClient {
  constructor(
    private readonly endpoint: string,
    private readonly bearerToken: string,
    private readonly options: HttpFaceAuthClientOptions = {},
  ) {}

  async replaceFaceImages(
    studentNumber: string,
    images: FaceImage[],
  ): Promise<void> {
    const body = new FormData();
    body.set("studentNumber", studentNumber);
    for (const image of images) {
      body.append("images", image.data, image.name);
    }

    let response: Response;
    try {
      response = await (this.options.fetch ?? fetch)(this.endpoint, {
        method: "PUT",
        headers: { authorization: `Bearer ${this.bearerToken}` },
        body,
        // 顔認証Appの停止時に管理APIの接続を保持し続けないため、送信時間を制限する。
        signal: AbortSignal.timeout(this.options.timeoutMilliseconds ?? 30_000),
      });
    } catch {
      throw new FaceAuthAppUnavailableError();
    }

    if (!response.ok) {
      throw new FaceAuthAppRejectedError();
    }
  }
}
