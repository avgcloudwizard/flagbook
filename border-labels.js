// Prefer a label inside its country; otherwise find a clear tag with a leader.
export function layoutRouteLabels(items,width,height){
  const placed=[],gap=4;
  const fits=b=>b.x>=6&&b.y>=6&&b.x+b.width<=width-6&&b.y+b.height<=height-6&&!placed.some(a=>b.x<a.x+a.width+gap&&b.x+b.width+gap>a.x&&b.y<a.y+a.height+gap&&b.y+b.height+gap>a.y);
  for(const item of [...items].sort((a,b)=>Number(b.inside)-Number(a.inside))){
    const w=Math.min(item.width,width-12),h=19;
    let box={x:item.anchor[0]-w/2,y:item.anchor[1]-h/2,width:w,height:h},leader=!item.inside;
    if(!item.inside||!fits(box)){
      leader=true;const choices=[];
      for(let y=8;y<=height-h-8;y+=23)for(let x=8;x<=width-w-8;x+=12){
        const b={x,y,width:w,height:h};if(fits(b))choices.push(b);
      }
      choices.sort((a,b)=>Math.hypot(a.x+w/2-item.anchor[0],a.y+h/2-item.anchor[1])-Math.hypot(b.x+w/2-item.anchor[0],b.y+h/2-item.anchor[1]));
      box=choices.find(b=>Math.hypot(b.x+w/2-item.anchor[0],b.y+h/2-item.anchor[1])>=25)||choices[0]||box;
    }
    placed.push({...item,...box,leader});
  }
  return placed;
}
