// In-memory cache for API responses. Data lives for the browser session so
// navigating back to a page shows the previous result instantly while a fresh
// fetch runs silently in the background (stale-while-revalidate).

const store = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, value);
}
