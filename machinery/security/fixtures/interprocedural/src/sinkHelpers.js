export function queryUser(id) {
  return db.query('SELECT * FROM users WHERE id = ' + id)
}

export function wrapsQueryUser(id) {
  return queryUser(id)
}
