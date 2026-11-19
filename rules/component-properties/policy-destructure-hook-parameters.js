const { messages } = require('./')

module.exports = {
  valid: [
    'function useTest() {}',
    'function useTest({ option }) { return option }',
    'const useTest = ({ option }) => option',
    'function useTest(value) { return value }',
    'function useTest(options) { return useQuery(options) }',
    'function useTest(options) { useOther(options); return options.a }',
    'function useTest(signal$) { return signal$.get() }',
    'function useTest(ref) { return ref.current }',
    'function useTest(items) { return items.length }',
    'function useTest(values) { return values[key] }',
    'function useTest(options) { options.a = 1 }',
    'function useTest(options) { const [a] = options; return a }',
    'function user(options) { return options.a }',
    'function getTest(options) { return options.a }',
    'export default function (options) { return options.a }',
    'const { useTest } = hooks',
  ],
  invalid: [
    {
      code: 'function useTest(options) { return options.a }',
      errors: [{ message: messages['destructure hook parameter'] }],
    },
    {
      code: 'export function useTest(options) { return options.a + options.b }',
      errors: [{ message: messages['destructure hook parameter'] }],
    },
    {
      code: 'function useTest(options = {}) { const { a } = options; return a }',
      errors: [{ message: messages['destructure hook parameter'] }],
    },
    {
      code: 'function useTest(options) { return options?.a }',
      errors: [{ message: messages['destructure hook parameter'] }],
    },
    {
      code: 'const useTest = options => options.a',
      errors: [{ message: messages['destructure hook parameter'] }],
    },
    {
      code: 'const useTest = function (options) { return options.a }',
      errors: [{ message: messages['destructure hook parameter'] }],
    },
  ],
}
