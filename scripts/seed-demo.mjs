import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { seedDemoWorkspace } from "./demo-seed-lib.mjs"

const demoUserId = process.env.DEMO_USER_ID?.trim()
if (!demoUserId) throw new Error("DEMO_USER_ID is required")

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

try {
  const result = await seedDemoWorkspace(prisma, demoUserId)
  console.log(`Demo workspace seeded for ${result.userId}`)
} finally {
  await prisma.$disconnect()
}
