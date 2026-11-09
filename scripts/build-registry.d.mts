// Types for build-registry.mjs (imported by apps/www/modules/goop-registry.ts).
export interface BuildRegistryOptions {
  /** Output root (default apps/www/public/r). */
  out?: string
  /** Where `out` is served, for registryDependencies (default https://goop.timmcmasters.work/r). */
  baseUrl?: string
  /** The @goopui/core dependency spec (default packages/core's version: exact while prerelease, else ^). */
  coreSpec?: string
}

export interface BuildRegistryResult {
  /** Problems an installed item couldn't resolve. Non-empty means the registry is broken. */
  errors: string[]
  /** Items written per framework. */
  summary: Record<string, number>
  /** Per framework, each component item's value exports: { react: { button: ['GoopButton', ...] } }. */
  catalog: Record<string, Record<string, string[]>>
  out: string
}

export function buildRegistry(options?: BuildRegistryOptions): BuildRegistryResult
