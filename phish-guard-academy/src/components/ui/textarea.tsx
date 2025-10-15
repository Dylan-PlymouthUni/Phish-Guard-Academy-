import React from "react";
export function Textarea(p:React.TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea {...p} className={["border rounded px-2 py-1 w-full",p.className].join(" ")}/>;}
