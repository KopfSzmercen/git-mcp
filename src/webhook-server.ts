import { Request, Response } from "express";
import { Database, IDatabase } from "./database";

const database: IDatabase = new Database();

const express = require("express");
const router = express.Router();

router.post("/webhook", async (req: Request, res: Response) => {
  const payload = JSON.parse(req.body.payload);

  console.log("Received webhook " + new Date().toISOString());

  await database.save(payload);

  res.status(200);
});

router.get("/workflows", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const workflows = await database.getManyWorkflows(limit);
    res.status(200).json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server is running on port ${PORT}`);
});
