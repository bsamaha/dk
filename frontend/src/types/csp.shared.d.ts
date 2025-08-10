declare module './csp.shared.js' {
  export const CSP_DIRECTIVES: Record<string, string[]>;
  export function buildCSPHeader(directives: Record<string, string[]>): string;
  export function getDevCSPHeader(): string;
  export function getProdCSPHeader(): string;
}

declare module '../../csp.shared.js' {
  export const CSP_DIRECTIVES: Record<string, string[]>;
  export function buildCSPHeader(directives: Record<string, string[]>): string;
  export function getDevCSPHeader(): string;
  export function getProdCSPHeader(): string;
}


