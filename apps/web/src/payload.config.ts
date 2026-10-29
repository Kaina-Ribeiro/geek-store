import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Copies } from './collections/Copies'
import { Customers } from './collections/Customers'
import { Drops } from './collections/Drops'
import { Games } from './collections/Games'
import { Media } from './collections/Media'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Dev runs on SQLite (zero setup). Production switches to Postgres (Neon) by
// replacing this adapter with @payloadcms/db-postgres; the schema is the same.
// No serverURL on purpose: media URLs stay relative (/api/media/file/...),
// which next/image serves as local images. Set it when emails need absolute links.
export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Checkpoint Geek' },
  },
  collections: [Games, Copies, Drops, Media, Customers, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: sqliteAdapter({ client: { url: process.env.DATABASE_URL || '' } }),
  sharp,
  i18n: { supportedLanguages: { pt }, fallbackLanguage: 'pt' },
})
