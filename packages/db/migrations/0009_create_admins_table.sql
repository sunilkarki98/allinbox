-- Migration: Create Separate Admins Table
-- Date: 2026-02-07
-- Purpose: Separate admin users from tenants (SaaS customers)

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    last_login_at TIMESTAMP
);

-- Note: The 'role' column in 'tenants' table is now deprecated.
-- Tenants are SaaS customers only. Admin access is via 'admins' table.
-- We do NOT drop the role column to maintain backward compatibility,
-- but it should not be used for authorization.
