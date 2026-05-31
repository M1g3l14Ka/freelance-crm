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
      className="text-zinc-400 hover:text-red-500 hover:bg-[#050505] hover:border hover:border-[#505050]"
    >
      <LogOut size={20} />
    </Button>
  )
}

