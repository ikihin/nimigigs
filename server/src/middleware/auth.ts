import type { Context, Next } from 'hono'
import { userFromToken } from '../services/users.js'
import type { User } from '../types.js'

export type AppEnv = {
  Variables: {
    user: User
  }
}

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const user = await userFromToken(token)
  if (!user) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } }, 401)
  c.set('user', user)
  await next()
}

export async function optionalAuth(c: Context<AppEnv>): Promise<User | null> {
  const header = c.req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  return userFromToken(token)
}
