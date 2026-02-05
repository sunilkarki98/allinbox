import { db } from './db/index.js';
import { tenants } from '@allinbox/db';

async function main() {
    try {
        const result = await db.select().from(tenants);
        console.log('Successfully connected to DB. Users count:', result.length);
        process.exit(0);
    } catch (error) {
        console.error('Failed to connect to DB:', error);
        process.exit(1);
    }
}

main();
