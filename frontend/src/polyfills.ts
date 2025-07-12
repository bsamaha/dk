// Polyfills for browsers/environments that lack certain modern APIs
// 1. crypto.randomUUID() – Safari < 15.4 or legacy Chromium inside some WebViews
//    Source: https://stackoverflow.com/a/2117523/102704
(() => {
  // Ensure globalThis.crypto exists (older browsers may expose it on window only)
  const cryptoObj: Crypto | undefined = (globalThis as any).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID !== 'function') {
    (cryptoObj as any).randomUUID = () => {
      const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
      // Per RFC-4122 v4 generate UUID from random bytes
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
      const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
      return (
        hex.slice(0, 8) +
        '-' +
        hex.slice(8, 12) +
        '-' +
        hex.slice(12, 16) +
        '-' +
        hex.slice(16, 20) +
        '-' +
        hex.slice(20)
      );
    };
  }
})();
