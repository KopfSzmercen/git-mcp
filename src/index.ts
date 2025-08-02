import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import registerPrSummaryTemplatesResource from "./resources/pr-summary-template";
import registerGenerateAndSavePrSummaryTemplateTool from "./tools/generate-pr-summary-template";
import registerFileChangesTool from "./tools/get-file-changes";
import getWorkflowsTool from "./tools/get-workflows";
import listPullRequestsTool from "./tools/list-prs";
import getPrDetailsTool from "./tools/get-pr";
import getCurrentGitHubRepo from "./tools/get-current-github-repo";

const server = new McpServer({
  name: "Test",
  version: "1.0.0",
  capabilities: {
    resources: {}
  }
});

const registerToolFunctions = [
  registerFileChangesTool,
  getWorkflowsTool,
  registerGenerateAndSavePrSummaryTemplateTool,
  listPullRequestsTool,
  getPrDetailsTool,
  getCurrentGitHubRepo
];

const registerResourceFunctions = [registerPrSummaryTemplatesResource];

for (const registerTool of registerToolFunctions) {
  registerTool(server);
}

for (const registerResource of registerResourceFunctions) {
  registerResource(server);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Server is running and listening for requests...");
}

main();
