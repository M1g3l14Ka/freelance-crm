"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { Button } from "@/shared/ui/button"

export function SignOutButton() {
  return (
    <Button
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      variant="ghost"
      size="icon"
      className="text-text-secondary hover:bg-destructive/10 hover:text-destructive"
      aria-label="Sign out"
    >
      <LogOut size={20} />
    </Button>
  )
}

