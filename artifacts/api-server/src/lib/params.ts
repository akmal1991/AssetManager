export function routeParamAsString(value: unknown): string {
  if (Array.isArray(value)) {
    return value[0] == null ? "" : String(value[0]);
  }
  return value == null ? "" : String(value);
}

export function parseRouteId(value: unknown): number {
  const raw = routeParamAsString(value).trim();
  if (!/^[1-9]\d*$/.test(raw)) {
    return -1;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) ? parsed : -1;
}
