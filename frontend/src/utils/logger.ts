export function devLog(...messages: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(...messages);
  }
}

export function devError(...messages: unknown[]): void {
  if (import.meta.env.DEV) {
    console.error(...messages);
  }
}
