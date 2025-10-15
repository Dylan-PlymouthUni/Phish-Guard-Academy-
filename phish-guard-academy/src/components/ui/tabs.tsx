import React from "react";
type AnyProps = { children:any; className?:string; value?:string; onClick?:()=>void };
export const Tabs=({children,className}:AnyProps)=> <div className={className}>{children}</div>;
export const TabsList=({children,className}:AnyProps)=> <div className={className}>{children}</div>;
export const TabsTrigger=({children,className,onClick}:AnyProps)=> <button className={className} onClick={onClick}>{children}</button>;
export const TabsContent=({children,className}:AnyProps)=> <div className={className}>{children}</div>;
