import { jsx as _jsx } from "react/jsx-runtime";
export function Card({ children, className, ...p }) { return _jsx("div", { ...p, className: ["border rounded-lg", className].join(" "), children: children }); }
export const CardHeader = ({ children, className }) => _jsx("div", { className: ["p-3 border-b", className].join(" "), children: children });
export const CardTitle = ({ children, className }) => _jsx("div", { className: ["font-semibold", className].join(" "), children: children });
export const CardContent = ({ children, className }) => _jsx("div", { className: ["p-3", className].join(" "), children: children });
export const CardFooter = ({ children, className }) => _jsx("div", { className: ["p-3 border-t flex gap-2", className].join(" "), children: children });
