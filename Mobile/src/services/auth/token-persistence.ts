interface SecureStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}
/** Serialize native writes. A stale login can never delete a newer account's token. */
export class TokenPersistence {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: SecureStorage) {}
  read() {
    return this.queue.then(() => this.storage.get());
  }
  write(
    value: string | null,
    current: () => boolean = () => true,
  ): Promise<void> {
    const next = this.queue
      .catch(() => {})
      .then(async () => {
        if (!current()) return;
        if (value === null) await this.storage.remove();
        else await this.storage.set(value);
      });
    this.queue = next;
    return next;
  }
}
