// Behind nginx the Node server sees localhost:3105, so URLs derived from
// req.url would redirect browsers to localhost. Build them from the
// forwarded host instead.
export function externalUrl(req: Request, path: string): URL {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "new.nexis.revsports.ca";
  return new URL(path, `https://${host}`);
}
