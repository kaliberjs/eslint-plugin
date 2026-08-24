import { queryUser } from './sinkHelpers'

export function handleUserQuery(id) {
  return queryUser(id)
}
