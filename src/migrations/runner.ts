import mongoose from 'mongoose';
import { database } from '@utils';
import { logger } from '@utils';
import { migrations } from './index';

/**
 * Migration runner
 * Usage:
 *   npm run migrate up          - Run all pending migrations
 *   npm run migrate down        - Rollback last migration
 *   npm run migrate up 001      - Run specific migration
 *   npm run migrate down 001    - Rollback specific migration
 */

const MigrationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  executedAt: { type: Date, default: Date.now },
});

const MigrationModel = mongoose.model('Migration', MigrationSchema);

async function getExecutedMigrations(): Promise<string[]> {
  const executed = await MigrationModel.find().sort({ executedAt: 1 });
  return executed.map((m) => m.id);
}

async function markMigrationExecuted(id: string, name: string): Promise<void> {
  await MigrationModel.create({ id, name });
}

async function markMigrationRolledBack(id: string): Promise<void> {
  await MigrationModel.deleteOne({ id });
}

async function runUp(migrationId?: string): Promise<void> {
  const executed = await getExecutedMigrations();

  const toRun = migrationId
    ? migrations.filter((m) => m.id === migrationId && !executed.includes(m.id))
    : migrations.filter((m) => !executed.includes(m.id));

  if (toRun.length === 0) {
    logger.info('No pending migrations to run');
    return;
  }

  for (const migration of toRun) {
    logger.info(`Running migration ${migration.id}: ${migration.name}`);
    try {
      await migration.up();
      await markMigrationExecuted(migration.id, migration.name);
      logger.info(`✓ Migration ${migration.id} completed successfully`);
    } catch (error: any) {
      logger.error(`✗ Migration ${migration.id} failed: ${error.message}`);
      throw error;
    }
  }

  logger.info(`Completed ${toRun.length} migration(s)`);
}

async function runDown(migrationId?: string): Promise<void> {
  const executed = await getExecutedMigrations();

  if (executed.length === 0) {
    logger.info('No migrations to rollback');
    return;
  }

  const toRollback = migrationId
    ? migrations.filter((m) => m.id === migrationId && executed.includes(m.id))
    : migrations.filter((m) => m.id === executed[executed.length - 1]);

  if (toRollback.length === 0) {
    logger.info('No migrations to rollback');
    return;
  }

  for (const migration of toRollback.reverse()) {
    logger.info(`Rolling back migration ${migration.id}: ${migration.name}`);
    try {
      await migration.down();
      await markMigrationRolledBack(migration.id);
      logger.info(`✓ Migration ${migration.id} rolled back successfully`);
    } catch (error: any) {
      logger.error(`✗ Migration ${migration.id} rollback failed: ${error.message}`);
      throw error;
    }
  }

  logger.info(`Rolled back ${toRollback.length} migration(s)`);
}

async function showStatus(): Promise<void> {
  const executed = await getExecutedMigrations();

  logger.info('\n=== Migration Status ===\n');

  for (const migration of migrations) {
    const status = executed.includes(migration.id) ? '✓ EXECUTED' : '⨯ PENDING';
    logger.info(`${status} - ${migration.id}: ${migration.name}`);
  }

  logger.info(`\nTotal: ${migrations.length} migrations, ${executed.length} executed, ${migrations.length - executed.length} pending\n`);
}

async function main() {
  const command = process.argv[2]; // up, down, or status
  const migrationId = process.argv[3]; // optional migration ID

  if (!command || !['up', 'down', 'status'].includes(command)) {
    logger.error('Usage: npm run migrate [up|down|status] [migration-id]');
    process.exit(1);
  }

  try {
    await database.connect();
    logger.info('Connected to database');

    switch (command) {
      case 'up':
        await runUp(migrationId);
        break;
      case 'down':
        await runDown(migrationId);
        break;
      case 'status':
        await showStatus();
        break;
    }

    await mongoose.disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error: any) {
    logger.error('Migration failed', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
