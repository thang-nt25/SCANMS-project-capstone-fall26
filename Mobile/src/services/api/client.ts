export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly unknownOutcome = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export interface TokenAccess {
  get(): string | null;
  onUnauthorized(): void;
}
export function unwrapEnvelope(value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "data" in value &&
    value.success === true
  )
    return value.data;
  return value;
}
function errorMessage(value: unknown, fallback: string): string {
  if (typeof value !== "object" || value === null || !("message" in value))
    return fallback;
  return typeof value.message === "string"
    ? value.message
    : Array.isArray(value.message)
      ? value.message
          .filter((entry): entry is string => typeof entry === "string")
          .join("\n")
      : fallback;
}
/** No automatic retries for writes. A timeout can mean the server committed successfully. */
export class ApiClient {
  private controllers = new Set<AbortController>();
  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenAccess,
    private readonly transport: typeof fetch = fetch,
  ) {}
  cancelAll() {
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
  }
  /** Authenticated binary exports. Writes are never retried: exporting a payout batch changes state. */
  async binary(
    path: string,
    options: { method?: "GET" | "POST"; body?: unknown; mime: string },
  ): Promise<Uint8Array> {
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("://") ||
      path.includes("\\")
    )
      throw new ApiError("Đường dẫn tải tệp không hợp lệ.", 0);
    const token = this.tokens.get();
    if (!token) throw new ApiError("Cần đăng nhập để tải tệp.", 401);
    const controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await this.transport(`${this.baseUrl}${path}`, {
        method: options.method || "GET",
        redirect: "error",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: options.mime,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      if (token !== this.tokens.get())
        throw new ApiError("Phiên đăng nhập đã thay đổi.", 409);
      if (response.status === 401) this.tokens.onUnauthorized();
      if (!response.ok) {
        let problem: unknown;
        try {
          problem = await response.json();
        } catch {
          /* Non-JSON gateway errors remain readable. */
        }
        throw new ApiError(
          errorMessage(problem, "Không tải được tệp."),
          response.status,
        );
      }
      if (
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .includes(options.mime)
      )
        throw new ApiError("Máy chủ không trả đúng định dạng tệp.", 502);
      if (
        Number(response.headers.get("content-length") || 0) >
        20 * 1024 * 1024
      )
        throw new ApiError("Tệp xuất quá lớn (tối đa 20 MB).", 413);
      const data = new Uint8Array(await response.arrayBuffer());
      if (token !== this.tokens.get())
        throw new ApiError("Phiên đăng nhập đã thay đổi.", 409);
      if (!data.byteLength || data.byteLength > 20 * 1024 * 1024)
        throw new ApiError("Kích thước tệp xuất không hợp lệ.", 413);
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        options.method === "POST"
          ? "Chưa xác định kết quả xuất lô. Hãy làm mới lịch sử lô trước khi thử lại."
          : "Tải tệp bị gián đoạn. Hãy thử lại.",
        0,
        options.method === "POST",
      );
    } finally {
      clearTimeout(timer);
      this.controllers.delete(controller);
    }
  }
  async request(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      signal?: AbortSignal;
      timeout?: number;
      anonymous?: boolean;
    } = {},
  ): Promise<unknown> {
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("://") ||
      path.includes("\\")
    )
      throw new ApiError("Đường dẫn API không hợp lệ.", 0);
    const method = options.method || "GET",
      token = options.anonymous ? null : this.tokens.get();
    const controller = new AbortController();
    this.controllers.add(controller);
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, options.timeout || 20000);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const form =
        typeof FormData !== "undefined" && options.body instanceof FormData;
      if (options.body !== undefined && !form)
        headers["Content-Type"] = "application/json";
      const response = await this.transport(`${this.baseUrl}${path}`, {
        method,
        headers,
        signal: controller.signal,
        redirect: "error",
        body:
          options.body === undefined
            ? undefined
            : form
              ? (options.body as FormData)
              : JSON.stringify(options.body),
      });
      if (!options.anonymous && token !== this.tokens.get())
        throw new ApiError("Phiên đăng nhập đã thay đổi.", 409);
      if (response.status === 401 && token && token === this.tokens.get())
        this.tokens.onUnauthorized();
      const text = await response.text();
      let body: unknown;
      if (!options.anonymous && token !== this.tokens.get())
        throw new ApiError(
          response.status === 401
            ? "Phiên đã hết hạn. Hãy đăng nhập lại."
            : "Phiên đăng nhập đã thay đổi.",
          response.status === 401 ? 401 : 409,
        );
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        throw new ApiError(
          "Máy chủ trả phản hồi không hợp lệ.",
          response.status,
        );
      }
      if (!response.ok) {
        throw new ApiError(
          errorMessage(
            body,
            response.status === 403
              ? "Bạn không có quyền thực hiện thao tác này."
              : "Yêu cầu chưa thành công.",
          ),
          response.status,
        );
      }
      return unwrapEnvelope(body);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const write = method !== "GET";
      throw new ApiError(
        write
          ? "Kết nối bị gián đoạn; kết quả chưa xác định. Hãy làm mới để kiểm tra trước khi gửi lại."
          : "Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.",
        0,
        write,
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      this.controllers.delete(controller);
    }
  }
}
