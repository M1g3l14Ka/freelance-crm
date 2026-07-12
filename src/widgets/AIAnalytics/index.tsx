"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Sparkles, Send, Loader2, TrendingUp, PieChart, Wallet } from "lucide-react";
import { AnimatedDiv } from "@/shared/ui/animated";

const SUGGESTED_QUESTIONS = [
  { icon: TrendingUp, text: "How can I increase my income?" },
  { icon: PieChart, text: "Analyze my expenses" },
  { icon: Wallet, text: "How much can I put off?" },
];

export function AIAnalytics({ readOnly = false }: { readOnly?: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);

  const handleAsk = async (q: string = question) => {
    if (readOnly || !q.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await response.json();
      if (data.answer) {
        setAnswer(data.answer);
        setHistory((prev) => [...prev, { question: q, answer: data.answer }]);
        setQuestion("");
      }
    } catch (error) {
      console.error("Error asking AI:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <AnimatedDiv delay={0.5}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <CardTitle>
              AI Analytics
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask AI about your finances..."
              className="flex-1"
              disabled={isLoading || readOnly}
            />
            <Button
              onClick={() => handleAsk()}
              disabled={isLoading || readOnly || !question.trim()}
              title={readOnly ? "AI requests are disabled in the public demo" : undefined}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {readOnly && (
            <p className="text-sm text-text-muted" role="note">
              AI requests are disabled in the public demo.
            </p>
          )}

          {!readOnly && !answer && !isLoading && (
            <div className="flex gap-2 flex-wrap">
              {SUGGESTED_QUESTIONS.map((item, i) => (
                <Button
                  key={i}
                  variant="outline"
                  onClick={() => handleAsk(item.text)}
                  className="text-sm"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.text}
                </Button>
              ))}
            </div>
          )}

          {(answer || isLoading) && (
            <div className="space-y-4">
              {isLoading && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI analyzes your data...</span>
                </div>
              )}

              {answer && (
                <div className="max-h-150 overflow-y-auto rounded-lg border border-border bg-surface-elevated p-4">
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{answer}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-sm text-text-secondary">Query history:</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.slice(-5).map((item, i) => (
                  <div key={i} className="rounded-lg border border-border bg-surface-elevated p-3 text-sm">
                    <div className="font-medium text-accent">{item.question}</div>
                    <div className="line-clamp-3 text-text-secondary">{item.answer.substring(0, 150)}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AnimatedDiv>
  );
}

