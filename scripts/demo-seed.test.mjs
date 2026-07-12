import { describe, expect, it, vi } from "vitest"
import { seedDemoWorkspace } from "./demo-seed-lib.mjs"

function createModel(store) {
  return {
    findMany: vi.fn(async ({ where }) => [...store.values()].filter((item) => where.id.in.includes(item.id))),
    upsert: vi.fn(async ({ where, update, create }) => {
      const value = store.has(where.id) ? { ...store.get(where.id), ...update } : create
      store.set(where.id, value)
      return value
    }),
  }
}

function createFakePrisma(normalUser) {
  const stores = {
    users: new Map(normalUser ? [[normalUser.id, normalUser]] : []),
    projects: new Map(), subscriptions: new Map(), budgets: new Map(), expenses: new Map(),
  }
  return {
    stores,
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }) => [...stores.users.values()].find((user) =>
          (where.id && user.id === where.id) || (where.email && user.email === where.email)) ?? null),
        upsert: vi.fn(async ({ where, update, create }) => {
          const value = stores.users.has(where.id) ? { ...stores.users.get(where.id), ...update } : create
          stores.users.set(where.id, value)
          return value
        }),
      },
      project: createModel(stores.projects),
      subscription: createModel(stores.subscriptions),
      budgetLimit: createModel(stores.budgets),
      expense: createModel(stores.expenses),
    },
  }
}

describe("demo seed", () => {
  it("is idempotent and does not create duplicate records", async () => {
    const { prisma, stores } = createFakePrisma()
    const now = new Date("2026-07-12T00:00:00.000Z")
    await seedDemoWorkspace(prisma, "demo-user", now)
    await seedDemoWorkspace(prisma, "demo-user", now)

    expect(stores.users.size).toBe(1)
    expect(stores.projects.size).toBe(6)
    expect(stores.subscriptions.size).toBe(3)
    expect(stores.budgets.size).toBe(1)
    expect(stores.expenses.size).toBe(4)
  })

  it("never modifies a normal user", async () => {
    const normalUser = { id: "normal-user", email: "normal@example.com", name: "Normal" }
    const { prisma, stores } = createFakePrisma(normalUser)
    await seedDemoWorkspace(prisma, "demo-user", new Date("2026-07-12T00:00:00.000Z"))

    expect(stores.users.get("normal-user")).toEqual(normalUser)
  })
})
