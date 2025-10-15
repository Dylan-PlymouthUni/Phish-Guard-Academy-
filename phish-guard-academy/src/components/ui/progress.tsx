import React from "react";
export function Progress({value,className}:{value:number;className?:string}){return <div className={className} style={{border:"1px solid #ddd",borderRadius:6,overflow:"hidden"}}><div style={{width:`${Math.max(0,Math.min(100,value))}%`,height:8,background:"#888"}}/></div>;}
