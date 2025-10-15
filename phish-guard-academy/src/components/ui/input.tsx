import React from "react";
export function Input(p:React.InputHTMLAttributes<HTMLInputElement>){return <input {...p} className={["border rounded px-2 py-1 w-full",p.className].join(" ")}/>;}
