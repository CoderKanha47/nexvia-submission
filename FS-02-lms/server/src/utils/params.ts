import type { Request } from 'express';

/** Express 5 types params as `string | string[]`; collapse that safely. */
export function paramStr(req: Request, key: string): string {
  const value = (req.params as Record<string, string | string[] | undefined>)[key];
  const single = Array.isArray(value) ? value[0] : value;
  if (!single) throw new Error(`Missing route param: ${key}`);
  return single;
}
