const { messages } = require('./')
const { test, merge } = require('../../machinery/test')

test('no-nested-component', merge(
  // ─── Default deny list (Container*, Heading*) ─────────────────────────────
  {
    valid: [
      // Native elements can nest freely
      `<div><section><p /></section></div>`,

      // Container with non-Container children
      `<ContainerLg><Button /></ContainerLg>`,
      `<ContainerLg><HeadingXl h={1} title="Hello" /></ContainerLg>`,
      `<div><ContainerLg><div /></ContainerLg></div>`,

      // Heading with non-Heading children
      `<HeadingXl h={1} title="Hello"><span>sub</span></HeadingXl>`,
      `<div><HeadingXl h={1} title="Hello" /></div>`,

      // Unrelated components nest freely
      `<Foo><Bar /></Foo>`,
      `<Modal><Button /></Modal>`,
      `<Layout><Sidebar><Menu /></Sidebar></Layout>`,

      // Lowercase elements never flagged
      `<container><container /></container>`,
      `<heading><heading /></heading>`,

      // Components starting with different prefix
      `<ContentBlock><ContentSection /></ContentBlock>`,

      // Fragment wrappers
      `<ContainerLg><>{children}</></ContainerLg>`,
    ],
    invalid: [
      // Container* nesting — direct child
      {
        code: `<ContainerLg><ContainerSm><div /></ContainerSm></ContainerLg>`,
        errors: [{ message: messages['nested component']('ContainerSm', 'ContainerLg') }],
      },
      // Container* nesting — with intermediate native elements
      {
        code: `<ContainerXxl><div><ContainerLg><div /></ContainerLg></div></ContainerXxl>`,
        errors: [{ message: messages['nested component']('ContainerLg', 'ContainerXxl') }],
      },
      // Container* nesting — same variant
      {
        code: `<ContainerLg><ContainerLg><div /></ContainerLg></ContainerLg>`,
        errors: [{ message: messages['nested component']('ContainerLg', 'ContainerLg') }],
      },
      // Container* nesting — deeply nested
      {
        code: `<ContainerLg><div><section><article><ContainerSm><p /></ContainerSm></article></section></div></ContainerLg>`,
        errors: [{ message: messages['nested component']('ContainerSm', 'ContainerLg') }],
      },
      // Container* nesting — FlexibleLg variant
      {
        code: `<ContainerFlexibleLg><ContainerMd><div /></ContainerMd></ContainerFlexibleLg>`,
        errors: [{ message: messages['nested component']('ContainerMd', 'ContainerFlexibleLg') }],
      },
      // Heading* nesting
      {
        code: `<HeadingXl h={1} title="A"><HeadingMd h={2} title="B" /></HeadingXl>`,
        errors: [{ message: messages['nested component']('HeadingMd', 'HeadingXl') }],
      },
      // Heading* nesting — same variant
      {
        code: `<HeadingLg h={1} title="A"><HeadingLg h={2} title="B" /></HeadingLg>`,
        errors: [{ message: messages['nested component']('HeadingLg', 'HeadingLg') }],
      },
      // Heading* nesting — with intermediate elements
      {
        code: `<HeadingXxl h={1} title="A"><div><HeadingSm h={3} title="C" /></div></HeadingXxl>`,
        errors: [{ message: messages['nested component']('HeadingSm', 'HeadingXxl') }],
      },
      // ContainerSm inside ContainerLg with content
      {
        code: `<ContainerLg><ContainerSm><p>content</p></ContainerSm></ContainerLg>`,
        errors: [{ message: messages['nested component']('ContainerSm', 'ContainerLg') }],
      },
    ],
  },

  // ─── Custom deny list ─────────────────────────────────────────────────────
  {
    valid: [
      // Default deny list is replaced — Container nesting is now allowed
      {
        code: `<ContainerLg><ContainerSm><div /></ContainerSm></ContainerLg>`,
        options: [{ deny: [{ parent: 'Modal', child: 'Modal' }] }],
      },
      // Custom deny: Modal-Modal — different children are fine
      {
        code: `<Modal><Button /></Modal>`,
        options: [{ deny: [{ parent: 'Modal', child: 'Modal' }] }],
      },
      // Custom deny: wildcard parent, specific child — non-matching child
      {
        code: `<Dropdown><Button /></Dropdown>`,
        options: [{ deny: [{ parent: 'Dropdown*', child: 'Dropdown*' }] }],
      },
    ],
    invalid: [
      // Custom deny: exact match
      {
        code: `<Modal><Modal /></Modal>`,
        options: [{ deny: [{ parent: 'Modal', child: 'Modal' }] }],
        errors: [{ message: messages['nested component']('Modal', 'Modal') }],
      },
      // Custom deny: wildcard patterns
      {
        code: `<DropdownMenu><DropdownSubmenu /></DropdownMenu>`,
        options: [{ deny: [{ parent: 'Dropdown*', child: 'Dropdown*' }] }],
        errors: [{ message: messages['nested component']('DropdownSubmenu', 'DropdownMenu') }],
      },
      // Custom deny: multiple rules
      {
        code: `<Modal><Modal /></Modal>`,
        options: [{ deny: [
          { parent: 'Modal', child: 'Modal' },
          { parent: 'Dialog', child: 'Dialog' },
        ] }],
        errors: [{ message: messages['nested component']('Modal', 'Modal') }],
      },
      // Custom deny: parent wildcard, child exact
      {
        code: `<AccordionItem><AccordionItem /></AccordionItem>`,
        options: [{ deny: [{ parent: 'Accordion*', child: 'AccordionItem' }] }],
        errors: [{ message: messages['nested component']('AccordionItem', 'AccordionItem') }],
      },
      // Custom deny: with intermediate elements
      {
        code: `<Modal><div><p><Modal /></p></div></Modal>`,
        options: [{ deny: [{ parent: 'Modal', child: 'Modal' }] }],
        errors: [{ message: messages['nested component']('Modal', 'Modal') }],
      },
    ],
  },
))
