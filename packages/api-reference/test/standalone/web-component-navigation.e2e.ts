import { join } from 'node:path'

import { expect, test } from '@playwright/test'

const bundle = join(import.meta.dirname, '../../dist/webComponent/component.js')

test('removing one web component preserves operations with the same IDs in another', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('https://component.example.test/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<scalar-api-reference id="first"></scalar-api-reference><scalar-api-reference id="second"></scalar-api-reference>',
    }),
  )
  await page.goto('https://component.example.test/')
  await page.evaluate(() => {
    window.history.scrollRestoration = 'auto'
    for (const id of ['first', 'second']) {
      Object.assign(document.getElementById(id)!, {
        configuration: {
          content: {
            openapi: '3.1.0',
            info: { title: `${id} API`, version: '1.0.0' },
            paths: { '/ping': { get: { summary: 'Ping operation', responses: { '200': { description: 'OK' } } } } },
          },
          showDeveloperTools: 'never',
        },
      })
    }
  })
  await page.addScriptTag({ path: bundle })
  const first = page.locator('scalar-api-reference#first')
  const second = page.locator('scalar-api-reference#second')
  await expect(first.getByRole('heading', { name: 'Ping operation', exact: true })).toHaveCount(1)
  await second.getByRole('heading', { name: 'second API', exact: true }).scrollIntoViewIfNeeded()
  await expect(second.getByRole('heading', { name: 'Ping operation', exact: true })).toHaveCount(1)
  await second.evaluate(async (el) => {
    el.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await expect(first.getByRole('heading', { name: 'Ping operation', exact: true })).toHaveCount(1)
  expect(await page.evaluate(() => window.history.scrollRestoration)).toBe('manual')
  await first.getByRole('heading', { name: 'Ping operation', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('surviving-embedded-reference.png') })
  const restored = await first.evaluate(async (el) => {
    el.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const mode = window.history.scrollRestoration
    document.body.append(el)
    return mode
  })
  expect(restored).toBe('auto')
  await expect(first.getByRole('heading', { name: 'first API', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.history.scrollRestoration)).toBe('manual')
  await first.evaluate(async (el) => {
    el.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(await page.evaluate(() => window.history.scrollRestoration)).toBe('auto')
  expect(errors).toEqual([])
})
