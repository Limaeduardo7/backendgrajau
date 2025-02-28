import { clerkClient } from '@clerk/clerk-sdk-node'

export const clerk = clerkClient

export const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || ''

export const PUBLIC_KEY = process.env.CLERK_PUBLIC_KEY || ''

export const SECRET_KEY = process.env.CLERK_SECRET_KEY || ''

if (!WEBHOOK_SECRET) {
  throw new Error('Missing CLERK_WEBHOOK_SECRET')
}

if (!PUBLIC_KEY) {
  throw new Error('Missing CLERK_PUBLIC_KEY')
}

if (!SECRET_KEY) {
  throw new Error('Missing CLERK_SECRET_KEY')
} 