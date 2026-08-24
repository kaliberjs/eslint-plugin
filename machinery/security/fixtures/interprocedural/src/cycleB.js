import { helperA } from './cycleA'

export function helperB(x) {
  return helperA(x)
}
