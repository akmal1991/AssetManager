import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve static files in production
const publicPath = path.resolve(__dirname, "../../portal/dist/public");
app.use(express.static(publicPath));

// Fallback for SPA routing
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.method !== "GET") {
    return next();
  }
  res.sendFile(path.join(publicPath, "index.html"));
});

export default app;
