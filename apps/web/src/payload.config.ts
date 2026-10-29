import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig, type EmailAdapter } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Copies } from './collections/Copies'
import { Customers } from './collections/Customers'
import { Drops } from './collections/Drops'
import { Games } from './collections/Games'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Subscribers } from './collections/Subscribers'
import { Users } from './collections/Users'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const DATABASE_URL = process.env.DATABASE_URL || ''
const FROM = process.env.EMAIL_FROM || 'pedidos@checkpointgeek.com.br'

// Database: Postgres everywhere (Docker in development, Neon in production).
// The schema only changes through the migrations in src/migrations, so dev
// runs exactly what production runs; they apply on `pnpm db:migrate` locally
// and automatically when the production server starts (prodMigrations).
const db = postgresAdapter({
  pool: { connectionString: DATABASE_URL },
  push: false,
  migrationDir: path.resolve(dirname, 'migrations'),
  prodMigrations: migrations,
})

// E-mail: Resend when RESEND_API_KEY is set; otherwise print to the server log
// (subject, recipient and every link), so flows are testable locally.
const logEmail: EmailAdapter = ({ payload }) => ({
  name: 'log',
  defaultFromAddress: FROM,
  defaultFromName: 'Checkpoint Geek',
  sendEmail: async (message) => {
    const html = typeof message.html === 'string' ? message.html : ''
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((l) => !l.includes('instagram'))
    payload.logger.info(`[e-mail] para ${String(message.to)} · ${message.subject}${links.length ? `\n  ${links.join('\n  ')}` : ''}`)
  },
})

const email = process.env.RESEND_API_KEY
  ? resendAdapter({ apiKey: process.env.RESEND_API_KEY, defaultFromAddress: FROM, defaultFromName: 'Checkpoint Geek' })
  : logEmail

// Uploads: local disk in development; Cloudflare R2 (S3 API) when configured.
const storage = process.env.S3_BUCKET
  ? [
      s3Storage({
        collections: { media: true },
        bucket: process.env.S3_BUCKET,
        config: {
          endpoint: process.env.S3_ENDPOINT,
          region: process.env.S3_REGION || 'auto',
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
          },
        },
      }),
    ]
  : []

// No serverURL on purpose: media URLs stay relative (/api/media/file/...),
// which next/image serves as local images. E-mails build absolute links from
// NEXT_PUBLIC_SITE_URL instead.
export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Checkpoint Geek' },
  },
  collections: [Orders, Games, Copies, Drops, Subscribers, Media, Customers, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db,
  email,
  plugins: storage,
  sharp,
  i18n: { supportedLanguages: { pt }, fallbackLanguage: 'pt' },
})
