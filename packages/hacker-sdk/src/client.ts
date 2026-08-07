import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import { ZodError } from "zod";

import { resumeDtoSchema } from "@forge/validators";

import type {
  HackerParticipantInput,
  HackerParticipantOutput,
  HackerParticipantProcedure,
  HackerParticipantV1Contract,
  HackerResumeDto,
} from "./contracts";
import {
  HACKER_PARTICIPANT_V1_PROCEDURES,
  HACKER_PARTICIPANT_V1_SCHEMAS,
} from "./contracts";
import { HackerSdkError, parseHackerSdkError } from "./errors";
import {
  getHackerSdkSignInPath,
  getHackerSdkSignOutPath,
  normalizeHackerSdkBasePath,
} from "./paths";

type ParticipantMethod<TProcedure extends HackerParticipantProcedure> =
  HackerParticipantInput<TProcedure> extends undefined
    ? () => Promise<HackerParticipantOutput<TProcedure>>
    : (
        input: HackerParticipantInput<TProcedure>,
      ) => Promise<HackerParticipantOutput<TProcedure>>;

export type HackerParticipantClient = {
  readonly [TProcedure in HackerParticipantProcedure]: ParticipantMethod<TProcedure>;
} & {
  readonly adapterBasePath: string;
  readonly portalKey: string;
  readonly resumeDownloadPath: string;
  signInPath(returnTo?: string): string;
  signOut(returnTo?: string): Promise<{ redirectTo: string }>;
  uploadResume(
    file: Blob,
    options: { fileName: string; idempotencyKey: string },
  ): Promise<HackerResumeDto>;
};

export interface HackerParticipantClientConfig {
  adapterBasePath?: string;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  portalKey: string;
  trpcUrl?: string;
  validateInput?: <TProcedure extends HackerParticipantProcedure>(
    procedure: TProcedure,
    input: unknown,
  ) => HackerParticipantInput<TProcedure>;
  validateOutput?: <TProcedure extends HackerParticipantProcedure>(
    procedure: TProcedure,
    output: unknown,
  ) => HackerParticipantOutput<TProcedure>;
}

function defaultInputValidator<TProcedure extends HackerParticipantProcedure>(
  procedure: TProcedure,
  input: unknown,
) {
  return HACKER_PARTICIPANT_V1_SCHEMAS.input[procedure].parse(
    input,
  ) as HackerParticipantInput<TProcedure>;
}

function defaultOutputValidator<TProcedure extends HackerParticipantProcedure>(
  procedure: TProcedure,
  output: unknown,
) {
  return HACKER_PARTICIPANT_V1_SCHEMAS.output[procedure].parse(
    output,
  ) as HackerParticipantOutput<TProcedure>;
}

function contractValidationError(cause: unknown, boundary: "input" | "output") {
  const fieldIssues =
    cause instanceof ZodError
      ? cause.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: issue.path.filter(
            (part): part is number | string =>
              typeof part === "number" || typeof part === "string",
          ),
        }))
      : undefined;
  return new HackerSdkError(
    {
      code: boundary === "input" ? "VALIDATION_ERROR" : "BAD_RESPONSE",
      fieldIssues,
      message:
        boundary === "input"
          ? "The participant request is invalid."
          : "Blade returned an invalid participant response.",
      retryable: false,
    },
    { cause },
  );
}

async function readSdkJson<T>(
  response: Response,
  parse: (value: unknown) => T,
): Promise<T> {
  const requestId = response.headers.get("x-request-id") ?? undefined;
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw parseHackerSdkError(body, { requestId, status: response.status });
  }
  try {
    return parse(body);
  } catch (cause) {
    throw new HackerSdkError(
      {
        code: "BAD_RESPONSE",
        message: "Blade returned an invalid participant response.",
        requestId,
        retryable: false,
      },
      { cause },
    );
  }
}

export function createHackerParticipantClient(
  config: HackerParticipantClientConfig,
): HackerParticipantClient {
  const adapterBasePath = normalizeHackerSdkBasePath(
    config.adapterBasePath ?? "/api/hacker-sdk",
  );
  const requestFetch = config.fetch ?? globalThis.fetch;
  const rawClient = createTRPCUntypedClient({
    links: [
      httpBatchLink({
        fetch: requestFetch,
        headers: config.headers,
        transformer: {
          deserialize: (value: unknown) => value,
          serialize: (value: unknown) => value,
        },
        url: config.trpcUrl ?? `${adapterBasePath}/trpc`,
      }),
    ],
  });
  const validateInput = config.validateInput ?? defaultInputValidator;
  const validateOutput = config.validateOutput ?? defaultOutputValidator;

  const procedures = Object.fromEntries(
    Object.entries(HACKER_PARTICIPANT_V1_PROCEDURES).map(
      ([procedure, kind]) => [
        procedure,
        async (input?: unknown) => {
          const name = procedure as HackerParticipantProcedure;
          let parsedInput: HackerParticipantInput<typeof name>;
          try {
            parsedInput = validateInput(name, input);
          } catch (cause) {
            throw contractValidationError(cause, "input");
          }
          try {
            const output =
              kind === "query"
                ? await rawClient.query(procedure, parsedInput)
                : await rawClient.mutation(procedure, parsedInput);
            try {
              return validateOutput(name, output);
            } catch (cause) {
              throw contractValidationError(cause, "output");
            }
          } catch (cause) {
            throw parseHackerSdkError(cause);
          }
        },
      ],
    ),
  ) as Pick<HackerParticipantClient, keyof HackerParticipantV1Contract>;

  return Object.assign(procedures, {
    adapterBasePath,
    portalKey: config.portalKey,
    resumeDownloadPath: `${adapterBasePath}/resume/download`,
    signInPath(returnTo = "/") {
      return getHackerSdkSignInPath(returnTo, adapterBasePath);
    },
    async signOut(returnTo = "/") {
      const response = await requestFetch(
        getHackerSdkSignOutPath(adapterBasePath),
        {
          body: JSON.stringify({ returnTo }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => undefined);
        throw parseHackerSdkError(body, {
          requestId: response.headers.get("x-request-id") ?? undefined,
          status: response.status,
        });
      }
      const body: unknown = await response.json().catch(() => undefined);
      if (
        typeof body !== "object" ||
        body === null ||
        !("redirectTo" in body) ||
        typeof body.redirectTo !== "string"
      ) {
        throw new HackerSdkError({
          code: "BAD_RESPONSE",
          message: "Blade returned an invalid logout response.",
          retryable: false,
        });
      }
      return { redirectTo: body.redirectTo };
    },
    async uploadResume(
      file: Blob,
      options: { fileName: string; idempotencyKey: string },
    ) {
      if (file.size > 5_000_000) {
        throw new HackerSdkError({
          code: "INVALID_RESUME",
          fieldIssues: [{ code: "too_big", path: ["file"] }],
          message: "Resume must be no larger than 5 MB.",
          retryable: false,
        });
      }
      const body = new FormData();
      body.set("file", file, options.fileName);
      body.set("idempotencyKey", options.idempotencyKey);
      const response = await requestFetch(`${adapterBasePath}/resume/upload`, {
        body,
        method: "POST",
      });
      return readSdkJson<HackerResumeDto>(response, (value) =>
        resumeDtoSchema.parse(value),
      );
    },
  });
}
