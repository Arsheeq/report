// Script for pushing database schema
import { execSync } from 'child_process';

try {
  console.log('Running database migration...');
  execSync('npx drizzle-kit push:pg', { stdio: 'inherit' });
  console.log('Database migration completed successfully');
} catch (error) {
  console.error('Error running database migration:', error.message);
  process.exit(1);
}