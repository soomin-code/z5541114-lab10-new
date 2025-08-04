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

// Force rebuild to break Vercel cache - v2
// Build timestamp: 2025-08-04T13:30:00Z - Force KV environment recognition
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req: Request, res: Response) => {
  console.log("Print to terminal: someone accessed our root url!");
  // Force redeploy - KV connection fix
  res.json({ message: "Welcome to Lab10 Deploy Server's root URL!" });
});

app.get("/echo/echo", (req: Request, res: Response) => {
  res.json(echo(req.query.message as string));
});

app.post("/add/name", async (req: Request, res) => {
  try {
    const result = await addName(req.body.name);
    res.json(result);
  } catch (error) {
    console.error('Error in /add/name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/view/names", async (req: Request, res: Response) => {
  try {
    const result = await viewNames();
    res.json(result);
  } catch (error) {
    console.error('Error in /view/names:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete("/clear", async (req: Request, res: Response) => {
  try {
    const result = await clear();
    res.json(result);
  } catch (error) {
    console.error('Error in DELETE /clear:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post("/clear", async (req: Request, res: Response) => {
  try {
    const result = await clear();
    res.json(result);
  } catch (error) {
    console.error('Error in POST /clear:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/echo/:message", (req: Request, res: Response) => {
  res.json(echo(req.params.message));
});

// Test route for debugging
app.get('/test', (req: Request, res: Response) => {
  console.log('/test route accessed');
  res.status(200).json({ message: 'Test route works!' });
});

// KV 연결 테스트용 라우트 추가
app.get('/test-db', async (req: Request, res: Response) => {
  try {
    console.log('Testing KV connection...');
    await database.set("test", "hello");
    const result = await database.get("test");
    console.log('KV test result:', result);
    res.status(200).json({ status: 'connected', result });
  } catch (error) {
    console.log('KV connection error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 간단한 KV 테스트 - 더 안전한 버전
app.get('/test-kv-simple', async (req: Request, res: Response) => {
  try {
    console.log('Simple KV test starting...');
    const testResult = await database.ping();
    console.log('KV ping result:', testResult);
    res.status(200).json({ status: 'KV ping successful', result: testResult });
  } catch (error) {
    console.log('KV ping failed:', error);
    res.status(200).json({ status: 'KV ping failed', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// KV Database routes - 메모리와 KV 연동
app.get('/data', async (req: Request, res: Response) => {
  try {
    console.log('Loading data from KV to memory...');
    const kvData = await database.hgetall("data:names");
    if (kvData && kvData.data) {
      const parsedData = JSON.parse(kvData.data as string);
      console.log('KV data loaded:', parsedData);
      // 메모리에 로드
      setData(parsedData);
      res.status(200).json({ data: parsedData });
    } else {
      console.log('No KV data found, using empty data');
      res.status(200).json({ data: { names: [] } });
    }
  } catch (error) {
    console.error('KV Load Error:', error);
    res.status(200).json({ data: { names: [] } });
  }
});

app.put('/data', async (req: Request, res: Response) => {
  try {
    console.log('Saving data to both memory and KV...');
    const { data } = req.body;
    // 메모리에 저장
    setData(data);
    // KV에 저장
    await database.hset("data:names", { data: JSON.stringify(data) });
    console.log('Data saved to both memory and KV successfully');
    return res.status(200).json({});
  } catch (error) {
    console.error('KV Save Error:', error);
    // KV 실패해도 메모리는 저장됨
    setData(req.body.data);
    res.status(200).json({});
  }
});

// Debug: List all registered routes
app.get('/debug-routes', (req: Request, res: Response) => {
  const routes: any[] = [];
  (app as any)._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  res.json({ routes });
});

// 환경변수 디버깅용 라우트 (중요 정보는 마스킹)
app.get('/debug-env', (req: Request, res: Response) => {
  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    res.status(200).json({
      hasKvUrl: !!kvUrl,
      hasKvToken: !!kvToken,
      kvUrlPrefix: kvUrl ? kvUrl.substring(0, 20) + '...' : 'NOT_SET',
      kvTokenPrefix: kvToken ? kvToken.substring(0, 10) + '...' : 'NOT_SET',
      nodeEnv: process.env.NODE_ENV || 'not_set'
    });
  } catch (error) {
    res.status(500).json({ error: 'Debug error' });
  }
});

// 매우 간단한 KV ping 테스트
app.get('/ping-kv', async (req: Request, res: Response) => {
  try {
    console.log('=== KV PING TEST START ===');
    console.log('KV URL:', process.env.KV_REST_API_URL ? 'SET' : 'NOT_SET');
    console.log('KV TOKEN:', process.env.KV_REST_API_TOKEN ? 'SET' : 'NOT_SET');
    
    const startTime = Date.now();
    const result = await database.ping();
    const endTime = Date.now();
    
    console.log('KV PING SUCCESS:', result, `(${endTime - startTime}ms)`);
    
    res.status(200).json({ 
      success: true, 
      result, 
      responseTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('=== KV PING FAILED ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(200).json({ 
      success: false, 
      error: error.message,
      errorType: error.constructor.name,
      timestamp: new Date().toISOString()
    });
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
