import React from "react";
export function Badge({children, className}:{children:any; className?:string}) { return <span className={className} style={{padding:"2px 6px",border:"1px solid #ccc",borderRadius:6,fontSize:12}}>{children}</span>; }
