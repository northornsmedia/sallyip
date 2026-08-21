"use client";
import type {HTMLAttributes} from "react";import {cn} from "@/lib/utils";
export function WarpBackground({className,children,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("warp-background",className)} {...props}><div className="warp-space"><i/><i/></div><div className="warp-grid"><span/><span/></div><div className="warp-orbit orbit-one"/><div className="warp-orbit orbit-two"/><div className="warp-content">{children}</div></div>}
export default WarpBackground;
