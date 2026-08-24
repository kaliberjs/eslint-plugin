import { insertOrder, writeAudit } from './diamondRepo'

export function createOrder(note) {
  insertOrder(note)
  writeAudit(note)
}
