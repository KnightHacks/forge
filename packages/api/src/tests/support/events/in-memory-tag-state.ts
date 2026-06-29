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

  async listTags() {
    return [...this.tags.values()].map((tag) => structuredClone(tag));
  }

  async getTag(tagId: string) {
    const tag = this.tags.get(tagId);
    return tag ? structuredClone(tag) : null;
  }

  async saveTag(tag: TestEventTagRecord) {
    this.tags.set(tag.id, structuredClone(tag));
    return structuredClone(tag);
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
