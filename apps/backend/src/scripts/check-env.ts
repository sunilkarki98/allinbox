
import dotenv from 'dotenv';
import path from 'path';

// Attempt to load from root .env (assuming CWD is root, as per my changes to other scripts)
// But wait, if I run this with `npx tsx apps/backend/src/scripts/check-env.ts`, CWD is root.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Checking Environment Variables...');
console.log('CWD:', process.cwd());
console.log('Loading from:', path.resolve(process.cwd(), '.env'));

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    console.log('✅ JWT_SECRET loaded and valid');
} else {
    console.error('❌ JWT_SECRET missing or invalid:', process.env.JWT_SECRET);
    process.exit(1);
}

if (process.env.DATABASE_URL) {
    console.log('✅ DATABASE_URL loaded');
} else {
    console.error('❌ DATABASE_URL missing');
    process.exit(1);
}

console.log('✅ Environment verification successful');
