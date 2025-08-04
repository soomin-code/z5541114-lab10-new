import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";

import morgan from "morgan";

import { echo } from "./echo";
import errorHandler from "middleware-http-errors";
import { DATABASE_FILE, setData, addName, viewNames, clear } from "./names";
import { port, url } from "./config.json";
import { Redis } from '@upstash/redis';

// Replace this with your KV_REST_API_URL
const KV_REST_API_URL = "https://adjusted-iguana-8721.upstash.io";
// Replace this with your KV_REST_API_TOKEN
const KV_REST_API_TOKEN = "ASIRAAIjcDFkNjkwY2ZkNzkwNTE0NDNkODEyYTNiYzE4ODZkMjYzM3AxMA";

const database = new Redis({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
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
  const data = await database.hgetall("data:names");
  res.status(200).json(data);
});

app.put('/data', async (req: Request, res: Response) => {
  const { data } = req.body;
  await database.hset("data:names", { data });
  return res.status(200).json({});
});

app.use(errorHandler());

const server = app.listen(PORT, () => {
  // Initialize empty datastore for Vercel deployment
  setData({ names: [] });

  console.log(`Server started at the URL: '${SERVER_URL}'`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Shutting down server gracefully.");
    process.exit();
  });
});
