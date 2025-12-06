import { jsx as _jsx } from "react/jsx-runtime";
export const Tabs = ({ children, className }) => _jsx("div", { className: className, children: children });
export const TabsList = ({ children, className }) => _jsx("div", { className: className, children: children });
export const TabsTrigger = ({ children, className, onClick }) => _jsx("button", { className: className, onClick: onClick, children: children });
export const TabsContent = ({ children, className }) => _jsx("div", { className: className, children: children });
