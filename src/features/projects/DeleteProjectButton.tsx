'use client'

import { Trash2 } from "lucide-react"
import { deleteProject } from "./actions";

export function DeleteProjectButton({ id }: { id: string }) {
   return (
    <button
        onClick={async (e) => {
            e.stopPropagation();
            if(confirm("Are you sure you want to delete this project?")) {
                await deleteProject(id);
            }
        }}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-destructive transition-colors duration-150 hover:border-destructive/20 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
        aria-label="Delete project"
    >
        <Trash2 size={18}/>
    </button>
   )
}
