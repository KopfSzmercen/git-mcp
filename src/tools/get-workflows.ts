import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Database, IDatabase } from "../database";
import { z } from "zod";

const database: IDatabase = new Database();

function getWorkflowsTool(mcpServer: McpServer) {
  mcpServer.registerTool(
    "get_last_workflows",
    {
      title: "Summarize Last Workflows",
      description: "Get the last workflows from the GitHub events database.",
      inputSchema: {
        limit: z
          .number()
          .default(10)
          .describe("The maximum number of workflows to retrieve (default 10).")
      }
    },
    async (params) => {
      const { limit } = params;

      try {
        const workflows = await database.getManyWorkflows(limit);

        console.log(workflows);

        if (workflows.length === 0) {
          return {
            content: [
              { type: "text", text: "No workflows found." },
              { type: "text", text: JSON.stringify(workflows, null, 2) }
            ]
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(workflows, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: "Error fetching workflows" }]
        };
      }
    }
  );
}

export default getWorkflowsTool;
