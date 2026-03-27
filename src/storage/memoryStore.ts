import type { FixedWindowState, Storage } from "../types.js";

export class MemoryStore implements Storage {
  private store: Map<string, FixedWindowState> = new Map();

  get(key: string) {
    return this.store.get(key) ?? null;
  }
  set(key: string, value: FixedWindowState) {
    this.store.set(key, value);
  }
  delete(key: string) {
    this.store.delete(key);
  }
}
