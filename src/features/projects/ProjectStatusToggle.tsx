"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { updateProjectStatus } from "./actions";
import { CheckCircle2, Circle } from "lucide-react";

interface ProjectStatusToggleProps {
  id: string;
  currentStatus: string;
}

export function ProjectStatusToggle({ id, currentStatus }: ProjectStatusToggleProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    const newStatus = status === "ACTIVE" ? "COMPLETED" : "ACTIVE";
    await updateProjectStatus(id, newStatus);
    setStatus(newStatus);
    setIsLoading(false);
  };

  const isCompleted = status === "COMPLETED";

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        ${isCompleted 
          ? "text-green-500 hover:text-green-400 hover:bg-green-950" 
          : "text-orange-500 hover:text-orange-400 hover:bg-orange-950"
        }
      `}
      title={isCompleted ? "COMPLETED" : "ACTIVE"}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Circle className="w-4 h-4" />
      )}
    </Button>
  );
}

