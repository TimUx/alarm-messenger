const blacklist = new Map<string, number>(); // token → expiresAt (ms)

setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of blacklist.entries()) {
    if (now > expiresAt) {
      blacklist.delete(token);
    }
  }
}, 5 * 60 * 1000);

export function addToBlacklist(token: string, expiresAt: number): void {
  blacklist.set(token, expiresAt);
}

export function isBlacklisted(token: string): boolean {
  return blacklist.has(token);
}
