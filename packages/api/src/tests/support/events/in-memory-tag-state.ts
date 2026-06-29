export interface TestEventTagRecord {
  active: boolean;
  color: string;
  createdAt: Date;
  defaultPoints: number;
  id: string;
  name: string;
  normalizedName: string;
  updatedAt: Date;
}

export class InMemoryEventTagState {
  readonly tags = new Map<string, TestEventTagRecord>();
  private readonly locks = new Map<string, Promise<void>>();

  constructor(tags: readonly TestEventTagRecord[] = []) {
    for (const tag of tags) this.tags.set(tag.id, structuredClone(tag));
  }

  listTags() {
    return Promise.resolve(
      [...this.tags.values()].map((tag) => structuredClone(tag)),
    );
  }

  getTag(tagId: string) {
    const tag = this.tags.get(tagId);
    return Promise.resolve(tag ? structuredClone(tag) : null);
  }

  saveTag(tag: TestEventTagRecord) {
    this.tags.set(tag.id, structuredClone(tag));
    return Promise.resolve(structuredClone(tag));
  }

  async withTagLock<T>(tagId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(tagId) ?? Promise.resolve();
    let release: (() => void) | undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.locks.set(tagId, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release?.();
      if (this.locks.get(tagId) === queued) this.locks.delete(tagId);
    }
  }
}
