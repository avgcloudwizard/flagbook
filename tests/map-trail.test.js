import test from 'node:test';
import assert from 'node:assert/strict';
import {outcome,validStops,guidance} from '../map-trail.js';
test('geographic feedback takes the short arc across the date line',()=>{
 assert.deepEqual(guidance([0,179],[0,-179]),{km:220,direction:'east'});
 assert.deepEqual(guidance([0,-179],[0,179]),{km:220,direction:'west'});
 assert.deepEqual(guidance([60,25],[60,25]).km,0);
 assert.equal(guidance([0,0],[-45,0]).direction,'south');
});
test('trail restoration rejects duplicate countries, forged outcomes and overlong trails',()=>{
 const catalog=new Set(['br','pe','ca','in']),stop={code:'br',outcome:'clean'};
 assert.ok(validStops([stop,{code:'pe',outcome:'found'},{code:'ca',outcome:'revealed'}],catalog));
 for(const seq of [[stop,stop],[{code:'AQ',outcome:'clean'}],[{...stop,outcome:'won'}],[null],null,Array(4).fill(stop)])assert.equal(validStops(seq,catalog),false);
 assert.equal(outcome(false,0,false),'clean');assert.equal(outcome(false,1,false),'found');assert.equal(outcome(false,0,true),'found');assert.equal(outcome(true,0,false),'revealed');
});
