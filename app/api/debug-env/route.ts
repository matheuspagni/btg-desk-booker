import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.DATABASE_URL
  const host = process.env.DATABASE_HOST
  const name = process.env.DATABASE_NAME
  const user = process.env.DATABASE_USER
  const schema = process.env.DATABASE_SCHEMA
  const ssl = process.env.DATABASE_SSL

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    database: {
      hasUrl: Boolean(url),
      host: host ?? (url ? new URL(url).hostname : null),
      name: name ?? (url ? new URL(url).pathname.replace('/', '') : null),
      user: user ?? (url ? new URL(url).username : null),
      schema: schema ?? 'public',
      ssl: ssl ?? (url?.includes('sslmode=require') ? 'true' : 'false'),
    },
  })
}
