import { defineConfig } from 'drizzle-kit'

// Uses DATABASE_URL (direct, not pooler) for schema migrations
// Pooler URL is for application queries; direct URL is for drizzle-kit
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
})
