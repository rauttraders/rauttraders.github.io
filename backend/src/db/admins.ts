import type { AdminRow } from '../env'

export const countAdmins = async (db: D1Database): Promise<number> => (await db.prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>())?.n ?? 0

export const findAdminByUsername = (db: D1Database, username: string) =>
  db.prepare('SELECT * FROM admins WHERE username = ?1').bind(username).first<AdminRow>()

export const createAdmin = (db: D1Database, username: string, passwordHash: string, mustChange: boolean) =>
  db.prepare('INSERT INTO admins (username, password_hash, must_change) VALUES (?1, ?2, ?3) RETURNING *').bind(username, passwordHash, mustChange ? 1 : 0).first<AdminRow>()

export const updateAdminProfile = (db: D1Database, id: number, p: { name: string; email: string; photo: string }) =>
  db.prepare('UPDATE admins SET name = ?2, email = ?3, photo = ?4 WHERE id = ?1 RETURNING *').bind(id, p.name, p.email, p.photo).first<AdminRow>()

export const updateAdminCredentials = (db: D1Database, id: number, username: string, passwordHash: string | null) =>
  passwordHash
    ? db.prepare('UPDATE admins SET username = ?2, password_hash = ?3, must_change = 0 WHERE id = ?1 RETURNING *').bind(id, username, passwordHash).first<AdminRow>()
    : db.prepare('UPDATE admins SET username = ?2 WHERE id = ?1 RETURNING *').bind(id, username).first<AdminRow>()

export const setPasswordHash = (db: D1Database, id: number, passwordHash: string) =>
  db.prepare('UPDATE admins SET password_hash = ?2 WHERE id = ?1').bind(id, passwordHash).run()
