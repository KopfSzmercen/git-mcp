import {
  McpServer,
  ResourceTemplate
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const prSummarriesDir = "pr-summaries";

function registerPrSummaryTemplatesResource(mcpServer: McpServer) {
  mcpServer.registerResource(
    "pr-summary-template",
    new ResourceTemplate("pr-summary-templates://{changeType}", {
      list: undefined
    }),
    {
      title: "PR Summary Templates",
      description:
        "A collection of PR summary templates for various use cases.",
      mimeType: "text/plain"
    },
    async (uri, { changeType }) => {
      const actualPath = join(__dirname, "../", prSummarriesDir);

      const folderExists = existsSync(actualPath);

      if (!folderExists) {
        return {
          contents: []
        };
      }

      const templateFiles = await readdir(actualPath);

      if (templateFiles.length === 0) {
        return {
          contents: []
        };
      }

      const matchingFile = templateFiles.find(
        (file) =>
          file.includes(`-${changeType as string}.md`) && file.endsWith(".md")
      );

      if (!matchingFile) {
        return {
          contents: []
        };
      }

      const filePath = join(actualPath, matchingFile);
      const fileContent = await readFile(filePath, "utf-8");

      return {
        contents: [
          {
            uri: uri.href,
            text: fileContent
          }
        ]
      };
    }
  );
}

export default registerPrSummaryTemplatesResource;
