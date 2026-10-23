// Long compact notation avoids both enormous digit strings and cryptic B/M suffixes.
export function gameNumber(value,unit){
  const amount=new Intl.NumberFormat('en',{notation:Math.abs(value)>=1000?'compact':'standard',compactDisplay:'long',maximumSignificantDigits:3}).format(value);
  return unit==='%'?`${amount}%`:unit==='US$'?`US$${amount}`:`${amount} ${unit}`;
}
export function topThreeEntries(item){
  const sorted=[...item.entries].sort((a,b)=>b.value-a.value);
  return sorted.length<3||sorted[2].value<=0?[]:sorted.filter(e=>e.value>=sorted[2].value);
}
export function checkTopThree(item,found,answer,match){
  const code=match(answer);if(found.includes(code))return {status:'duplicate',code};
  return {status:topThreeEntries(item).some(e=>e.code===code)?'correct':'incorrect',code};
}
