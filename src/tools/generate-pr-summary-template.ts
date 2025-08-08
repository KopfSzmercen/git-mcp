import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { join } from "path";
import { readdir, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { z } from "zod";

function registerGenerateAndSavePrSummaryTemplateTool(mcpServer: McpServer) {
  mcpServer.registerTool(
    "generate-and-save-pr-summary-template",
    {
      description:
        "Generate and save PR summary template based on the change type.",
      inputSchema: {
        changeType: z.enum(["feature", "bugfix", "chore", "docs"])
      }
    },
    async ({ changeType }) => {
      const aiResponseResult = await mcpServer.server.createMessage({
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `Act as a PR summary template generator. You generate cohesive and structured templates that include sections for the summary, motivation, changes made, and any additional notes.
              The template should be in markdown format and ready to be saved as a file.`
            }
          },
          {
            role: "user",
            content: {
              type: "text",
              text: `Generate a PR summary template for a ${changeType} change.`
            }
          }
        ],
        maxTokens: 1000
      });

      if (
        !aiResponseResult ||
        !aiResponseResult.content ||
        aiResponseResult.content.type !== "text"
      ) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to generate and save PR summary template."
            }
          ]
        };
      }

      const fileName = `pr-summary-template-${changeType}.md`;
      const filePath = join(__dirname, "../", "pr-summaries", fileName);

      const directoryExists = existsSync(
        join(__dirname, "../", "pr-summaries")
      );

      if (!directoryExists) {
        await mkdir(join(__dirname, "../", "pr-summaries"), {
          recursive: true
        });
      }

      //if exists, replace
      const filesInFolder = await readdir(
        join(__dirname, "../", "pr-summaries")
      );

      if (filesInFolder.includes(fileName)) {
        await writeFile(filePath, aiResponseResult.content.text, "utf-8");
      } else {
        await writeFile(filePath, aiResponseResult.content.text, "utf-8");
      }

      return {
        content: [
          {
            type: "text",
            text: "Pr summary template generated and saved successfully."
          }
        ]
      };
    }
  );
}

export default registerGenerateAndSavePrSummaryTemplateTool;
