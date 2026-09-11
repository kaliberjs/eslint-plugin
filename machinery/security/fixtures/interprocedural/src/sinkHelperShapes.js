/**
 * Callee shapes the adversarial corpus probes, all reaching the same sink.
 * Each export here is a different *spelling* of "an exported function that
 * queries the database with what it was given" — the point is which
 * spellings cross-file resolution can follow, not what they do.
 */

export default function queryUser(id) {
  return db.query('SELECT * FROM users WHERE id = ' + id)
}

export const repo = {
  queryUser(id) { return db.query('SELECT * FROM users WHERE id = ' + id) },
}

export class Repo {
  queryUser(id) { return db.query('SELECT * FROM users WHERE id = ' + id) }
}

export function queryUserRest(...args) {
  return db.query('SELECT * FROM users WHERE id = ' + args[0])
}
