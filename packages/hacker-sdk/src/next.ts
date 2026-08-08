import { HackerSdkError, parseHackerSdkError } from "./errors";
import {
  DEFAULT_HACKER_SDK_ADAPTER_PATH,
  getHackerSdkSignInPath,
  getHackerSdkSignOutPath,
  normalizeHackerSdkBasePath,
  normalizeHackerSdkReturnPath,
} from "./paths";

const DEFAULT_BLADE_PATHS = {
  authorize: "/api/hacker/v1/auth/authorize",
  logout: "/api/hacker/v1/auth/logout",
  refresh: "/api/hacker/v1/auth/refresh",
  resume: "/api/hacker/v1/resume",
  revoke: "/api/hacker/v1/auth/revoke",
  token: "/api/hacker/v1/auth/token",
  trpc: "/api/hacker/v1/trpc",
} as const;

export function getHackerSdkCookieNames(
  clientId: string,
  portalOrigin: string,
) {
  let hash = 2_166_136_261;
  for (const character of `${clientId}\0${portalOrigin}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  const namespace = (hash >>> 0).toString(36);
  return {
    access: `forge_hacker_${namespace}_access`,
    refresh: `forge_hacker_${namespace}_refresh`,
    state: `forge_hacker_${namespace}_oauth_state`,
    verifier: `forge_hacker_${namespace}_oauth_verifier`,
  } as const;
}

const PRIVATE_HEADERS = {
  "cache-control": "private, no-store",
  pragma: "no-cache",
} as const;

const MAX_TRPC_REQUEST_BYTES = 1_048_576;
const MAX_RESUME_REQUEST_BYTES = 5_200_000;

export interface HackerSdkNextOptions {
  /** The Blade deployment which owns participant data and portal auth. */
  bladeOrigin: string;
  /** The public portal client provisioned for this hackathon. */
  clientId: string;
  /**
   * The browser-facing portal origin. Set this in production when the portal
   * runs behind a reverse proxy whose internal request URL uses another host.
   */
  portalOrigin?: string;
  adapterBasePath?: string;
  fetch?: typeof globalThis.fetch;
  paths?: Partial<typeof DEFAULT_BLADE_PATHS>;
}

export interface HackerSdkNextRouteContext {
  params?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}

export type HackerSdkNextHandler = (
  request: Request,
  context?: HackerSdkNextRouteContext,
) => Promise<Response>;

interface PortalTokenResponse {
  accessToken: string;
  accessTokenExpiresIn?: number;
  refreshToken: string;
  refreshTokenExpiresIn?: number;
}

interface AuthStateCookie {
  returnTo: string;
  state: string;
}

function validateBladeOrigin(value: string) {
  const parsed = new URL(value);
  if (parsed.username || parsed.password || parsed.pathname !== "/") {
    throw new Error(
      "bladeOrigin must be an origin without credentials or a path.",
    );
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("bladeOrigin must use HTTP or HTTPS.");
  }
  return parsed.origin;
}

function validatePortalOrigin(value: string) {
  const parsed = new URL(value);
  if (parsed.username || parsed.password || parsed.pathname !== "/") {
    throw new Error(
      "portalOrigin must be an origin without credentials or a path.",
    );
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("portalOrigin must use HTTP or HTTPS.");
  }
  return parsed.origin;
}

function randomBase64Url(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

function toBase64Url(value: Uint8Array | string) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return new Uint8Array(
    Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

async function createPkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return toBase64Url(new Uint8Array(digest));
}

function parseCookies(request: Request) {
  const cookies = new Map<string, string>();
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies.set(name, decodeURIComponent(value));
  }
  return cookies;
}

function serializeCookie(
  name: string,
  value: string,
  options: { maxAge?: number; secure: boolean },
) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (options.secure) attributes.push("Secure");
  if (options.maxAge != null) {
    attributes.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }
  return attributes.join("; ");
}

function clearSessionCookies(
  headers: Headers,
  secure: boolean,
  cookieNames: ReturnType<typeof getHackerSdkCookieNames>,
) {
  headers.append(
    "set-cookie",
    serializeCookie(cookieNames.access, "", { maxAge: 0, secure }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(cookieNames.refresh, "", { maxAge: 0, secure }),
  );
}

function setSessionCookies(
  headers: Headers,
  tokens: PortalTokenResponse,
  secure: boolean,
  cookieNames: ReturnType<typeof getHackerSdkCookieNames>,
) {
  headers.append(
    "set-cookie",
    serializeCookie(cookieNames.access, tokens.accessToken, {
      maxAge: tokens.accessTokenExpiresIn ?? 15 * 60,
      secure,
    }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(cookieNames.refresh, tokens.refreshToken, {
      maxAge: tokens.refreshTokenExpiresIn ?? 30 * 24 * 60 * 60,
      secure,
    }),
  );
}

function parseAuthState(
  value: string | undefined,
): AuthStateCookie | undefined {
  if (!value) return undefined;
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(value));
    const parsed: unknown = JSON.parse(decoded);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "state" in parsed &&
      "returnTo" in parsed &&
      typeof parsed.state === "string" &&
      typeof parsed.returnTo === "string"
    ) {
      return { returnTo: parsed.returnTo, state: parsed.state };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function callbackUrl(requestUrl: URL, adapterBasePath: string) {
  return `${requestUrl.origin}${adapterBasePath}/callback`;
}

function routePath(requestUrl: URL, adapterBasePath: string) {
  if (
    requestUrl.pathname !== adapterBasePath &&
    !requestUrl.pathname.startsWith(`${adapterBasePath}/`)
  ) {
    return undefined;
  }
  return requestUrl.pathname.slice(adapterBasePath.length).replace(/^\/+/, "");
}

function ensureSameOrigin(request: Request, expectedOrigin: string) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === expectedOrigin;
}

function jsonError(error: HackerSdkError, status = 400, headers?: Headers) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
    responseHeaders.set(name, value);
  }
  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        fieldIssues: error.fieldIssues,
        message: error.message,
        requestId: error.requestId,
        retryable: error.retryable,
      },
    }),
    { headers: responseHeaders, status },
  );
}

async function readTokenResponse(response: Response) {
  const body: unknown = await response.json().catch(() => undefined);
  if (
    !response.ok ||
    typeof body !== "object" ||
    body === null ||
    !("accessToken" in body) ||
    !("refreshToken" in body) ||
    typeof body.accessToken !== "string" ||
    typeof body.refreshToken !== "string"
  ) {
    throw parseHackerSdkError(body, {
      requestId: response.headers.get("x-request-id") ?? undefined,
      status: response.status,
    });
  }
  return body as PortalTokenResponse;
}

async function isExpiredSession(response: Response) {
  if (response.status === 401) return true;
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return false;
  }
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => undefined);
  return parseHackerSdkError(body).code === "SESSION_EXPIRED";
}

function copyProxyResponse(response: Response, extraHeaders?: Headers) {
  const headers = new Headers(extraHeaders);
  for (const name of [
    "content-disposition",
    "content-length",
    "content-type",
    "x-request-id",
  ]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, { headers, status: response.status });
}

function expectedContentType(path: string, request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const contentType = request.headers.get("content-type") ?? "";
  if (path.startsWith("trpc/"))
    return contentType.startsWith("application/json");
  if (path === "resume/upload")
    return contentType.startsWith("multipart/form-data");
  return contentType.startsWith("application/json");
}

async function readReplayableBody(request: Request, maxBytes: number) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) {
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
  }
  if (!request.body) return undefined;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    received += result.value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(result.value);
  }
  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

export function createHackerSdkNextHandler(
  options: HackerSdkNextOptions,
): HackerSdkNextHandler {
  const bladeOrigin = validateBladeOrigin(options.bladeOrigin);
  const configuredPortalOrigin = options.portalOrigin
    ? validatePortalOrigin(options.portalOrigin)
    : undefined;
  const adapterBasePath = normalizeHackerSdkBasePath(
    options.adapterBasePath ?? DEFAULT_HACKER_SDK_ADAPTER_PATH,
  );
  const requestFetch = options.fetch ?? globalThis.fetch;
  const paths = { ...DEFAULT_BLADE_PATHS, ...options.paths };
  const pendingRefreshes = new Map<string, Promise<PortalTokenResponse>>();

  function refreshSession(refreshToken: string) {
    const active = pendingRefreshes.get(refreshToken);
    if (active) return active;

    const pending = requestFetch(new URL(paths.refresh, bladeOrigin), {
      body: JSON.stringify({
        clientId: options.clientId,
        refreshToken,
      }),
      headers: {
        "content-type": "application/json",
        "x-forge-portal-client": options.clientId,
      },
      method: "POST",
      redirect: "manual",
    })
      .then(readTokenResponse)
      .finally(() => {
        if (pendingRefreshes.get(refreshToken) === pending) {
          pendingRefreshes.delete(refreshToken);
        }
      });
    pendingRefreshes.set(refreshToken, pending);
    return pending;
  }

  return async function hackerSdkNextHandler(request) {
    const requestUrl = new URL(request.url);
    const publicRequestUrl = configuredPortalOrigin
      ? new URL(
          `${requestUrl.pathname}${requestUrl.search}`,
          configuredPortalOrigin,
        )
      : requestUrl;
    const cookieNames = getHackerSdkCookieNames(
      options.clientId,
      publicRequestUrl.origin,
    );
    const path = routePath(requestUrl, adapterBasePath);
    const secure = publicRequestUrl.protocol === "https:";

    if (path === undefined) {
      return jsonError(
        new HackerSdkError({
          code: "FORBIDDEN",
          message: "The request is outside the Hacker SDK adapter path.",
          retryable: false,
        }),
        404,
      );
    }

    if (path === "sign-in" && request.method === "GET") {
      const state = randomBase64Url(32);
      const verifier = randomBase64Url(64);
      const challenge = await createPkceChallenge(verifier);
      const returnTo = normalizeHackerSdkReturnPath(
        requestUrl.searchParams.get("returnTo"),
      );
      const encodedState = toBase64Url(JSON.stringify({ returnTo, state }));
      const authorizeUrl = new URL(paths.authorize, bladeOrigin);
      authorizeUrl.searchParams.set("client_id", options.clientId);
      authorizeUrl.searchParams.set("code_challenge", challenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");
      authorizeUrl.searchParams.set(
        "redirect_uri",
        callbackUrl(publicRequestUrl, adapterBasePath),
      );
      authorizeUrl.searchParams.set("state", state);

      const headers = new Headers({ location: authorizeUrl.toString() });
      headers.append(
        "set-cookie",
        serializeCookie(cookieNames.state, encodedState, {
          maxAge: 10 * 60,
          secure,
        }),
      );
      headers.append(
        "set-cookie",
        serializeCookie(cookieNames.verifier, verifier, {
          maxAge: 10 * 60,
          secure,
        }),
      );
      return new Response(null, { headers, status: 302 });
    }

    if (path === "callback" && request.method === "GET") {
      const cookies = parseCookies(request);
      const expectedState = parseAuthState(cookies.get(cookieNames.state));
      const verifier = cookies.get(cookieNames.verifier);
      const code = requestUrl.searchParams.get("code");
      const state = requestUrl.searchParams.get("state");
      if (
        !expectedState ||
        !verifier ||
        !code ||
        state !== expectedState.state
      ) {
        return jsonError(
          new HackerSdkError({
            code: "FORBIDDEN",
            message: "The sign-in callback could not be verified.",
            retryable: false,
          }),
          400,
        );
      }

      try {
        const tokenResponse = await requestFetch(
          new URL(paths.token, bladeOrigin),
          {
            body: JSON.stringify({
              clientId: options.clientId,
              code,
              codeVerifier: verifier,
              redirectUri: callbackUrl(publicRequestUrl, adapterBasePath),
            }),
            headers: { "content-type": "application/json" },
            method: "POST",
            redirect: "manual",
          },
        );
        const tokens = await readTokenResponse(tokenResponse);
        const headers = new Headers({
          location: new URL(
            expectedState.returnTo,
            publicRequestUrl.origin,
          ).toString(),
        });
        headers.append(
          "set-cookie",
          serializeCookie(cookieNames.state, "", { maxAge: 0, secure }),
        );
        headers.append(
          "set-cookie",
          serializeCookie(cookieNames.verifier, "", { maxAge: 0, secure }),
        );
        setSessionCookies(headers, tokens, secure, cookieNames);
        return new Response(null, { headers, status: 302 });
      } catch (cause) {
        return jsonError(parseHackerSdkError(cause), 401);
      }
    }

    if (path === "sign-out" && request.method === "POST") {
      if (!ensureSameOrigin(request, publicRequestUrl.origin)) {
        return jsonError(
          new HackerSdkError({
            code: "FORBIDDEN",
            message: "The sign-out request must come from this portal.",
            retryable: false,
          }),
          403,
        );
      }
      const cookies = parseCookies(request);
      let returnTo = "/";
      try {
        const body = await readReplayableBody(request, 2_048);
        if (body) {
          const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "returnTo" in parsed &&
            typeof parsed.returnTo === "string"
          ) {
            returnTo = normalizeHackerSdkReturnPath(parsed.returnTo);
          }
        }
      } catch {
        return jsonError(
          new HackerSdkError({
            code: "VALIDATION_ERROR",
            message: "The sign-out request is invalid.",
            retryable: false,
          }),
          400,
        );
      }
      const accessToken = cookies.get(cookieNames.access);
      const refreshToken = cookies.get(cookieNames.refresh);
      if (refreshToken || accessToken) {
        let revokeResponse: Response;
        try {
          revokeResponse = await requestFetch(
            new URL(paths.revoke, bladeOrigin),
            {
              body: JSON.stringify({
                clientId: options.clientId,
                ...(refreshToken ? { refreshToken } : {}),
              }),
              headers: {
                ...(accessToken
                  ? { authorization: `Bearer ${accessToken}` }
                  : {}),
                "content-type": "application/json",
                "x-forge-portal-client": options.clientId,
              },
              method: "POST",
              redirect: "manual",
            },
          );
        } catch (cause) {
          return jsonError(
            new HackerSdkError(
              {
                code: "NETWORK_ERROR",
                message: "Could not finish signing out. Please try again.",
                retryable: true,
              },
              cause instanceof Error ? { cause } : undefined,
            ),
            502,
          );
        }
        if (!revokeResponse.ok) {
          return jsonError(
            new HackerSdkError({
              code: "NETWORK_ERROR",
              message: "Could not finish signing out. Please try again.",
              requestId:
                revokeResponse.headers.get("x-request-id") ?? undefined,
              retryable: true,
            }),
            502,
          );
        }
      }
      const headers = new Headers(PRIVATE_HEADERS);
      clearSessionCookies(headers, secure, cookieNames);
      headers.set("content-type", "application/json; charset=utf-8");
      const logoutUrl = new URL(paths.logout, bladeOrigin);
      logoutUrl.searchParams.set("client_id", options.clientId);
      logoutUrl.searchParams.set(
        "return_to",
        new URL(returnTo, publicRequestUrl.origin).toString(),
      );
      return Response.json(
        { redirectTo: logoutUrl.toString() },
        { headers, status: 200 },
      );
    }

    const isTrpc = path.startsWith("trpc/");
    const isResume = path.startsWith("resume/");
    if (!isTrpc && !isResume) {
      return jsonError(
        new HackerSdkError({
          code: "FORBIDDEN",
          message: "Unknown Hacker SDK adapter operation.",
          retryable: false,
        }),
        404,
      );
    }

    if (
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      !ensureSameOrigin(request, publicRequestUrl.origin)
    ) {
      return jsonError(
        new HackerSdkError({
          code: "FORBIDDEN",
          message: "Mutation requests must come from this portal.",
          retryable: false,
        }),
        403,
      );
    }
    if (!expectedContentType(path, request)) {
      return jsonError(
        new HackerSdkError({
          code: "VALIDATION_ERROR",
          message: "Unsupported participant request content type.",
          retryable: false,
        }),
        415,
      );
    }

    let requestBody: ArrayBuffer | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        requestBody = await readReplayableBody(
          request,
          isResume ? MAX_RESUME_REQUEST_BYTES : MAX_TRPC_REQUEST_BYTES,
        );
      } catch {
        return jsonError(
          new HackerSdkError({
            code: "VALIDATION_ERROR",
            message: "The participant request is too large.",
            retryable: false,
          }),
          413,
        );
      }
    }

    const cookies = parseCookies(request);
    let accessToken = cookies.get(cookieNames.access);
    const refreshToken = cookies.get(cookieNames.refresh);
    const targetBase = new URL(isTrpc ? paths.trpc : paths.resume, bladeOrigin);
    const targetSuffix = path.slice(path.indexOf("/") + 1);
    targetBase.pathname = `${targetBase.pathname.replace(/\/$/, "")}/${targetSuffix}`;
    targetBase.search = requestUrl.search;

    const forward = (token: string | undefined) => {
      const headers = new Headers();
      for (const name of ["accept", "content-type", "x-trpc-source"]) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set("x-forge-portal-client", options.clientId);
      if (token) headers.set("authorization", `Bearer ${token}`);
      const init: RequestInit & { duplex?: "half" } = {
        body: requestBody,
        headers,
        method: request.method,
        redirect: "manual",
      };
      if (requestBody) init.duplex = "half";
      return requestFetch(targetBase, init);
    };

    let response = await forward(accessToken).catch((cause) =>
      jsonError(parseHackerSdkError(cause), 502),
    );
    const responseHeaders = new Headers();

    if ((await isExpiredSession(response)) && refreshToken) {
      try {
        const tokens = await refreshSession(refreshToken);
        accessToken = tokens.accessToken;
        setSessionCookies(responseHeaders, tokens, secure, cookieNames);
        response = await forward(accessToken);
      } catch (cause) {
        const error = parseHackerSdkError(cause);
        if (error.code === "REFRESH_RETRY") {
          return jsonError(error, 409, responseHeaders);
        }
        clearSessionCookies(responseHeaders, secure, cookieNames);
        return jsonError(error, 401, responseHeaders);
      }
    }

    if (await isExpiredSession(response)) {
      clearSessionCookies(responseHeaders, secure, cookieNames);
    }
    return copyProxyResponse(response, responseHeaders);
  };
}

export function createHackerSdkNextHandlers(options: HackerSdkNextOptions) {
  const handler = createHackerSdkNextHandler(options);
  return {
    DELETE: handler,
    GET: handler,
    POST: handler,
    PUT: handler,
  } as const;
}

export { getHackerSdkSignInPath, getHackerSdkSignOutPath };
