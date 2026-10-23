// Endpoints retain A/B colours. Each intermediate stop has its own colour,
// including countries that touch earlier stops elsewhere along the route.
export const ROUTE_PALETTE=['#88cddd','#e8a77b','#c3a0ed','#b7d779','#e991b4','#70c8a7','#eccf6f','#92a7ed','#e0bca5','#b5dce6','#d4b9da','#b6ba7c'];
export function routeColors(path,endpoints){
  const colors=new Map(endpoints.map((c,i)=>[c,ROUTE_PALETTE[i]]));
  for(const code of path)if(!colors.has(code))colors.set(code,ROUTE_PALETTE[colors.size]);
  return colors;
}
