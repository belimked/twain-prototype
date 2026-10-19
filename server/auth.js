const enc = new TextEncoder()
// Cloudflare Workers caps PBKDF2 at 100k iterations.
const ITERATIONS = 100000
const TOKEN_TTL = 12 * 3600

const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ITERATIONS}$${b64u(salt)}$${b64u(await pbkdf2(password, salt, ITERATIONS))}`
}

export async function verifyPassword(password, stored) {
  const [alg, iter, salt, hash] = (stored || '').split('$')
  if (alg !== 'pbkdf2') return false
  return safeEqual(b64u(await pbkdf2(password, unb64u(salt), +iter)), hash)
}

const hmacKey = (secret) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

export async function signToken(payload, secret) {
  const body = b64u(enc.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL })))
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body))
  return `${body}.${b64u(sig)}`
}

export async function verifyToken(token, secret) {
  const [body, sig] = (token || '').split('.')
  if (!body || !sig) return null
  const expected = b64u(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)))
  if (!safeEqual(expected, sig)) return null
  const payload = JSON.parse(new TextDecoder().decode(unb64u(body)))
  return payload.exp > Date.now() / 1000 ? payload : null
}
