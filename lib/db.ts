import { Pool, PoolClient, QueryResult, QueryResultRow, types } from 'pg'

// Ensure DATE columns are returned as plain strings (`YYYY-MM-DD`)
types.setTypeParser(1082, (value) => value)

const {
  DATABASE_URL,
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_NAME,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_SSL,
  DATABASE_SCHEMA,
} = process.env

let schemaToUse: string | undefined
if (DATABASE_SCHEMA) {
  if (!/^[a-zA-Z0-9_]+$/.test(DATABASE_SCHEMA)) {
    throw new Error('DATABASE_SCHEMA must contain only letters, numbers, or underscores')
  }
  schemaToUse = DATABASE_SCHEMA
}

const useSsl =
  typeof DATABASE_SSL === 'string'
    ? ['1', 'true', 'yes'].includes(DATABASE_SSL.toLowerCase())
    : false

const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: DATABASE_HOST,
        port: DATABASE_PORT ? Number(DATABASE_PORT) : undefined,
        database: DATABASE_NAME,
        user: DATABASE_USER,
        password: DATABASE_PASSWORD,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      }
)

pool.on('connect', (client) => {
  if (schemaToUse) {
    client
      .query(`SET search_path TO ${schemaToUse}, public;`)
      .catch((error) => {
        console.error('Failed to set search_path for PostgreSQL client', error)
      })
  }
})

export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect()
  return client
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = await getClient()
  try {
    return await client.query<T>(text, params)
  } finally {
    client.release()
  }
}

export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

