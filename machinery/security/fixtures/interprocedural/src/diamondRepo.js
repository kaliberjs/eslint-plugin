export function record(table, note) {
  return db.query("INSERT INTO " + table + " VALUES('" + note + "')")
}

export function insertOrder(note) {
  return record('orders', note)
}

export function writeAudit(note) {
  return record('audit', note)
}
