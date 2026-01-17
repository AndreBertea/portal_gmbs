import crypto from 'crypto'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

/**
 * Hash un token pour stockage DB (SHA256)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Génère un token aléatoire + son hash
 */
export function generateToken(): { token: string; hash: string; prefix: string } {
  const token = crypto.randomBytes(32).toString('hex')
  return {
    token,
    hash: hashToken(token),
    prefix: token.substring(0, 8)
  }
}

/**
 * Hash un secret API (bcrypt)
 */
export async function hashApiSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS)
}

/**
 * Vérifie un secret API
 */
export async function verifyApiSecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash)
}

/**
 * Génère une paire clé/secret API
 */
export function generateApiCredentials(): { 
  keyId: string
  secret: string 
} {
  const keyId = `pk_live_${crypto.randomBytes(16).toString('hex')}`
  const secret = `sk_live_${crypto.randomBytes(32).toString('hex')}`
  return { keyId, secret }
}

/**
 * Hash du body pour signature HMAC (future use)
 */
export function hashBody(body: string | null): string {
  if (!body) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // SHA256('')
  return crypto.createHash('sha256').update(body).digest('hex')
}

/**
 * Calcule signature HMAC pour une requête (future use - V2)
 */
export function computeHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  bodyHash: string
): string {
  const payload = `${timestamp}.${method}.${path}.${bodyHash}`
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}
