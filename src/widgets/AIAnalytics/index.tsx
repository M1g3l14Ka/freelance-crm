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

export function AIAnalytics() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);

  const handleAsk = async (q: string = question) => {
    if (!q.trim()) return;

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
      <Card className="bg-[#050505] border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">
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
              className="bg-zinc-900 border-zinc-800 text-white flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleAsk()}
              disabled={isLoading || !question.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-black font-bold"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {!answer && !isLoading && (
            <div className="flex gap-2 flex-wrap">
              {SUGGESTED_QUESTIONS.map((item, i) => (
                <Button
                  key={i}
                  variant="outline"
                  onClick={() => handleAsk(item.text)}
                  className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm"
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
                <div className="flex items-center gap-2 text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI analyzes your data...</span>
                </div>
              )}

              {answer && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-150 overflow-y-auto">
                  <div className="prose prose-invert max-w-none">
                    <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-zinc-800">
              <h4 className="text-sm text-zinc-400">Query history:</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.slice(-5).map((item, i) => (
                  <div key={i} className="text-sm bg-zinc-900 rounded p-2">
                    <div className="text-orange-500 font-medium">{item.question}</div>
                    <div className="text-zinc-400 line-clamp-3">{item.answer.substring(0, 150)}...</div>
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

