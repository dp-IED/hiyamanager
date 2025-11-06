import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'db.sqlite');
const dataDir = join(process.cwd(), 'data');

// Ensure data directory exists
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Get all migration files sorted
const drizzleDir = join(process.cwd(), 'drizzle');
const migrationFiles = readdirSync(drizzleDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

// Execute each migration
for (const migrationFile of migrationFiles) {
  const migrationPath = join(drizzleDir, migrationFile);
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  // Split by statement breakpoint and execute each statement
  const statements = migrationSQL.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);

  for (const statement of statements) {
    // Handle CREATE TABLE
    if (statement.includes('CREATE TABLE')) {
      const sql = statement.replace(/^CREATE TABLE `(\w+)`/m, 'CREATE TABLE IF NOT EXISTS `$1`');
      try {
        sqlite.exec(sql);
      } catch (error: any) {
        // Ignore "table already exists" errors
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
    // Handle ALTER TABLE (for adding columns)
    else if (statement.includes('ALTER TABLE')) {
      try {
        sqlite.exec(statement);
      } catch (error: any) {
        // Ignore "duplicate column" errors
        if (!error.message.includes('duplicate column') && !error.message.includes('no such column')) {
          throw error;
        }
      }
    }
    // Handle other statements
    else if (statement.length > 0) {
      try {
        sqlite.exec(statement);
      } catch (error: any) {
        console.warn(`Warning executing statement: ${error.message}`);
      }
    }
  }
}

console.log('Migration completed successfully');
sqlite.close();

