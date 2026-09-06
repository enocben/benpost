export function getToken(payload: string): string {
  return  payload.startsWith("Bearer ")
      ? payload.slice(7)
      : payload;
}
