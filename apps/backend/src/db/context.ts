import { db } from './index.js';
import { sql, type ExtractTablesWithRelations } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import * as schema from '@allinbox/db';

// Type definition for the transaction object
type Tx = PgTransaction<NodePgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

/**
 * Execute a callback within a tenant-scoped transaction.
 * 
 * @param tenantId - The ID of the tenant to scope execution for
 * @param callback - The async function to execute. Receives the transaction `tx` object.
 * @returns The result of the callback
 * 
 * @example
 * const leads = await withTenant(user.id, async (tx) => {
 *   return await tx.select().from(leads);
 * });
 */
export async function withTenant<T>(tenantId: string, callback: (tx: Tx) => Promise<T>): Promise<T> {
    if (!tenantId) {
        throw new Error('Tenant ID is required for context execution');
    }

    // We MUST use a transaction to guarantee that SET LOCAL applies to the subsequent queries
    // on the SAME database connection.
    return await db.transaction(async (tx) => {
        // 1. Set the RLS session variable
        // The third parameter 'true' makes it "is_local", applying only to this transaction
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

        // 2. Execute the user's logic
        return await callback(tx);
    });
}
