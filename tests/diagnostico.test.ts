import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateDiagnostic} from '../src/lib/diagnostico';
test('diagnóstico calcula no servidor os limites e o eixo mais frágil',()=>{
  const low=calculateDiagnostic(Array(10).fill(1)),high=calculateDiagnostic(Array(10).fill(4));
  assert.equal(low.totalScore,10);assert.equal(low.level.level,1);assert.equal(low.axesStats[0].percentage,5);
  assert.equal(high.totalScore,40);assert.equal(high.level.level,4);assert.equal(high.axesStats[0].percentage,100);
  const mixed=calculateDiagnostic([4,4,4,4,4,4,1,1,4,4]);assert.equal(mixed.bottleneck.axisId,3);
});
