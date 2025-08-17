// Thin wrapper to load the generated OpenAPI client (openapi-zod-client)
// without making it a hard compile-time dependency. If the file is not yet
// generated, this module resolves to null and callers should fall back.

let cachedClient: unknown | null = null;
let attempted = false;

type OpenApiGet = (path: string, init?: Record<string, unknown>) => Promise<{ data: unknown; error?: unknown }>;
type OpenApiClient = { GET: OpenApiGet };

export async function getOpenApiClient(): Promise<null | OpenApiClient> {
  if (attempted) return (cachedClient as OpenApiClient | null) ?? null;
  attempted = true;
  try {
    // Use Vite's glob to avoid hard-resolving a missing file at transform time
    const modules = import.meta.glob('../types/api.zod.ts');
    const keys = Object.keys(modules);
    if (keys.length === 0) return null;
    // Should be exactly one match
    const load = (modules as Record<string, () => Promise<unknown>>)[keys[0]];
    const mod = (await load()) as { default?: (opts: { baseUrl: string }) => unknown; createClient?: (opts: { baseUrl: string }) => unknown };
    const createClient = mod.default ?? mod.createClient;
    if (!createClient) return null;

    const baseUrl = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || '/api';
    const client = createClient({ baseUrl }) as unknown as OpenApiClient;
    cachedClient = client as unknown as OpenApiClient;
    return client;
  } catch {
    return null;
  }
}
