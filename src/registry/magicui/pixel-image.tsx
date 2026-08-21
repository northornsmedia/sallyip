"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type PixelImageProps = {
  src: string;
  alt?: string;
  className?: string;
  customGrid?: { rows: number; cols: number };
  grayscaleAnimation?: boolean;
};

export function PixelImage({ src, alt="", className, customGrid={rows:6,cols:8}, grayscaleAnimation=false }:PixelImageProps){
  const {rows,cols}=customGrid;
  return <motion.div className={cn("pixel-image",grayscaleAnimation&&"pixel-grayscale",className)} initial="rest" whileInView="visible" whileHover="hover" viewport={{once:true,amount:.25}} role="img" aria-label={alt}>
    <img src={src} alt="" aria-hidden="true"/>
    <div className="pixel-grid" style={{gridTemplateColumns:`repeat(${cols},1fr)`,gridTemplateRows:`repeat(${rows},1fr)`}}>
      {Array.from({length:rows*cols},(_,index)=>{const row=Math.floor(index/cols),col=index%cols;return <motion.span key={index} style={{backgroundImage:`url(${src})`,backgroundSize:`${cols*100}% ${rows*100}%`,backgroundPosition:`${cols===1?0:(col/(cols-1))*100}% ${rows===1?0:(row/(rows-1))*100}%`}} variants={{rest:{opacity:0,scale:.82},visible:{opacity:1,scale:1,transition:{delay:(row+col)*.045,duration:.55,ease:[.22,1,.36,1]}},hover:{scale:1.04,transition:{delay:(rows-row+col)*.012,duration:.22}}}}/>})}
    </div>
  </motion.div>
}

export default PixelImage;
