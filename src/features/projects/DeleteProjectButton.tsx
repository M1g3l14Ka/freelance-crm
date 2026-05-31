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
        className="text-red-500 hover:text-red-700 transition-colors duration-300"
    >
        <Trash2 size={18}/>
    </button>
   )
}
