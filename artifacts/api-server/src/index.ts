import app from "./app";
import { initializeDatabase } from "@workspace/db";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initializeDatabase();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
