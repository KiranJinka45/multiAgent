/**
 * Standardized API Fetch Wrapper.
 * Provides unified error handling and logging for all frontend API calls.
 */
export async function safeFetch<T>(
  url: string, 
  options?: RequestInit & { timeout?: number }
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options || {};

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(id);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      
      console.error(`[API ERROR] ${response.status} ${url}:`, errorData);
      throw new Error(errorData.message || `API Request failed with status ${response.status}`);
    }

    return await response.json() as T;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[API TIMEOUT] ${url} exceeded ${timeout}ms`);
      throw new Error('Request timed out. Please check your connection.');
    }
    throw error;
  }
}
