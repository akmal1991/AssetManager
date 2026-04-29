export function routeParamAsString(value: unknown): string {
  if (Array.isArray(value)) {
    return value[0] == null ? "" : String(value[0]);
  }
  return value == null ? "" : String(value);
}

export function parseRouteId(value: unknown): number {
  const parsed = Number.parseInt(routeParamAsString(value), 10);
  return Number.isInteger(parsed) ? parsed : NaN;
}
