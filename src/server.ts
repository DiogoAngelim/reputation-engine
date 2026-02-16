import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  process.stdout.write(`reputation-engine listening on :${port}\n`);
});
