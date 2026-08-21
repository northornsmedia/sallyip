"use client";
import {Children,type CSSProperties,type ReactNode} from "react";import {cn} from "@/lib/utils";
export function OrbitingCircles({children,className,iconSize=40,radius=140,reverse=false,speed=1}:{children:ReactNode;className?:string;iconSize?:number;radius?:number;reverse?:boolean;speed?:number}){const items=Children.toArray(children);return <div className={cn("orbiting-circles",reverse&&"orbit-reverse",className)} style={{"--orbit-radius":`${radius}px`,"--orbit-duration":`${20/speed}s`} as CSSProperties}>{items.map((child,index)=><div className="orbit-item" key={index} style={{width:iconSize,height:iconSize,"--orbit-index":index,"--orbit-count":items.length} as CSSProperties}><span>{child}</span></div>)}</div>}
export default OrbitingCircles;
