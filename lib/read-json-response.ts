// API requests may receive an empty body or an HTML error from the runtime.
// Keep those failures actionable instead of leaking JSON parser exceptions.
export async function readJsonResponse(response: Response) {
  const text = await response.text();
  let data;
  try {
    if (!text.trim()) throw new Error('Empty response');
    data = JSON.parse(text);
  } catch {
    throw new Error(response.status === 401
      ? 'Your session expired. Sign in again.'
      : `The server returned ${text.trim() ? 'an invalid' : 'an empty'} response (HTTP ${response.status}). Please retry. If this continues, check the server logs.`);
  }
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Your session expired. Sign in again.'
      : typeof data?.error === 'string' ? data.error : `Request failed (HTTP ${response.status}). Please retry.`);
  }
  return data;
}
