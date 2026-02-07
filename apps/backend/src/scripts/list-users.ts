import { db } from '../db/index.js';
import { tenants } from '@allinbox/db';

async function listUsers() {
    console.log('Fetching users...');
    const users = await db.select().from(tenants);
    if (users.length === 0) {
        console.log('No users found in database.');
    } else {
        console.table(users.map(u => ({ id: u.id, email: u.email, status: u.status })));
    }
    process.exit(0);
}

listUsers().catch(console.error);
