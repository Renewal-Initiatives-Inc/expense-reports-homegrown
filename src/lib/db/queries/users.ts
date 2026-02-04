import { eq } from 'drizzle-orm'
import { db } from '..'
import { users, type User, type UserRole } from '../schema'

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
