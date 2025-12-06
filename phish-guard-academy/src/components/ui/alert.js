import { jsx as _jsx } from "react/jsx-runtime";
export const Alert = ({ children, className }) => (_jsx("div", { className: className, style: { border: "1px solid #ddd", padding: 8, borderRadius: 6, background: "#f7f7f7" }, children: children }));
export const AlertTitle = ({ children }) => _jsx("div", { style: { fontWeight: 600, marginBottom: 4 }, children: children });
export const AlertDescription = ({ children }) => _jsx("div", { children: children });
