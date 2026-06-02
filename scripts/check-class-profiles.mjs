import mysql from 'mysql2/promise';
const conn = await mysql.createConnection({
  host: 'localhost', port: 3306,
  user: 'dummyuser313', password: '9Rob0cO)1x9(cZ]0S.H?',
  database: 'dummy'
});
const [rows] = await conn.query("SHOW TABLES LIKE 'class_profiles'");
console.log('class_profiles exists:', rows.length > 0);
if (rows.length === 0) {
  await conn.query(`
    CREATE TABLE class_profiles (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL UNIQUE,
      class_type ENUM('regular','lab','seminar') NOT NULL DEFAULT 'regular',
      file_sending_allowed TINYINT(1) NOT NULL DEFAULT 0,
      start_time VARCHAR(10) NOT NULL DEFAULT '09:00',
      cutoff_time VARCHAR(10) NOT NULL DEFAULT '09:15',
      check_interval INT NOT NULL DEFAULT 15,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      CONSTRAINT fk_class_profiles_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('class_profiles table created');
} else {
  console.log('Already exists, no action needed');
}
await conn.end();
