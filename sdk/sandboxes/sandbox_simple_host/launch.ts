import { createServer } from "http";
import { parse } from "url";
import next from "next";

export {};

function main() {
  const dev = process.env.NODE_ENV !== "production";
  const app = next({ dev });
  const handle = app.getRequestHandler();
  const port = 3200;

  app.prepare().then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    }).listen(port);

    console.info("NODE_ENV: %s", process.env.NODE_ENV);
    console.info(`Server listening at http://localhost:${port}`);
  });
}

main();
