import { AIError } from './ai';
export type Message={role:'user'|'assistant';text:string};
export type Attachment={mimeType:string;data:string};
export async function geminiText(instruction:string,messages:Message[],fetcher:typeof fetch=fetch,json=false,attachment?:Attachment):Promise<string>{
 const key=process.env.GEMINI_API_KEY?.trim();if(!key)throw new AIError(503,'Gemini is not configured. Add GEMINI_API_KEY to the root .env file and restart paperIN.');
 const model=process.env.GEMINI_MODEL?.trim()||'gemini-2.5-flash';let status=503,message='Gemini is temporarily unavailable.';
 for(let attempt=0;attempt<3;attempt++){let delay=500*2**attempt;
  try{
   const contents=messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.text}] as any[]}));if(attachment)contents[contents.length-1].parts.unshift({inlineData:attachment});
   const response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(30000),body:JSON.stringify({systemInstruction:{parts:[{text:instruction}]},contents,generationConfig:{temperature:0.2,maxOutputTokens:8192,...(json?{responseMimeType:'application/json'}:{})}})});
   if(response.ok){const body=await response.json() as any;const candidate=body.candidates?.[0];const text=(candidate?.content?.parts||[]).filter((p:any)=>!p.thought).map((p:any)=>p.text||'').join('');if(candidate?.finishReason==='MAX_TOKENS')throw new AIError(502,'Gemini response was too long. Ask for a shorter draft and retry.');if(!text.trim())throw new AIError(502,'Gemini returned no usable response. Rephrase your prompt and retry.');if(text.length>90000)throw new AIError(502,'Gemini output exceeded the document limit.');return text;}
   status=[401,403,404].includes(response.status)?502:response.status===400?400:response.status===429?429:503;
   message=[401,403].includes(response.status)?'Gemini rejected the API key or its permissions. Check GEMINI_API_KEY in .env.':response.status===404?'The configured Gemini model is unavailable. Check GEMINI_MODEL in .env.':response.status===400?'Gemini rejected the request. Check your model supports this file or shorten your prompt.':response.status===429?'Gemini quota or rate limit reached. Please retry later.':response.status===503?'Gemini is overloaded. Please retry shortly.':`Gemini request failed (${response.status}). Check your model and API configuration.`;
   if(![429,500,502,503,504].includes(response.status))break;
   const retry=response.headers.get('retry-after');if(retry){const sec=Number(retry);const milliseconds=Number.isFinite(sec)?sec*1000:Date.parse(retry)-Date.now();if(milliseconds>5000)throw new AIError(status,`${message} Retry after ${retry}.`);delay=Math.max(delay,milliseconds||0);}
  }catch(e){if(e instanceof AIError)throw e;status=503;message='Could not reach Gemini, or the request timed out. Check your connection and retry.';}
  if(attempt<2)await new Promise(r=>setTimeout(r,delay));
 }
 throw new AIError(status,message);
}
export async function checkModel(fetcher:typeof fetch=fetch){const key=process.env.GEMINI_API_KEY?.trim();if(!key)throw new AIError(503,'Add GEMINI_API_KEY to .env and restart paperIN.');const model=process.env.GEMINI_MODEL?.trim()||'gemini-2.5-flash';let response:Response;try{response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(10000)});}catch{throw new AIError(503,'Could not reach Gemini to verify the configured model.');}if(!response.ok)throw new AIError(response.status===429?429:502,`Gemini model verification failed (${response.status}). Check the server key and model.`);const body=await response.json() as any;if(!body.supportedGenerationMethods?.includes('generateContent'))throw new AIError(502,'The configured model does not support document generation.');return{ok:true,model,verifiedAt:new Date().toISOString()};}
