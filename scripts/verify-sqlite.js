/**
 * Verifies better-sqlite3 loads after npm install.
 * Run automatically via postinstall; can also run manually: npm run verify:sqlite
 */
try {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.prepare('SELECT 1 AS ok').get();
  db.close();
  console.log('[postinstall] better-sqlite3 verified successfully');
} catch (err) {
  console.error('[postinstall] better-sqlite3 failed to load:', err.message);
  console.error('');
  console.error('Try the following:');
  console.error('  1. Ensure Node.js 18+ is installed');
  console.error('  2. Run: npm rebuild better-sqlite3');
  console.error('  3. On Windows, install Visual Studio Build Tools if rebuild is needed');
  console.error('');
  process.exit(1);
}
