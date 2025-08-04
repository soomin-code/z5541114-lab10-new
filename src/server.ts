import express, { Request, Response } from "express";
import cors from "cors";

import morgan from "morgan";
import { Redis } from '@upstash/redis';

import { echo } from "./echo";
import errorHandler from "middleware-http-errors";
import { addName, viewNames, clear, setData } from "./names";
import { port, url } from "./config.json";

const PORT: number = parseInt(process.env.PORT || port);
const SERVER_URL = `${url}:${PORT}`;

// KV Database connection using explicit configuration (same as names.ts)
const database = new Redis({
  url: process.env.KV_REST_API_URL || 'https://adjusted-iguana-8721.upstash.io',
  token: process.env.KV_REST_API_TOKEN || 'ASIRAAIjcDFkNjkwY2ZkNzkwNTE0NDNkODEyYTNiYzE4ODZkMjYzM3AxMA',
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to Lab10 Deploy Server's root URL!" });
});

app.get("/echo/echo", (req: Request, res: Response) => {
  res.json(echo(req.query.message as string));
});

app.post("/add/name", async (req: Request, res) => {
  try {
    const result = await addName(req.body.name);
    res.json(result);
  } catch (error: any) {
    // HTTPError인 경우 원래 상태 코드 사용
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      res.status(statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get("/view/names", async (req: Request, res: Response) => {
  try {
    const result = await viewNames();
    res.json(result);
  } catch (error: any) {
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      res.status(statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.delete("/clear", async (req: Request, res: Response) => {
  try {
    const result = await clear();
    res.json(result);
  } catch (error: any) {
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      res.status(statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.post("/clear", async (req: Request, res: Response) => {
  try {
    const result = await clear();
    res.json(result);
  } catch (error: any) {
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      res.status(statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get("/echo/:message", (req: Request, res: Response) => {
  res.json(echo(req.params.message));
});

// KV Database routes - 메모리와 KV 연동
app.get('/data', async (req: Request, res: Response) => {
  try {
    const kvData = await database.hgetall("data:names");
    if (kvData && kvData.data) {
      const parsedData = JSON.parse(kvData.data as string);
      // 메모리에 로드
      setData(parsedData);
      res.status(200).json({ data: parsedData });
    } else {
      res.status(200).json({ data: { names: [] } });
    }
  } catch (error) {
    res.status(200).json({ data: { names: [] } });
  }
});

app.put('/data', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    // 메모리에 저장
    setData(data);
    // KV에 저장
    await database.hset("data:names", { data: JSON.stringify(data) });
    return res.status(200).json({});
  } catch (error) {
    // KV 실패해도 메모리는 저장됨
    setData(req.body.data);
    res.status(200).json({});
  }
});

app.use(errorHandler());

const server = app.listen(PORT, () => {
  console.log(`Server started at the URL: '${SERVER_URL}'`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Shutting down server gracefully.");
  });
});
