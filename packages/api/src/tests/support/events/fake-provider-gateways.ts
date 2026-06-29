export type ProviderOperation = "create" | "delete" | "get" | "list" | "update";

export type ProviderResult =
  | { id: string; kind: "success"; request?: ProviderProjectionRequest }
  | { kind: "not_found" }
  | { kind: "transient_error"; message: string }
  | { acceptedId?: string; kind: "unknown"; message: string };

export interface ProviderProjectionRequest {
  channelId: string | null;
  creationKey: string;
  description: string;
  destination: string;
  endAt: Date;
  entityType: "external" | "stage" | "voice";
  eventId: string;
  location: string;
  points: number;
  privateProperties?: Record<string, string>;
  revision: number;
  startAt: Date;
  title: string;
}

export interface ProviderCall {
  id?: string;
  operation: ProviderOperation;
  request?: ProviderProjectionRequest;
}

export interface LiveProjection {
  id: string;
  request: ProviderProjectionRequest;
}

export interface DeferredProviderResult {
  promise: Promise<ProviderResult>;
  resolve: (result: ProviderResult) => void;
}

export function deferredProviderResult(): DeferredProviderResult {
  let resolvePromise: ((result: ProviderResult) => void) | undefined;
  const promise = new Promise<ProviderResult>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (result) => {
      if (!resolvePromise)
        throw new Error("Deferred provider result is unavailable.");
      resolvePromise(result);
    },
  };
}

function defaultResult(
  operation: ProviderOperation,
  sequence: number,
): ProviderResult {
  if (operation === "delete") return { id: "deleted", kind: "success" };
  return { id: `projection-${sequence}`, kind: "success" };
}

export class FakeEventProviderGateway {
  readonly calls: ProviderCall[] = [];
  readonly live = new Map<string, LiveProjection>();
  private readonly queued = new Map<
    ProviderOperation,
    (Promise<ProviderResult> | ProviderResult)[]
  >();
  private sequence = 0;

  enqueue(
    operation: ProviderOperation,
    ...results: (Promise<ProviderResult> | ProviderResult)[]
  ) {
    const queue = this.queued.get(operation) ?? [];
    queue.push(...results);
    this.queued.set(operation, queue);
  }

  seed(projection: LiveProjection) {
    this.live.set(projection.id, projection);
  }

  async create(request: ProviderProjectionRequest): Promise<ProviderResult> {
    this.calls.push({ operation: "create", request });
    const result = await this.next("create");
    if (result.kind === "success") {
      this.live.set(result.id, { id: result.id, request });
    } else if (result.kind === "unknown" && result.acceptedId) {
      this.live.set(result.acceptedId, { id: result.acceptedId, request });
    }
    return result;
  }

  async update(
    id: string,
    request: ProviderProjectionRequest,
  ): Promise<ProviderResult> {
    this.calls.push({ id, operation: "update", request });
    const queued = await this.next("update", { id, kind: "success" });
    if (queued.kind === "success") {
      if (!this.live.has(id)) return { kind: "not_found" };
      this.live.set(id, { id, request });
    }
    return queued;
  }

  async delete(id: string): Promise<ProviderResult> {
    this.calls.push({ id, operation: "delete" });
    const queued = await this.next("delete", { id, kind: "success" });
    if (queued.kind === "success" || queued.kind === "not_found") {
      this.live.delete(id);
    }
    return queued;
  }

  async get(
    id: string,
    _appliedDestination?: string | null,
  ): Promise<ProviderResult> {
    this.calls.push({ id, operation: "get" });
    const queued = await this.shiftQueued("get");
    if (queued) return queued;
    const live = this.live.get(id);
    return live
      ? { id, kind: "success", request: live.request }
      : { kind: "not_found" };
  }

  list(): Promise<LiveProjection[]> {
    this.calls.push({ operation: "list" });
    return Promise.resolve([...this.live.values()]);
  }

  findByPrivateIdentity(eventId: string, creationKey: string) {
    this.calls.push({ operation: "list" });
    return [...this.live.values()].filter(
      ({ request }) =>
        request.privateProperties?.bladeEventId === eventId &&
        request.privateProperties.bladeCreationKey === creationKey,
    );
  }

  resetCalls() {
    this.calls.length = 0;
  }

  private async shiftQueued(operation: ProviderOperation) {
    const queue = this.queued.get(operation);
    return queue?.shift();
  }

  private async next(
    operation: ProviderOperation,
    fallback?: ProviderResult,
  ): Promise<ProviderResult> {
    this.sequence += 1;
    return (
      (await this.shiftQueued(operation)) ??
      fallback ??
      defaultResult(operation, this.sequence)
    );
  }
}
