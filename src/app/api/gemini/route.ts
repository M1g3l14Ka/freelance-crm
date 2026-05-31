import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    // Get user data
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.user.id },
    });

    const budgetLimits = await prisma.budgetLimit.findMany({
      where: { userId: session.user.id },
    });

    // Build context for AI
    const totalEarned = projects.reduce((acc, p) => acc + (p.netIncome || 0), 0);
    const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;

    const context = `
User has the following financial data:

PROJECTS:
- Total projects: ${projects.length}
- Active: ${activeProjects}
- Completed: ${completedProjects}
- Total earned: ${totalEarned.toLocaleString("en-US")}

RECENT PROJECTS:
${projects.slice(0, 5).map((p) => `- ${p.title}: ${p.grossIncome.toLocaleString("en-US")} (${p.currency}), status: ${p.status}`).join("\n")}

SUBSCRIPTIONS:
${subscriptions.length > 0 ? subscriptions.map((s) => `- ${s.title}: ${s.amount.toLocaleString("en-US")} ${s.currency}, next payment: ${new Date(s.nextPaymentDate).toLocaleDateString("en-US")}`).join("\n") : "No active subscriptions"}

BUDGET LIMITS:
${budgetLimits.length > 0 ? budgetLimits.map((b) => `- ${b.period} (${b.month || ""}/${b.year || ""}): limit ${b.limitAmount.toLocaleString("en-US")} ${b.currency}, spent ${b.spentAmount.toLocaleString("en-US")} ${b.currency}`).join("\n") : "No limits set"}

Current date: ${new Date().toLocaleDateString("en-US")}
    `.trim();

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // Request to Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${context}\n\nUser question: ${question}\n\nProvide a detailed analytical answer in English with recommendations and insights. Be concise but comprehensive.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to get answer";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


