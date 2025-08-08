import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function reviewSingleFileTool(mcpServer: McpServer) {
  mcpServer.registerTool(
    "review-single-file",
    {
      title: "Review Single File",
      description: `Review a single file in a pull request which is unrelated to other changes. 
      We can use it to review a file that we know has no logical connection to other changes in the pull request.`,
      inputSchema: {
        owner: z.string().describe("The owner of the repository."),
        repo: z.string().describe("The name of the repository."),
        pullNumber: z.number().describe("The pull request number."),
        filename: z.string().describe("The name of the file to review.")
      }
    },
    async (params) => {
      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
      const { owner, repo, pullNumber, filename } = params;

      try {
        const pullRequestData = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: pullNumber
        });

        const prFilesResponse = await octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: pullNumber
        });

        const file = prFilesResponse.data.find(
          (file) => file.filename === filename
        );

        const headSha = pullRequestData.data.head.sha;

        if (!file) {
          return {
            content: [
              {
                type: "text",
                text: `File ${filename} not found in pull request #${pullNumber}.`
              }
            ]
          };
        }

        const { data: fileContentData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.filename,
          ref: headSha
        });

        if (!("content" in fileContentData)) {
          return {
            content: [
              {
                type: "text",
                text: `File ${filename} does not have content available.`
              }
            ]
          };
        }

        const content = Buffer.from(fileContentData.content, "base64").toString(
          "utf-8"
        );

        const aiResponseResult = await mcpServer.server.createMessage({
          messages: [
            {
              role: "assistant",
              content: {
                type: "text",
                text: `Act as an experienced programmer. You are excellent at reviewing code and providing feedback.
                You will be reviewing a single file in a pull request that is unrelated to other changes.
                Rules:
                - Focus only on the file provided.
                - Provide constructive feedback.
                - Do not reference other files or changes in the pull request.
                - Provide suggestions for improvements, if applicable.
                - If the file is well-written, acknowledge it.
                - If the file has issues, point them out clearly.
                `
              }
            },
            {
              role: "user",
              content: {
                type: "text",
                text: `Review the following file in the pull request #${pullNumber} 

                Filename: ${file.filename}
                <content>
                  ${content}
                </content>

                <patch>
                  ${file.patch || "No patch available"}
                </patch>
                `
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
                text: "Failed to generate review for the file."
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: aiResponseResult.content?.text || "No response from AI."
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching PR data: ${
                error instanceof Error ? error.message : String(error)
              }`
            }
          ]
        };
      }
    }
  );
}

export default reviewSingleFileTool;
