import { jsx as _jsx } from "react/jsx-runtime";
export function Label({ children, ...p }) { return _jsx("label", { ...p, className: ["text-sm", p.className].join(" "), children: children }); }
