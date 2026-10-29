/**
 * Dev seed: real games from the prototype, with covers, condition variants,
 * laudos, a Friday drop and the owner account.
 *
 *   pnpm seed            (from the repo root)
 *
 * Wipes games, copies, drops and media before inserting. Never run against
 * production data.
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

import config from '../payload.config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_FILE = path.resolve(dirname, '../../.env')

type Cond = 'lacrado' | 'a' | 'b' | 'disco'
type G = {
  cover: string
  title: string
  platform: string
  year: number
  age: string
  glow: string
  featured?: boolean
  description: string
  copies: [Cond, number, number][] // condition, price, stock
}

// Listed newest-first: the first entries show up first in "Acabou de chegar".
const GAMES: G[] = [
  { cover: '01', title: 'Elden Ring', platform: 'ps5', year: 2022, age: '16 anos', glow: '#8C6A2B', featured: true, description: 'Mundo aberto da FromSoftware com George R. R. Martin. Mídia física lacrada, versão brasileira com legendas em português.', copies: [['lacrado', 229.9, 3], ['a', 189.9, 1]] },
  { cover: '02', title: 'Zelda: Tears of the Kingdom', platform: 'switch', year: 2023, age: '10 anos', glow: '#1C8F80', featured: true, description: 'A continuação de Breath of the Wild. Roda no Switch e no Switch 2.', copies: [['lacrado', 329.9, 2]] },
  { cover: '03', title: 'Yakuza 0', platform: 'ps4', year: 2017, age: '18 anos', glow: '#C2185B', description: 'O começo da saga de Kiryu e Majima na Tóquio de 1988. Roda no PS5.', copies: [['a', 119.9, 1]] },
  { cover: '04', title: 'Shadow of the Colossus', platform: 'ps2', year: 2005, age: '12 anos', glow: '#7C8C8F', featured: true, description: 'Versão americana original de 2005, completa com caixa e manual. Testado do boot até o terceiro colosso no PS2 Slim.', copies: [['a', 189.9, 1], ['b', 156.9, 1], ['disco', 118.9, 1]] },
  { cover: '05', title: "Marvel's Spider-Man 2", platform: 'ps5', year: 2023, age: '12 anos', glow: '#C1121F', featured: true, description: 'Peter e Miles em Nova York. Seminovo nota A com caixa e código já usado.', copies: [['a', 199.9, 2], ['lacrado', 279.9, 2]] },
  { cover: '06', title: 'The Last of Us Part II', platform: 'ps4', year: 2020, age: '18 anos', glow: '#4A7A3A', description: 'Ellie em Seattle. Roda no PS5 com atualização gratuita.', copies: [['a', 89.9, 1]] },
  { cover: '07', title: 'Mario Kart 8 Deluxe', platform: 'switch', year: 2017, age: 'Livre', glow: '#E8322B', description: 'O kart mais vendido do Switch, para jogar em até 4 na mesma tela.', copies: [['a', 239.9, 2]] },
  { cover: '08', title: 'God of War II', platform: 'ps2', year: 2007, age: '18 anos', glow: '#A3241A', description: 'Kratos contra o Olimpo. Dois discos, versão americana.', copies: [['b', 149.9, 1]] },
  { cover: '09', title: 'Forza Horizon 5', platform: 'xbox-series', year: 2021, age: 'Livre', glow: '#F06C2F', description: 'Festival de corrida no México. Lacrado, roda no Xbox One e Series.', copies: [['lacrado', 179.9, 4]] },
  { cover: '10', title: 'Red Dead Redemption 2', platform: 'ps4', year: 2018, age: '18 anos', glow: '#B3261E', description: 'Arthur Morgan no velho oeste. Dois discos, com mapa.', copies: [['b', 99.9, 2]] },
  { cover: '11', title: 'Metal Gear Solid 3', platform: 'ps2', year: 2004, age: '16 anos', glow: '#4F6B35', description: 'Snake Eater. Só o disco, testado do começo ao fim da missão virtuosa.', copies: [['disco', 79.9, 1]] },
  { cover: '12', title: 'Hollow Knight', platform: 'switch', year: 2018, age: '10 anos', glow: '#3C5A8A', description: 'Metroidvania em Hallownest. Edição física lacrada.', copies: [['lacrado', 149.9, 3]] },
  { cover: '13', title: 'Halo 3', platform: 'xbox-360', year: 2007, age: '16 anos', glow: '#3A8FB7', description: 'O fim da trilogia original do Master Chief. Roda no Xbox One e Series.', copies: [['a', 59.9, 2]] },
  { cover: '14', title: 'Samurai Shodown', platform: 'xbox-one', year: 2019, age: '16 anos', glow: '#B91C1C', description: 'O clássico da SNK de volta em 3D. Lacrado.', copies: [['lacrado', 140, 2]] },
  { cover: '15', title: 'Gran Turismo 4', platform: 'ps2', year: 2004, age: 'Livre', glow: '#2E6BD8', description: 'Mais de 700 carros. Completo com manual.', copies: [['a', 119.9, 1]] },
  { cover: '16', title: 'As Dusk Falls', platform: 'ps5', year: 2022, age: '16 anos', glow: '#E07A3F', description: 'Drama interativo para jogar sozinho ou em grupo pelo celular.', copies: [['lacrado', 189.9, 2]] },
  { cover: '17', title: 'Ico', platform: 'ps2', year: 2001, age: '10 anos', glow: '#C8A24A', description: 'O primeiro da Team Ico. Versão americana completa, item de coleção.', copies: [['a', 219.9, 1]] },
]

const TESTED_ON: Record<string, string> = {
  ps5: 'PS5', ps4: 'PS4 Pro', ps2: 'PS2 Slim', switch: 'Switch OLED', 'switch-2': 'Switch 2',
  'xbox-series': 'Xbox Series X', 'xbox-one': 'Xbox One S', 'xbox-360': 'Xbox 360 Slim',
}

const nextFriday20h = () => {
  const d = new Date()
  d.setHours(20, 0, 0, 0)
  const add = (5 - d.getDay() + 7) % 7 || (new Date() < d ? 0 : 7)
  d.setDate(d.getDate() + add)
  return d.toISOString()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Owner credentials for local dev live in apps/web/.env (never in chat/git).
function ownerCredentials() {
  const env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : ''
  let email = process.env.SEED_ADMIN_EMAIL
  let password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    email = 'dono@checkpointgeek.local'
    password = crypto.randomBytes(9).toString('base64url')
    fs.writeFileSync(ENV_FILE, `${env.trimEnd()}\nSEED_ADMIN_EMAIL=${email}\nSEED_ADMIN_PASSWORD=${password}\n`)
  }
  return { email, password }
}

const payload = await getPayload({ config })
const log = (m: string) => payload.logger.info(`[seed] ${m}`)

for (const collection of ['drops', 'copies', 'games', 'media'] as const) {
  await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true })
}
log('catálogo limpo')

const owners = await payload.count({ collection: 'users' })
if (owners.totalDocs === 0) {
  const { email, password } = ownerCredentials()
  await payload.create({ collection: 'users', data: { name: 'Dono', email, password, role: 'dono' }, overrideAccess: true })
  log(`conta do dono criada (${email}); a senha está em apps/web/.env`)
}

const copyIds = new Map<string, number[]>()
// Insert oldest first so "newest" (createdAt desc) matches the GAMES order.
for (const g of [...GAMES].reverse()) {
  const media = await payload.create({
    collection: 'media',
    data: { alt: `Capa de ${g.title}` },
    filePath: path.resolve(dirname, 'covers', `${g.cover}.jpg`),
    overrideAccess: true,
  })
  const game = await payload.create({
    collection: 'games',
    data: {
      title: g.title,
      platform: g.platform as never,
      cover: media.id,
      year: g.year,
      ageRating: g.age,
      glow: g.glow,
      featured: Boolean(g.featured),
      description: g.description,
    },
    overrideAccess: true,
  })
  const ids: number[] = []
  for (const [condition, price, stock] of [...g.copies].reverse()) {
    const used = condition !== 'lacrado'
    const copy = await payload.create({
      collection: 'copies',
      data: {
        game: game.id,
        condition,
        price,
        stock,
        active: true,
        ...(used && {
          laudo: {
            boot: true,
            capa: condition !== 'disco',
            manual: condition === 'a',
            higienizado: true,
            surface: condition === 'a' ? 'Sem riscos' : condition === 'b' ? '2 riscos leves' : 'Riscos leves, roda 100%',
            testedOn: TESTED_ON[g.platform],
          },
        }),
      },
      overrideAccess: true,
    })
    ids.push(copy.id)
    await sleep(8)
  }
  copyIds.set(g.title, ids)
}
log(`${GAMES.length} jogos e ${[...copyIds.values()].flat().length} cópias`)

await payload.create({
  collection: 'drops',
  data: {
    title: 'Lote retrô japonês',
    opensAt: nextFriday20h(),
    slots: 9,
    reserved: 5,
    earlyLevel: 4,
    teasers: [
      ['Super Famicom', 'Console JP · caixa'],
      ['Chrono Trigger', 'SFC · completo'],
      ['Parasite Eve', 'PS1 JP'],
      ['Mega Drive', 'Console JP'],
      ['Rockman X', 'SFC · cartucho'],
      ['Ico', 'PS2 JP · lacrado'],
      ['Pokémon Green', 'GB · cartucho'],
      ['Sega Saturn', 'Console JP'],
      ['???', 'Surpresa'],
    ].map(([name, detail]) => ({ name, detail })),
  },
  overrideAccess: true,
})
log('drop de sexta criado')

process.exit(0)
