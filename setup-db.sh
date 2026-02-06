#!/bin/bash

# Script to push Drizzle schema to Supabase
# Ensure you have DATABASE_URL in your .env file

echo "🔍 Checking for .env file..."
if [ ! -f .env ]; then
    echo "❌ error: .env file not found."
    echo "Please create a .env file with your DATABASE_URL (Supabase connection string)."
    exit 1
fi

echo "🚀 Pushing schema to Supabase..."
npm run db:push

echo "✅ Database schema push complete!"
echo "You can view your database with: npm run db:studio"
