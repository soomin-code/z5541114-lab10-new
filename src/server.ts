import express, { Request, Response } from "express";
import cors from "cors";

import morgan from "morgan";

import { echo } from "./echo";
import errorHandler from "middleware-http-errors";
import { addName, viewNames, clear } from "./names";
import { port, url } from "./config.json";
import { Redis } from '@upstash/redis';

// Fallback to hardcoded values if environment variables fail
const database = new Redis({
  url: "https://adjusted-iguana-8721.upstash.io",
  token: "ASIRAAIjcDFkNjkwY2ZkNzkwNTE0NDNkODEyYTNiYzE4ODZkMjYzM3AxMA"
});

const PORT: number = parseInt(process.env.PORT || port);
const SERVER_URL = `${url}:${PORT}`;

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req: Request, res: Response) => {
  console.log("Print to terminal: someone accessed our root url!");
  res.json({ message: "Welcome to Lab10 Deploy Server's root URL!" });
});

app.get("/echo/echo", (req: Request, res: Response) => {
  res.json(echo(req.query.message as string));
});

app.post("/add/name", (req: Request, res) => {
  res.json(addName(req.body.name));
});

app.get("/view/names", (req: Request, res: Response) => {
  res.json(viewNames());
});

app.delete("/clear", (req: Request, res: Response) => {
  res.json(clear());
});

app.post("/clear", (req: Request, res: Response) => {
  res.json(clear());
});

app.get("/echo/:message", (req: Request, res: Response) => {
  res.json(echo(req.params.message));
});

// Database routes for Vercel KV
app.get('/data', async (req: Request, res: Response) => {
  try {
    const data = await database.hgetall("data:names");
    res.status(200).json(data);
  } catch (error) {
    console.error('KV Error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.put('/data', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    await database.hset("data:names", { data });
    return res.status(200).json({});
  } catch (error) {
    console.error('KV Error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.use(errorHandler());

const server = app.listen(PORT, () => {
  console.log(`Server started at the URL: '${SERVER_URL}'`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Shutting down server gracefully.");
    process.exit();
  });
});
