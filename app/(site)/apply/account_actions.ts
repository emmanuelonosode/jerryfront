'use server';

import { API_BASE } from '@/lib/env';

/**
 * Proxy for auth requests.
 * 
 * WHY A SERVER ACTION INSTEAD OF A CLIENT FETCH: 
 * If the Next.js frontend is running locally (http://localhost:3000) but pointing 
 * at the production Django backend, the browser will block direct client-side 
 * fetch requests due to CORS. 
 * By using a Server Action, Next.js executes the request from Node.js, which 
 * bypasses CORS and allows local development against production data.
 */
export async function proxyAuthPost(path: string, body: unknown) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    
    const payload = await response.json().catch(() => null);
    
    if (!response.ok) {
      return { ok: false, status: response.status, payload };
    }
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, status: 0, payload: null, error: String(error) };
  }
}
