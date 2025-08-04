import express, { Request, Response } from "express";
import cors from "cors";

import morgan from "morgan";

import { echo } from "./echo";
import errorHandler from "middleware-http-errors";
import { addName, viewNames, clear } from "./names";
import { port, url } from "./config.json";

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

// Test route for debugging
app.get('/test', (req: Request, res: Response) => {
  console.log('/test route accessed');
  res.status(200).json({ message: 'Test route works!' });
});

// Simple /data routes without Redis for testing
app.get('/data', (req: Request, res: Response) => {
  console.log('/data GET route accessed');
  res.status(200).json({ data: { names: [] } });
});

app.put('/data', (req: Request, res: Response) => {
  console.log('/data PUT route accessed');
  const { data } = req.body;
  console.log('Received data:', data);
  res.status(200).json({});
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
