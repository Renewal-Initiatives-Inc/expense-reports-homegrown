import { eq, sql } from 'drizzle-orm'
import { db } from '..'
import { userEmails, users, type User, type UserRole } from '../schema'

/**
 * Upsert a user - create or update on login
 */
export async function upsertUser(data: {
  id: string
  email: string
  name: string
  role: UserRole
}): Promise<User> {
  const result = await db
    .insert(users)
    .values({
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      lastLoginAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: data.email,
        name: data.name,
        role: data.role,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning()

  return result[0]
}

/**
 * Get all admin user IDs
 */
export async function getAdminUserIds(): Promise<string[]> {
  const result = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'))

  return result.map((row) => row.id)
}

/**
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)

  return result[0]
}

/**
 * Look up a user by any of their email addresses (primary or secondary).
 * Checks users.email first, then userEmails.email (stored lowercase per ECP4).
 */
export async function getUserByAnyEmail(email: string): Promise<User | undefined> {
  const normalized = email.toLowerCase()

  // Check primary email
  const primary = await db
    .select()
    .from(users)
    .where(eq(sql`LOWER(${users.email})`, normalized))
    .limit(1)

  if (primary.length > 0) {
    return primary[0]
  }

  // Check secondary emails
  const secondary = await db
    .select({ user: users })
    .from(userEmails)
    .innerJoin(users, eq(userEmails.userId, users.id))
    .where(eq(userEmails.email, normalized))
    .limit(1)

  return secondary[0]?.user
}
