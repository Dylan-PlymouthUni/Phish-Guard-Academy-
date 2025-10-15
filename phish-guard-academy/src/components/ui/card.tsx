import React from "react";
export function Card({children,className,...p}:{children:any;className?:string}){return <div {...p} className={["border rounded-lg",className].join(" ")}>{children}</div>;}
export const CardHeader=({children,className}:{children:any;className?:string})=> <div className={["p-3 border-b",className].join(" ")}>{children}</div>;
export const CardTitle=({children,className}:{children:any;className?:string})=> <div className={["font-semibold",className].join(" ")}>{children}</div>;
export const CardContent=({children,className}:{children:any;className?:string})=> <div className={["p-3",className].join(" ")}>{children}</div>;
export const CardFooter=({children,className}:{children:any;className?:string})=> <div className={["p-3 border-t flex gap-2",className].join(" ")}>{children}</div>;
