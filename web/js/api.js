import { API } from './config.js';
import { getToken } from './store.js';

async function post(path, body) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data && data.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Ocurrió un error.'));
  }
  return data;
}

export function login(creds) { return post('/auth/login', creds); }
export function register(data) { return post('/auth/register', data); }
export function googleLogin(idToken) { return post('/auth/google', { idToken }); }

export async function getWines() {
  const r = await fetch(API + '/wines');
  if (!r.ok) throw new Error('No se pudo cargar el catálogo.');
  return r.json();
}

async function authFetch(path, options) {
  const r = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken(), ...(options && options.headers) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data && data.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Ocurrió un error.'));
  }
  return data;
}

export function createReservation(payload) { return authFetch('/reservations', { method: 'POST', body: JSON.stringify(payload) }); }
export function payReservation(id, card) { return authFetch('/reservations/' + id + '/pay', { method: 'POST', body: JSON.stringify(card) }); }
export function myReservations() { return authFetch('/reservations/me', { method: 'GET' }); }
