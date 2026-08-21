"use client";
import {motion,useScroll,useTransform,type MotionValue} from "framer-motion";import ReactLenis from "lenis/react";import {useRef,type ReactNode} from "react";import {cn} from "@/lib/utils";import {BookOpen,Database,FileCheck2,FlaskConical,Layers3,Scale,Trophy} from "lucide-react";
type CharacterProps={char:string;index:number;centerIndex:number;scrollYProgress:MotionValue<number>};
export function CharacterV1({char,index,centerIndex,scrollYProgress}:CharacterProps){const isSpace=char===" ",distance=index-centerIndex,x=useTransform(scrollYProgress,[0,.3],[distance*24,0]),rotateX=useTransform(scrollYProgress,[0,.3],[distance*12,0]),opacity=useTransform(scrollYProgress,[0,.22],[.38,1]);return <motion.span className={cn("scroll-character",isSpace&&"scroll-space")} style={{x,rotateX,opacity}}>{char}</motion.span>}
function IconCharacter({children,index,centerIndex,progress,rotate=false}:{children:ReactNode;index:number;centerIndex:number;progress:MotionValue<number>;rotate?:boolean}){const distance=index-centerIndex,x=useTransform(progress,[0,.35],[distance*55,0]),y=useTransform(progress,[0,.35],[rotate?-Math.abs(distance)*18:Math.abs(distance)*25,0]),scale=useTransform(progress,[0,.35],[.72,1]),rotation=useTransform(progress,[0,.35],[rotate?distance*35:0,0]);return <motion.div className="scroll-tech-icon" style={{x,y,scale,rotate:rotation}}>{children}</motion.div>}
export function CharacterV2(props:CharacterProps){return <CharacterV1 {...props}/>};export function CharacterV3(props:CharacterProps){return <CharacterV1 {...props}/>};
export function ScrollAssembleText({text,className=""}:{text:string;className?:string}){
  const words=text.split(" ");
  const center=Math.floor(text.length/2);
  let cursor=0;
  return <motion.h2 className={cn("scroll-assemble-text",className)} style={{perspective:"700px"}} initial="scattered" whileInView="assembled" viewport={{once:false,amount:.55}}>
    {words.map((word,wordIndex)=>{
      const start=cursor;
      cursor+=word.length+1;
      return <span className="assemble-word" key={wordIndex}>
        {word.split("").map((char,letterIndex)=>{
          const index=start+letterIndex;
          const distance=index-center;
          return <motion.span key={letterIndex} className="scroll-character" variants={{scattered:{x:distance*25,y:Math.abs(distance)*2.5,rotateX:distance*15,rotateZ:distance*.7,opacity:.08,filter:"blur(7px)"},assembled:{x:0,y:0,rotateX:0,rotateZ:0,opacity:1,filter:"blur(0px)",transition:{delay:Math.abs(distance)*.018,type:"spring",stiffness:125,damping:19,mass:.65}}}}>{char}</motion.span>;
        })}
      </span>;
    })}
    <motion.i className="assemble-scan" variants={{scattered:{scaleX:0,opacity:0},assembled:{scaleX:1,opacity:[0,1,0],transition:{duration:1.15,delay:.15}}}}/>
  </motion.h2>;
}
const icons=[<Database/>,<Scale/>,<FlaskConical/>,<FileCheck2/>,<Layers3/>,<Trophy/>];
function Bracket({flip=false}:{flip?:boolean}){return <svg viewBox="0 0 27 78" className={flip?"scroll-bracket flip":"scroll-bracket"}><path d="M26.52 77.21h-5.75c-6.83 0-12.38-5.56-12.38-12.38V48.38C8.39 43.76 4.63 40 .01 40v-4c4.62 0 8.38-3.76 8.38-8.38V12.4C8.38 5.56 13.94 0 20.77 0h5.75v4h-5.75c-4.62 0-8.38 3.76-8.38 8.38V27.6c0 4.34-2.25 8.17-5.64 10.38 3.39 2.21 5.64 6.04 5.64 10.38v16.45c0 4.62 3.76 8.38 8.38 8.38h5.75v4.02Z"/></svg>}
export function Skiper31(){const first=useRef<HTMLDivElement>(null),second=useRef<HTMLDivElement>(null),third=useRef<HTMLDivElement>(null);const{scrollYProgress:p1}=useScroll({target:first,offset:["start end","end start"]}),{scrollYProgress:p2}=useScroll({target:second,offset:["start end","end start"]}),{scrollYProgress:p3}=useScroll({target:third,offset:["start end","end start"]});const text="research becomes intelligence",characters=text.split(""),center=Math.floor(characters.length/2),iconCenter=Math.floor(icons.length/2);return <ReactLenis root options={{lerp:.085,duration:1.2}}><section className="text-scroll-sequence"><div className="scroll-hint"><span>SCROLL TO ASSEMBLE</span><i/></div><div ref={first} className="scroll-scene scene-one"><div className="scroll-sticky"><small>EXPERTISE, AMPLIFIED</small><h2 style={{perspective:"600px"}}>{characters.map((char,index)=><CharacterV1 key={index} char={char} index={index} centerIndex={center} scrollYProgress={p1}/>)}</h2></div></div><div ref={second} className="scroll-scene scene-two"><div className="scroll-sticky"><p><Bracket/><span>one responsible research pipeline</span><Bracket flip/></p><div className="scroll-icons">{icons.map((icon,index)=><IconCharacter key={index} index={index} centerIndex={iconCenter} progress={p2}>{icon}</IconCharacter>)}</div></div></div><div ref={third} className="scroll-scene scene-three"><div className="scroll-sticky"><p><Bracket/><span>from source to specialist model</span><Bracket flip/></p><div className="scroll-icons final-icons">{icons.map((icon,index)=><IconCharacter rotate key={index} index={index} centerIndex={iconCenter} progress={p3}>{icon}</IconCharacter>)}</div><div className="scroll-outcome"><BookOpen/><span>Traceable knowledge</span><i/><Layers3/><span>Private adapter</span></div></div></div></section></ReactLenis>}
export default Skiper31;
