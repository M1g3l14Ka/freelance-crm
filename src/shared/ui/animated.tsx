"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function AnimatedDiv({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, delay: reduceMotion ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedTableRow({
  children,
  index = 0,
  className,
}: {
  children: ReactNode
  index?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : 0.04 * index }}
      className={cn("h-16 border-b border-border transition-colors duration-150 hover:bg-surface-elevated/70 last:border-b-0", className)}
    >
      {children}
    </motion.tr>
  )
}

export function AnimatedHeader({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
