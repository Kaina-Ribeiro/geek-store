import { expect, it } from 'vitest'

import { safeReturn } from '../../src/lib/painel/paths'

it.each([
  [undefined, '/painel'],
  [null, '/painel'],
  ['', '/painel'],
  ['/painel', '/painel'],
  ['/painel/banner', '/painel/banner'],
  ['/painel/jogos/12?x=1', '/painel/jogos/12?x=1'],
  ['/loja', '/painel'],
  ['//evil.com', '/painel'],
  ['/\\evil.com', '/painel'],
  ['https://evil.com/painel', '/painel'],
  ['/painelx', '/painel'],
  ['/painel/../loja', '/painel'],
])('safeReturn(%s) = %s', (v, out) => expect(safeReturn(v)).toBe(out))
