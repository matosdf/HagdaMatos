import data from '../../public/assets/data/diagnostico.json';
export function calculateDiagnostic(answers:number[]){
  const totalScore=answers.reduce((sum,n)=>sum+n,0);
  const level=data.levels.find(level=>totalScore>=level.min&&totalScore<=level.max)!;
  const axesStats=Object.entries(data.axes).map(([id,config])=>{
    const sum=config.questionIndices.reduce((n,index)=>n+answers[index],0);
    const maxScore=config.questionIndices.length*4;
    const average=sum/config.questionIndices.length;
    return {axisId:Number(id),config,score:sum,maxScore,average,percentage:Math.max(5,Math.round(((average-1)/3)*100))};
  });
  const bottleneck=[...axesStats].sort((a,b)=>a.average-b.average)[0];
  return {totalScore,level,axesStats,bottleneck};
}
