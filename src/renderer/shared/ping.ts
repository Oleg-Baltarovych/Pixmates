// Startup health check through the typed preload API (plan M0-04): proves the window → main round trip.
export async function pingMain(): Promise<string> {
  const nonce = crypto.randomUUID();
  const result = await window.pixmates.ping(nonce);
  if (!result.ok) return `error: ${result.code}`;
  return result.data.nonce === nonce ? `ok v${result.data.version}` : 'error: nonce mismatch';
}
