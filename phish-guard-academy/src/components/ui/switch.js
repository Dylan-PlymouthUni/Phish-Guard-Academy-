import { jsx as _jsx } from "react/jsx-runtime";
export function Switch({ id, checked, onCheckedChange }) { return _jsx("input", { id: id, type: "checkbox", checked: checked, onChange: e => onCheckedChange(e.target.checked) }); }
