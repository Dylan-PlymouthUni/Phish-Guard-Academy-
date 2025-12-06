import { jsx as _jsx } from "react/jsx-runtime";
export function Button({ children, className, ...p }) { return _jsx("button", { ...p, className: ["px-3 py-2 border rounded", className].join(" ").trim(), children: children }); }
