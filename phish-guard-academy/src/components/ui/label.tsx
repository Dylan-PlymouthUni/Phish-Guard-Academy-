import React from "react";
export function Label({children,...p}:React.LabelHTMLAttributes<HTMLLabelElement>){return <label {...p} className={["text-sm",p.className].join(" ")}>{children}</label>;}
