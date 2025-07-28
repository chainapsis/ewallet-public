import { createServer } from "http";
import { parse } from "url";
import next from "next";
// import { localPorts } from "@keplr-ewallet/dev-env";

export { };

const port = (function() {
  return 3000;
  // if (process.env.NODE_ENV !== "production") {
  //   return localPorts.demo_web || 3200;
  // } else {
  //   return 3000;
  // }
})();

function main() {
  const dev = process.env.NODE_ENV !== "production";
  const app = next({ dev });
  const handle = app.getRequestHandler();

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
