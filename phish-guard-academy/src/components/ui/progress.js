import { jsx as _jsx } from "react/jsx-runtime";
export function Progress({ value, className }) { return _jsx("div", { className: className, style: { border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }, children: _jsx("div", { style: { width: `${Math.max(0, Math.min(100, value))}%`, height: 8, background: "#888" } }) }); }
