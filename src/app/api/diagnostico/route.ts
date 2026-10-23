import handler from '@/lib/legacy/diagnostico.cjs';
import { failure,json,readJson } from '@/lib/http';
import { z } from 'zod';
import { calculateDiagnostic } from '@/lib/diagnostico';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    const input=z.object({lead:z.object({name:z.string().trim().min(2).max(150),email:z.email().max(200),
      phone:z.string().max(25).refine(value=>value.replace(/\D/g,'').length>=10),
      companySize:z.enum(['1 a 10','11 a 50','50+'])}),answers:z.array(z.number().int().min(1).max(4)).length(10)}).parse(await readJson(request));
    const body={...input,results:calculateDiagnostic(input.answers)};
    let status=200,result:unknown={};
    const response={setHeader(){},status(code:number){status=code;return response;},
      json(data:unknown){result=data;return response;},end(){return response;}};
    await handler({method:'POST',body,headers:Object.fromEntries(request.headers)},response);
    return json(result,status);
  }catch(error){return failure(error);}
}
