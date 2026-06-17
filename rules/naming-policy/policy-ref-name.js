const { messages } = require('./')

module.exports = {
  valid: [
    `const xRef = React.useRef();`,
    `const xRef = React.useXyzRef();`,
    `const xRef = useXyzRef();`,
    `const x = React.useXyzRefx();`,
    `const x = React.xuseXyzRef();`,
    `const useRefX = x();`,
    `const x = <div />;`,
  ],
  invalid: [
    {
      code: `const x = React.useRef()`,
      output: `const xRef = React.useRef()`,
      errors: [{ message: messages['ref should end with Ref']('x', 'xRef'), type: 'Identifier' }],
    },
    {
      code: `const x = useXyzRef()`,
      output: `const xRef = useXyzRef()`,
      errors: [{ message: messages['ref should end with Ref']('x', 'xRef'), type: 'Identifier' }],
    },
    {
      code: `const xRefx = useXyzRef()`,
      output: `const xRefxRef = useXyzRef()`,
      errors: [{ message: messages['ref should end with Ref']('xRefx', 'xRefxRef'), type: 'Identifier' }],
    },
    // Descriptive ref name
    {
      code: `const containerElement = React.useRef()`,
      output: `const containerElementRef = React.useRef()`,
      errors: [{ message: messages['ref should end with Ref']('containerElement', 'containerElementRef'), type: 'Identifier' }],
    },
    // References in same scope should also be renamed
    {
      code: `const x = React.useRef(); console.log(x)`,
      output: `const xRef = React.useRef(); console.log(xRef)`,
      errors: [{ message: messages['ref should end with Ref']('x', 'xRef'), type: 'Identifier' }],
    },
    {
      code: `const container = useRef(); container.current = 'test'; doSomething(container)`,
      output: `const containerRef = useRef(); containerRef.current = 'test'; doSomething(containerRef)`,
      errors: [{ message: messages['ref should end with Ref']('container', 'containerRef'), type: 'Identifier' }],
    },
  ]
}
