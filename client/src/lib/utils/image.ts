/**
 * Normalizes image paths to ensure they start with /
 * This is defensive programming in case backend doesn't normalize paths
 */
export function normalizeImagePath(path: string | undefined | null): string {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Normalizes an array of image paths
 */
export function normalizeImagePaths(paths: string[] | undefined | null): string[] {
  if (!paths || !Array.isArray(paths)) return [];
  return paths.map(normalizeImagePath);
}
