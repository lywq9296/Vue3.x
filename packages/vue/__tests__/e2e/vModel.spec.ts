import path from 'node:path'
import { setupPuppeteer } from './e2eUtils'

const { page, click, isChecked, html } = setupPuppeteer()
import { nextTick } from 'vue'

beforeEach(async () => {
  await page().addScriptTag({
    path: path.resolve(__dirname, '../../dist/vue.global.js'),
  })
  await page().setContent(`<div id="app"></div>`)
})

// #12144
test('checkbox click with v-model boolean value', async () => {
  await page().evaluate(() => {
    const { createApp } = (window as any).Vue
    createApp({
      template: `
      <label>
        <input 
          id="first"
          type="checkbox"
          v-model="first"/>
        First
      </label>
      <br>  
      <label>
        <input
          id="second"
          type="checkbox"
          v-model="second"      
          @click="secondClick"/>    
          Second
      </label> 
        `,
      data() {
        return {
          first: true,
          second: false,
        }
      },
      methods: {
        secondClick(this: any) {
          this.first = false
        },
      },
    }).mount('#app')
  })

  expect(await isChecked('#first')).toBe(true)
  expect(await isChecked('#second')).toBe(false)
  await click('#second')
  await nextTick()
  expect(await isChecked('#first')).toBe(false)
  expect(await isChecked('#second')).toBe(true)
})

// #8638
test('checkbox click with v-model array value', async () => {
  await page().evaluate(() => {
    const { createApp, ref } = (window as any).Vue
    createApp({
      template: `
      {{cls}}
      <input
        id="checkEl"
        type="checkbox"
        @click="change"
        v-model="inputModel"
        value="a"
      >
        `,
      setup() {
        const inputModel = ref([])
        const count = ref(0)
        const change = () => {
          count.value++
        }
        return {
          inputModel,
          change,
          cls: count,
        }
      },
    }).mount('#app')
  })

  expect(await isChecked('#checkEl')).toBe(false)
  expect(await html('#app')).toMatchInlineSnapshot(
    `"0 <input id="checkEl" type="checkbox" value="a">"`,
  )

  await click('#checkEl')
  await nextTick()
  expect(await isChecked('#checkEl')).toBe(true)
  expect(await html('#app')).toMatchInlineSnapshot(
    `"1 <input id="checkEl" type="checkbox" value="a">"`,
  )

  await click('#checkEl')
  await nextTick()
  expect(await isChecked('#checkEl')).toBe(false)
  expect(await html('#app')).toMatchInlineSnapshot(
    `"2 <input id="checkEl" type="checkbox" value="a">"`,
  )
})
