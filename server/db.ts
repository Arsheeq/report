import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

const DATABASE_URL = 'postgresql://postgres:postgres@13.203.194.88:5432/nubinix_db';

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false
});

export const db = drizzle(pool, { schema });
