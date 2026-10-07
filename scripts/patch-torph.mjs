import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../vendor/torph.mjs", import.meta.url);
let src = readFileSync(path, "utf8");

if (src.includes("function ls(e)")) {
  console.log("torph already patched for local FLIP coords");
  process.exit(0);
}

const patches = [
  [
    `function K(e){let t=getComputedStyle(e).transform;if(!t||t==="none")return {tx:0,ty:0};let n=t.match(/matrix\\(([^)]+)\\)/);if(!n)return {tx:0,ty:0};let o=n[1].split(",").map(Number);return {tx:o[4]||0,ty:o[5]||0}}`,
    `function K(e){let t=getComputedStyle(e).transform;if(!t||t==="none")return {tx:0,ty:0};let n=t.match(/matrix\\(([^)]+)\\)/);if(n){let o=n[1].split(",").map(Number);return {tx:o[4]||0,ty:o[5]||0}}let d=t.match(/matrix3d\\(([^)]+)\\)/);if(d){let o=d[1].split(",").map(Number);return {tx:o[12]||0,ty:o[13]||0}}return {tx:0,ty:0}}function ls(e){let r=e.getBoundingClientRect(),w=e.offsetWidth,h=e.offsetHeight;return {sx:w>0?r.width/w:1,sy:h>0?r.height/h:1}}`,
  ],
  [
    `e.offsetWidth;let a=e.getBoundingClientRect(),c=a.width,p=a.height,u=e.animate`,
    `e.offsetWidth;let c=e.offsetWidth,p=e.offsetHeight,u=e.animate`,
  ],
  [
    `function U(e){let t=Array.from(e.children),n={},o=e.getBoundingClientRect();return t.forEach((s,i)=>{if(s.hasAttribute(S)||s.tagName==="BR")return;let r=s.getAttribute(y)||\`child-\${i}\`,a=s.getBoundingClientRect(),{tx:c,ty:p}=K(s);n[r]={x:a.left-o.left-c,y:a.top-o.top-p};}),n}`,
    `function U(e){let t=Array.from(e.children),n={},o=e.getBoundingClientRect(),{sx:sx,sy:sy}=ls(e);return t.forEach((s,i)=>{if(s.hasAttribute(S)||s.tagName==="BR")return;let r=s.getAttribute(y)||\`child-\${i}\`,a=s.getBoundingClientRect(),{tx:c,ty:p}=K(s);n[r]={x:(a.left-o.left)/sx-c,y:(a.top-o.top)/sy-p};}),n}`,
  ],
  [
    `o.set(s,{left:i.left-n.left,top:i.top-n.top,width:i.width,height:i.height,opacity:r});`,
    `o.set(s,{left:(i.left-n.left)/sx,top:(i.top-n.top)/sy,width:i.width/sx,height:i.height/sy,opacity:r});`,
  ],
  [
    `function yt(e,t){let n=e.getBoundingClientRect(),o=new Map;`,
    `function yt(e,t){let n=e.getBoundingClientRect(),{sx:sx,sy:sy}=ls(e),o=new Map;`,
  ],
  [
    `createTextGroup(t,n){let o=n.getBoundingClientRect(),s=o.width,i=o.height,r,a;`,
    `createTextGroup(t,n){let s=n.offsetWidth,i=n.offsetHeight,r,a;`,
  ],
];

for (const [from, to] of patches) {
  if (!src.includes(from)) {
    console.error("patch-torph: pattern not found, skip one patch");
    continue;
  }
  src = src.replace(from, to);
}

writeFileSync(path, src);
console.log("patched vendor/torph.mjs for local FLIP coords");
