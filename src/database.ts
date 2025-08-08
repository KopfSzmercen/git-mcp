import { constants } from "fs";
import { access, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

export interface IDatabase {
  save(data: JSON): Promise<void>;
  get(id: string): Promise<JSON | null>;
  getManyWorkflows(limit: number): Promise<GithubWorkflowEvent[]>;
}

export interface GithubWorkflowEvent {
  action: string;
  runAttempt: number;
  name: string;
  runUrl: string;
  runId: number;
  conclusion?: string;
  steps: {
    name: string;
    status: string;
    conclusion: string;
    startedAt: string;
    completedAt: string;
  }[];
}

console.log("SECRET KEY: 12345678")

export class Database implements IDatabase {
  private readonly fileName = join(__dirname, "github-events.json");

  async save(data: JSON): Promise<void> {
    const isCollectionAlreadyInitialized = await this.isCollectionInitialized(
      this.fileName
    );

    if (!isCollectionAlreadyInitialized) {
      await writeFile(this.fileName, JSON.stringify({ githubEvents: [] }));
    }

    const content = await readFile(this.fileName, "utf-8");
    const parsedData = JSON.parse(content);
    parsedData.githubEvents.push({
      ...data,
      createdAt: new Date().toISOString()
    });
    await writeFile(this.fileName, JSON.stringify(parsedData, null, 2));
  }

  async get(id: string): Promise<JSON | null> {
    const isCollectionAlreadyInitialized = await this.isCollectionInitialized(
      this.fileName
    );

    if (!isCollectionAlreadyInitialized) {
      return null;
    }

    const content = await readFile(this.fileName, "utf-8");
    const parsedData = JSON.parse(content);
    const event = parsedData.githubEvents.find((event: any) => event.id === id);

    return event ? JSON.parse(JSON.stringify(event)) : null;
  }

  async getManyWorkflows(limit: number): Promise<GithubWorkflowEvent[]> {
    const isCollectionAlreadyInitialized = await this.isCollectionInitialized(
      this.fileName
    );

    if (!isCollectionAlreadyInitialized) {
      return [];
    }

    const content = await readFile(this.fileName, "utf-8");
    const parsedData = JSON.parse(content);

    if (!Array.isArray(parsedData.githubEvents)) {
      return [];
    }

    return (parsedData.githubEvents as unknown[])
      .filter((event: any) => event["workflow_job"])
      .sort((a: any, b: any) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, limit)
      .map((event: any) => JSON.parse(JSON.stringify(event)))
      .map((event: any) => {
        return {
          action: event.action,
          runAttempt: event.workflow_job.run_attempt,
          name: event.workflow_job.name,
          runUrl: event.workflow_job.run_url,
          runId: event.workflow_job.run_id,
          conclusion: event.workflow_job.conclusion,
          steps: event.workflow_job.steps.map((step: any) => ({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
            startedAt: step.started_at,
            completedAt: step.completed_at
          }))
        } as GithubWorkflowEvent;
      });
  }

  private async isCollectionInitialized(fileName: string): Promise<boolean> {
    try {
      await access(fileName, constants.F_OK);
      const content = await readFile(fileName, "utf-8");
      const data = JSON.parse(content);
      return Array.isArray(data.githubEvents);
    } catch {
      return false;
    }
  }
}
