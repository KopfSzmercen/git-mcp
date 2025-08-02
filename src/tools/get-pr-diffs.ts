import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

function getPrDiffsTool(mcpServer: McpServer) {
  mcpServer.registerTool(
    "get-pr-diffs",
    {
      title: "Get PR Diffs",
      description:
        "Get the full diff and list of changed files in a pull request.",
      inputSchema: {
        owner: z.string().describe("The owner of the repository."),
        repo: z.string().describe("The name of the repository."),
        pullNumber: z.number()
      }
    },
    async (params) => {
      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

      const { owner, repo, pullNumber } = params;

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

        const headSha = pullRequestData.data.head.sha;

        const filesContentsPromises = prFilesResponse.data
          .filter((file) => file.status !== "removed")
          .map(async (file) => {
            const { data: fileContentData } =
              await octokit.rest.repos.getContent({
                owner,
                repo,
                path: file.filename,
                ref: headSha
              });

            if ("content" in fileContentData) {
              const content = Buffer.from(
                fileContentData.content,
                "base64"
              ).toString("utf-8");

              return {
                filename: file.filename,
                content,
                status: file.status,
                patch: file.patch || "No patch available"
              };
            }

            return {
              filename: file.filename,
              content: "Cannot retrieve content for this file",
              status: file.status,
              patch: file.patch || "No patch available"
            };
          });

        const filesContents = await Promise.all(filesContentsPromises);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filesContents, null, 2)
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

export default getPrDiffsTool;
