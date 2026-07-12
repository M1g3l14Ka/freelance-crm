const DEMO_EMAIL = "demo.workspace@example.invalid"

function dateFor(year, month, day) {
  return new Date(Date.UTC(year, month, day, 12))
}

async function assertRecordsBelongToDemo(model, ids, demoUserId, label) {
  const existing = await model.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true },
  })

  if (existing.some((record) => record.userId !== demoUserId)) {
    throw new Error(`Refusing to seed: a ${label} ID belongs to another user`)
  }
}

export async function seedDemoWorkspace(prisma, demoUserId, now = new Date()) {
  if (!demoUserId?.trim()) throw new Error("DEMO_USER_ID is required")

  const existingById = await prisma.user.findUnique({ where: { id: demoUserId } })
  const existingByEmail = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })

  if (existingById && existingById.email !== DEMO_EMAIL) {
    throw new Error("Refusing to seed: DEMO_USER_ID belongs to a non-demo user")
  }
  if (existingByEmail && existingByEmail.id !== demoUserId) {
    throw new Error("Refusing to seed: demo email belongs to another user")
  }

  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const projectIds = Array.from({ length: 6 }, (_, index) => `demo-project-${index + 1}`)
  const subscriptionIds = Array.from({ length: 3 }, (_, index) => `demo-subscription-${index + 1}`)
  const budgetId = "demo-budget-current-month"
  const expenseIds = Array.from({ length: 4 }, (_, index) => `demo-expense-${index + 1}`)

  await assertRecordsBelongToDemo(prisma.project, projectIds, demoUserId, "project")
  await assertRecordsBelongToDemo(prisma.subscription, subscriptionIds, demoUserId, "subscription")
  await assertRecordsBelongToDemo(prisma.budgetLimit, [budgetId], demoUserId, "budget limit")
  await assertRecordsBelongToDemo(prisma.expense, expenseIds, demoUserId, "expense")

  await prisma.user.upsert({
    where: { id: demoUserId },
    update: { name: "Demo Freelancer", email: DEMO_EMAIL, password: null },
    create: { id: demoUserId, name: "Demo Freelancer", email: DEMO_EMAIL, password: null },
  })

  const projects = [
    ["Brand identity package", 2400, 6, "USD", "COMPLETED", dateFor(year, month - 5, 8)],
    ["E-commerce UX audit", 1850, 6, "EUR", "COMPLETED", dateFor(year, month - 4, 17)],
    ["Analytics dashboard", 320000, 6, "RUB", "COMPLETED", dateFor(year, month - 3, 11)],
    ["Mobile banking prototype", 2900, 6, "USD", "ACTIVE", dateFor(year, month - 2, 22)],
    ["SaaS design system", 2600, 6, "EUR", "ACTIVE", dateFor(year, month - 1, 14)],
    ["Fintech landing page", 210000, 6, "RUB", "ACTIVE", dateFor(year, month, 5)],
  ]

  for (const [index, project] of projects.entries()) {
    const [title, grossIncome, taxRate, currency, status, createdAt] = project
    const data = {
      title,
      grossIncome,
      taxRate,
      netIncome: grossIncome - grossIncome * taxRate / 100,
      currency,
      status,
      createdAt,
      userId: demoUserId,
    }
    await prisma.project.upsert({ where: { id: projectIds[index] }, update: data, create: { id: projectIds[index], ...data } })
  }

  const subscriptions = [
    ["Design software", 55, 30, "USD", dateFor(year, month, 18)],
    ["Cloud storage", 18, 30, "EUR", dateFor(year, month, 23)],
    ["Accounting service", 4900, 30, "RUB", dateFor(year, month + 1, 2)],
  ]
  for (const [index, subscription] of subscriptions.entries()) {
    const [title, amount, intervalDays, currency, nextPaymentDate] = subscription
    const data = { title, amount, intervalDays, currency, nextPaymentDate, userId: demoUserId }
    await prisma.subscription.upsert({ where: { id: subscriptionIds[index] }, update: data, create: { id: subscriptionIds[index], ...data } })
  }

  const budgetData = {
    period: "month",
    limitAmount: 120000,
    spentAmount: 0,
    currency: "RUB",
    month: month + 1,
    year,
    userId: demoUserId,
  }
  await prisma.budgetLimit.upsert({ where: { id: budgetId }, update: budgetData, create: { id: budgetId, ...budgetData } })

  const expenses = [
    ["Coworking membership", 24000, "Workspace", 3],
    ["Professional software", 12800, "Software", 7],
    ["Client meeting", 5600, "Business", 12],
    ["Online course", 8900, "Education", 16],
  ]
  for (const [index, expense] of expenses.entries()) {
    const [title, amount, category, day] = expense
    const data = { title, amount, category, date: dateFor(year, month, day), budgetLimitId: budgetId, userId: demoUserId }
    await prisma.expense.upsert({ where: { id: expenseIds[index] }, update: data, create: { id: expenseIds[index], ...data } })
  }

  return { userId: demoUserId, projects: projectIds.length, subscriptions: subscriptionIds.length, expenses: expenseIds.length }
}
