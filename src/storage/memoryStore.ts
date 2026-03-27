import type { FixedWindowState } from "../types.js";

export class MemoryStore {
   private store: Map<string, FixedWindowState> = new Map();

   get(key: string) {
      return this.store.get(key);
   }
   set(key: string, value: FixedWindowState) {
      this.store.set(key, value);
   }
   delete(key: string) {
      this.store.delete(key);
   }
}
