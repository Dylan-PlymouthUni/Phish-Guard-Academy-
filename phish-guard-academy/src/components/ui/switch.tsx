import React from "react";
export function Switch({id,checked,onCheckedChange}:{id?:string;checked:boolean;onCheckedChange:(v:boolean)=>void}){return <input id={id} type="checkbox" checked={checked} onChange={e=>onCheckedChange(e.target.checked)} />;}
