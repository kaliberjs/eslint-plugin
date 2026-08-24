import { helperB } from './cycleB'

export function helperA(x) {
  return helperB(x)
}
