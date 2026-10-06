declare module "*.mjs" {
  export function validateRows(
    rows: Record<string, string>[],
  ): Record<string, string>[];
}
