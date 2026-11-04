import { isInternalPath } from './hero'

// Where to go after signing in to the panel: only back inside /painel, never
// to another page of the site or another host (open-redirect safe).
export function safeReturn(volta: string | null | undefined): string {
  if (!isInternalPath(volta)) return '/painel'
  if (volta !== '/painel' && !/^\/painel[/?#]/.test(volta)) return '/painel'
  if (volta.split(/[?#]/)[0].split('/').some((seg) => seg === '..' || seg === '.')) return '/painel'
  return volta
}
