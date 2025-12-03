import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read from environment with safe fallbacks
const mongoUri = process.env.MONGODB_URI || 'mongodb://dummyuser:dummypass@localhost:27017/dummy?authSource=admin';
const outDir = process.env.DUMP_DIR || path.resolve(__dirname, '..', 'backups');

// GCS configuration
const gcsBucket = process.env.GCS_BUCKET || '';
const gcsPrefix = process.env.GCS_PREFIX || 'dummy/';
const uploadToGcs = process.env.UPLOAD_TO_GCS === 'true' && gcsBucket;
const keepLocalBackup = process.env.KEEP_LOCAL_BACKUP !== 'false';
const localRetentionDays = parseInt(process.env.LOCAL_RETENTION_DAYS || '7', 10);

// Timestamp with date and time for multiple backups per day
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dumpFolder = path.join(outDir, `dummy_backup_${timestamp}`);
const archiveFile = `${dumpFolder}.tar.gz`;

// Ensure backup directory exists
fs.mkdirSync(outDir, { recursive: true });

let Storage;
let storage;

async function initGCS() {
  if (uploadToGcs) {
    const module = await import('@google-cloud/storage');
    Storage = module.Storage;
    storage = new Storage();
  }
}

function runMongodump() {
  return new Promise((resolve, reject) => {
    // Use mongodump to backup the database
    const cmd = `mongodump --uri="${mongoUri}" --out="${dumpFolder}"`;
    
    console.log('Starting MongoDB dump...');
    console.log(`Output directory: ${dumpFolder}`);
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('mongodump error:', stderr);
        reject(error);
        return;
      }
      console.log('mongodump completed successfully');
      if (stdout) console.log(stdout);
      resolve();
    });
  });
}

function createTarGz(sourceFolder, destFile) {
  return new Promise((resolve, reject) => {
    const cmd = `tar -czf "${destFile}" -C "${path.dirname(sourceFolder)}" "${path.basename(sourceFolder)}"`;
    
    console.log('Creating compressed archive...');
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('tar error:', stderr);
        reject(error);
        return;
      }
      console.log(`Archive created: ${destFile}`);
      resolve();
    });
  });
}

function removeDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Removed temporary directory: ${dir}`);
  }
}

function cleanOldBackups(directory, retentionDays) {
  try {
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(directory);

    let deleted = 0;
    files.forEach((file) => {
      if (!file.startsWith('dummy_backup_') || !file.endsWith('.tar.gz')) return;
      
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      const age = now - stat.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        deleted++;
        console.log(`Deleted old backup: ${file}`);
      }
    });

    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} old backup(s)`);
    }
  } catch (err) {
    console.warn('Error cleaning old backups:', err.message);
  }
}

async function uploadToGCS(filePath) {
  if (!uploadToGcs) return;
  
  console.log('Uploading to Google Cloud Storage...');
  const destination = `${gcsPrefix}${path.basename(filePath)}`;
  
  await storage.bucket(gcsBucket).upload(filePath, {
    destination,
    metadata: {
      contentType: 'application/gzip',
    },
  });
  
  console.log(`Backup uploaded to gs://${gcsBucket}/${destination}`);
}

async function dump() {
  try {
    await initGCS();
    
    console.log('='.repeat(50));
    console.log('Starting MongoDB Backup');
    console.log('='.repeat(50));
    console.log(`Timestamp: ${timestamp}`);
    console.log(`MongoDB URI: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`); // Hide password
    
    // Step 1: Run mongodump
    await runMongodump();
    
    // Step 2: Create tar.gz archive
    await createTarGz(dumpFolder, archiveFile);
    
    // Step 3: Remove the uncompressed dump folder
    removeDirectory(dumpFolder);
    
    // Step 4: Upload to GCS if configured
    if (uploadToGcs) {
      await uploadToGCS(archiveFile);
    }
    
    // Step 5: Clean up old backups
    if (keepLocalBackup) {
      cleanOldBackups(outDir, localRetentionDays);
    } else if (uploadToGcs) {
      fs.unlinkSync(archiveFile);
      console.log('Local backup removed (uploaded to GCS)');
    }
    
    console.log('='.repeat(50));
    console.log('Backup completed successfully!');
    console.log(`Archive: ${archiveFile}`);
    console.log('='.repeat(50));
    
    process.exit(0);
  } catch (err) {
    console.error('Backup failed:', err.message);
    // Clean up partial files
    removeDirectory(dumpFolder);
    if (fs.existsSync(archiveFile)) {
      fs.unlinkSync(archiveFile);
    }
    process.exit(1);
  }
}

dump();
