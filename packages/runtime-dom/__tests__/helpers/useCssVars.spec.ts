import {
  ref,
  render,
  useCssVars,
  createStaticVNode,
  h,
  reactive,
  nextTick,
  ComponentOptions,
  Suspense,
  Teleport,
  FunctionalComponent,
  defineCustomElement
} from '@vue/runtime-dom'

describe('useCssVars', () => {
  async function assertCssVars(getApp: (state: any) => ComponentOptions) {
    const state = reactive({ color: 'red' })
    const App = getApp(state)
    const root = document.createElement('div')

    render(h(App), root)
    await nextTick()
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe(`red`)
    }

    state.color = 'green'
    await nextTick()
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('green')
    }
  }

  test('basic', async () => {
    await assertCssVars(state => ({
      setup() {
        // test receiving render context
        useCssVars((ctx: any) => ({
          color: ctx.color
        }))
        return state
      },
      render() {
        return h('div')
      }
    }))
  })

  test('on fragment root', async () => {
    await assertCssVars(state => ({
      setup() {
        useCssVars(() => state)
        return () => [h('div'), h('div')]
      }
    }))
  })

  test('on HOCs', async () => {
    const Child = () => [h('div'), h('div')]

    await assertCssVars(state => ({
      setup() {
        useCssVars(() => state)
        return () => h(Child)
      }
    }))
  })

  test('on suspense root', async () => {
    const state = reactive({ color: 'red' })
    const root = document.createElement('div')

    let resolveAsync: any
    let asyncPromise: any

    const AsyncComp = {
      setup() {
        asyncPromise = new Promise(r => {
          resolveAsync = () => {
            r(() => h('p', 'default'))
          }
        })
        return asyncPromise
      }
    }

    const App = {
      setup() {
        useCssVars(() => state)
        return () =>
          h(Suspense, null, {
            default: h(AsyncComp),
            fallback: h('div', 'fallback')
          })
      }
    }

    render(h(App), root)
    await nextTick()
    // css vars use with fallback tree
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe(`red`)
    }
    // AsyncComp resolve
    resolveAsync()
    await asyncPromise.then(() => {})
    // Suspense effects flush
    await nextTick()
    // css vars use with default tree
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe(`red`)
    }

    state.color = 'green'
    await nextTick()
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('green')
    }
  })

  test('with subTree changed', async () => {
    const state = reactive({ color: 'red' })
    const value = ref(true)
    const root = document.createElement('div')

    const App = {
      setup() {
        useCssVars(() => state)
        return () => (value.value ? [h('div')] : [h('div'), h('div')])
      }
    }

    render(h(App), root)
    await nextTick()
    // css vars use with fallback tree
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe(`red`)
    }

    value.value = false
    await nextTick()
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('red')
    }
  })

  // #3894
  test('with subTree change inside HOC', async () => {
    const state = reactive({ color: 'red' })
    const value = ref(true)
    const root = document.createElement('div')

    const Child: FunctionalComponent = (_, { slots }) => slots.default!()

    const App = {
      setup() {
        useCssVars(() => state)
        return () =>
          h(Child, null, () =>
            value.value ? [h('div')] : [h('div'), h('div')]
          )
      }
    }

    render(h(App), root)
    await nextTick()
    // css vars use with fallback tree
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe(`red`)
    }

    value.value = false
    await nextTick()
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('red')
    }
  })

  test('with createStaticVNode', async () => {
    const state = reactive({ color: 'red' })
    const root = document.createElement('div')

    const App = {
      setup() {
        useCssVars(() => state)
        return () => [
          h('div'),
          createStaticVNode('<div>1</div><div><span>2</span></div>', 2),
          h('div')
        ]
      }
    }

    render(h(App), root)
    await nextTick()
    for (const c of [].slice.call(root.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('red')
    }
  })

  test('with teleport', async () => {
    document.body.innerHTML = ''
    const state = reactive({ color: 'red' })
    const root = document.createElement('div')
    const target = document.body

    const App = {
      setup() {
        useCssVars(() => state)
        return () => [h(Teleport, { to: target }, [h('div')])]
      }
    }

    render(h(App), root)
    await nextTick()
    for (const c of [].slice.call(target.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('red')
    }
  })

  test('with teleport in child slot', async () => {
    document.body.innerHTML = ''
    const state = reactive({ color: 'red' })
    const root = document.createElement('div')
    const target = document.body

    const Child: FunctionalComponent = (_, { slots }) => {
      return h('div', slots.default && slots.default())
    }

    const App = {
      setup() {
        useCssVars(() => state)
        return () => h(Child, () => [h(Teleport, { to: target }, [h('div')])])
      }
    }

    render(h(App), root)
    await nextTick()
    for (const c of [].slice.call(target.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('red')
    }
  })

  test('with teleport(change subTree)', async () => {
    document.body.innerHTML = ''
    const state = reactive({ color: 'red' })
    const root = document.createElement('div')
    const target = document.body
    const toggle = ref(false)

    const App = {
      setup() {
        useCssVars(() => state)
        return () => [
          h(Teleport, { to: target }, [
            h('div'),
            toggle.value ? h('div') : null
          ])
        ]
      }
    }

    render(h(App), root)
    await nextTick()
    expect(target.children.length).toBe(1)
    for (const c of [].slice.call(target.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('red')
    }

    toggle.value = true
    await nextTick()
    expect(target.children.length).toBe(2)
    for (const c of [].slice.call(target.children as any)) {
      expect((c as HTMLElement).style.getPropertyValue(`--color`)).toBe('red')
    }
  })

  test('with teleport(disabled)', async () => {
    document.body.innerHTML = ''
    const state = reactive({ color: 'red' })
    const root = document.createElement('div')
    const target = document.body

    const App = {
      setup() {
        useCssVars(() => state)
        return () => [h(Teleport, { to: target, disabled: true }, [h('div')])]
      }
    }

    expect(() => render(h(App), root)).not.toThrow(TypeError)
    await nextTick()
    expect(target.children.length).toBe(0)
  })

  // #8826
  test('with custom element', async () => {
    const state = reactive({ color: 'red' })
    const container = document.createElement('div')
    const App = defineCustomElement({
      styles: [`div { color: red; }`],
      setup() {
        useCssVars(() => state)
        return () => {
          return h('div', 'hello')
        }
      }
    })
    customElements.define('css-vars-ce', App)
    container.innerHTML = `<css-vars-ce></css-vars-ce>`
    document.body.appendChild(container)
    await nextTick()
    expect(container.innerHTML).toBe(
      `<css-vars-ce style="--color: red;"></css-vars-ce>`
    )
  })
})
