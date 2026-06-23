const { messages } = require('./')
const { test } = require('../../machinery/test')

test('no-nested-component', {
  valid: [
    `<div><ContainerLg><div /></ContainerLg></div>`,
    `<ContainerLg><Button /></ContainerLg>`,
    `<div><HeadingXl h={1} title="Hello" /></div>`,
    `<ContainerLg><HeadingXl h={1} title="Hello" /></ContainerLg>`,
    `<Foo><Bar /></Foo>`,
  ],
  invalid: [
    {
      code: `<ContainerLg><ContainerSm><div /></ContainerSm></ContainerLg>`,
      errors: [{ message: messages['nested component']('ContainerSm', 'ContainerLg') }],
    },
    {
      code: `<ContainerXxl><div><ContainerLg><div /></ContainerLg></div></ContainerXxl>`,
      errors: [{ message: messages['nested component']('ContainerLg', 'ContainerXxl') }],
    },
    {
      code: `<ContainerLg><ContainerSm><p>content</p></ContainerSm></ContainerLg>`,
      errors: [{ message: messages['nested component']('ContainerSm', 'ContainerLg') }],
    },
    {
      code: `<HeadingXl h={1} title="A"><HeadingMd h={2} title="B" /></HeadingXl>`,
      errors: [{ message: messages['nested component']('HeadingMd', 'HeadingXl') }],
    },
    {
      code: `<Modal><Modal /></Modal>`,
      options: [{ deny: [{ parent: 'Modal', child: 'Modal' }] }],
      errors: [{ message: messages['nested component']('Modal', 'Modal') }],
    },
  ],
})
