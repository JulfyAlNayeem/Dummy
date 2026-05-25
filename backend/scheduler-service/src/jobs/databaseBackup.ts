import cron from 'node-cron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MySQLConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

function parseMysqlUrl(url: string): MySQLConfig {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || 'localhost',
      port: u.port || '3306',
      user: decodeURIComponent(u.username) || 'root',
      password: decodeURIComponent(u.password) || '',
      database: u.pathname.replace(/^\//, '') || 'dummy',
    };
  } catch {
    throw new Error('Invalid DATABASE_URL for MySQL');
  }
}

function runMysqldump(cfg: MySQLConfig, dumpFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const safePassword = cfg.password.replace(/'/g, "'\\''");
    const cmd = `MYSQL_PWD='${safePassword}' mysqldump -h ${cfg.host} -P ${cfg.port} -u ${cfg.user} ${cfg.database} > "${dumpFile}"`;

    exec(cmd, { shell: '/bin/sh' }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`mysqldump failed: ${stderr || error.message}`));
        return;
      }
      resolve();
    });
  });
}

function createTarGz(sourceFolder: string, destFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = `tar -czf "${destFile}" -C "${path.dirname(sourceFolder)}" "${path.basename(sourceFolder)}"`;
    exec(cmd, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`tar failed: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}

function cleanOldBackups(directory: string, retentionDays: number): void {
  try {
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(directory);
    let deleted = 0;

    for (const file of files) {
      if (!file.startsWith('dummy_backup_') || !file.endsWith('.tar.gz')) continue;
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        deleted++;
        logger.info({ file }, 'Deleted old backup');
      }
    }

    if (deleted > 0) logger.info({ deleted }, 'Cleaned up old backups');
  } catch (err) {
    logger.warn({ err }, 'Error cleaning old backups');
  }
}

async function uploadToGCS(filePath: string, gcsBucket: string, gcsPrefix: string): Promise<void> {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();
  const destination = `${gcsPrefix}${path.basename(filePath)}`;
  await storage.bucket(gcsBucket).upload(filePath, {
    destination,
    metadata: { contentType: 'application/gzip' },
  });
  logger.info({ destination: `gs://${gcsBucket}/${destination}` }, 'Backup uploaded to GCS');
}

async function runBackup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/dummy';
  const outDir = process.env.DUMP_DIR || path.resolve(__dirname, '../../../..', 'backups');
  const gcsBucket = process.env.GCS_BUCKET || '';
  const gcsPrefix = process.env.GCS_PREFIX || 'dummy/';
  const uploadToGcs = process.env.UPLOAD_TO_GCS === 'true' && !!gcsBucket;
  const keepLocalBackup = process.env.KEEP_LOCAL_BACKUP !== 'false';
  const localRetentionDays = parseInt(process.env.LOCAL_RETENTION_DAYS || '7', 10);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dumpFolder = path.join(outDir, `dummy_backup_${timestamp}`);
  const archiveFile = `${dumpFolder}.tar.gz`;

  fs.mkdirSync(dumpFolder, { recursive: true });

  logger.info({ timestamp, outDir }, 'Starting MySQL backup');

  const cfg = parseMysqlUrl(databaseUrl);
  const dumpFile = path.join(dumpFolder, `${cfg.database}.sql`);

  try {
    await runMysqldump(cfg, dumpFile);
    logger.info('mysqldump completed');

    await createTarGz(dumpFolder, archiveFile);
    logger.info({ archiveFile }, 'Archive created');

    fs.rmSync(dumpFolder, { recursive: true, force: true });

    if (uploadToGcs) {
      await uploadToGCS(archiveFile, gcsBucket, gcsPrefix);
    }

    if (keepLocalBackup) {
      cleanOldBackups(outDir, localRetentionDays);
    } else if (uploadToGcs) {
      fs.unlinkSync(archiveFile);
      logger.info('Local backup removed after GCS upload');
    }

    logger.info({ archiveFile }, 'Backup completed successfully');
  } catch (err) {
    logger.error({ err }, 'Backup failed');
    fs.rmSync(dumpFolder, { recursive: true, force: true });
    if (fs.existsSync(archiveFile)) fs.unlinkSync(archiveFile);
    throw err;
  }
}

export const startDatabaseBackupJob = (): void => {
  // Daily at midnight Bangladesh time (18:00 UTC = 00:00 Asia/Dhaka)
  cron.schedule(
    '0 18 * * *',
    async () => {
      try {
        await runBackup();
      } catch (err) {
        logger.error({ err }, 'Database backup job failed');
      }
    },
    { timezone: 'Asia/Dhaka' },
  );

  logger.info('Database backup job started (daily at 00:00 Asia/Dhaka)');
};
