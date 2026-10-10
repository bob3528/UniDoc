// Minimal type declarations for packages without @types
declare module "express" {
  import type { Server } from "node:http";
  type RequestHandler = (req: any, res: any, next: any) => void | Promise<void>;
  interface Request {
    body: any;
    method: string;
    path: string;
    query: Record<string, string>;
    params: Record<string, string>;
    headers: Record<string, string | undefined>;
  }
  interface Response {
    json(data: any): Response;
    sendStatus(code: number): Response;
    status(code: number): Response;
    set(field: string, value: string): Response;
    download(path: string, filename?: string): Response;
    header(field: string, value: string): Response;
  }
  interface Application {
    use(...handlers: any[]): Application;
    use(path: string, ...handlers: RequestHandler[]): Application;
    get(path: string, ...handlers: RequestHandler[]): Application;
    post(path: string, ...handlers: RequestHandler[]): Application;
    put(path: string, ...handlers: RequestHandler[]): Application;
    delete(path: string, ...handlers: RequestHandler[]): Application;
    listen(port: number, callback?: () => void): Server;
  }
  function express(): Application;
  // Static methods on express
  namespace express {
    function json(options?: { limit?: string }): RequestHandler;
    function static(root: string): RequestHandler;
    function urlencoded(options?: { extended?: boolean }): RequestHandler;
  }
  export default express;
  export { express, type Application, type Request, type Response, type RequestHandler };
}

declare module "cors" {
  import type { RequestHandler } from "express";
  const cors: RequestHandler & {
    (options?: any): RequestHandler;
  };
  export default cors;
}
