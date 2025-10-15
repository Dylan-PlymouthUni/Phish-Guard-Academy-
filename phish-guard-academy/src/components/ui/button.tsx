import React from "react";
type P = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; asChild?: boolean; className?: string; };
export function Button({children, className, ...p}: P) { return <button {...p} className={["px-3 py-2 border rounded", className].join(" ").trim()}>{children}</button>; }
