import React from "react";
export const Alert=({children, className}:{children:any; className?:string})=> (<div className={className} style={{border:"1px solid #ddd",padding:8,borderRadius:6,background:"#f7f7f7"}}>{children}</div>);
export const AlertTitle=({children}:{children:any})=> <div style={{fontWeight:600,marginBottom:4}}>{children}</div>;
export const AlertDescription=({children}:{children:any})=> <div>{children}</div>;
