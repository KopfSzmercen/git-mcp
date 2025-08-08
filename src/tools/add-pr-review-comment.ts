import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as dotenv from "dotenv";

//https://docs.github.com/en/rest/issues/comments?apiVersion=2022-11-28#create-an-issue-comment

function addPrReviewCommentTool(mcpServer: McpServer) {
  mcpServer.registerTool(
    "add-pr-review-comment",
    {
      title: "Add PR Review Comment",
      description:
        "Add a comment to a pull request review. This is useful for providing feedback on specific lines of code.",
      inputSchema: {
        owner: z
          .string()
          .describe(
            "The account owner of the repository. The name is not case sensitive."
          ),

        repo: z
          .string()
          .describe(
            "The name of the repository without the .git extension. The name is not case sensitive."
          ),

        pullNumber: z.number().describe("The pull request number."),

        commitId: z
          .string()
          .describe("The SHA of the commit needing a comment. "),

        path: z
          .string()
          .describe(
            "The relative path to the file that necessitates a comment."
          ),

        fileCodeReview: z
          .string()
          .describe(
            "A detailed code review of the file which will be summarized and added as a comment."
          )
      }
    },
    async (params) => {
      dotenv.config();

      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: process.env.GITHUB_PAT_PR });

      const { owner, repo, pullNumber, commitId, path, fileCodeReview } =
        params;

      try {
        const pullRequestData = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: pullNumber
        });

        if (pullRequestData.data.state !== "open") {
          return {
            content: [
              {
                type: "text",
                text: `Pull request #${pullNumber} is not open.`
              }
            ]
          };
        }

        const response = await octokit.rest.pulls.createReviewComment({
          owner,
          repo,
          pull_number: pullNumber,
          body: fileCodeReview,
          commit_id: commitId,
          path,
          subject_type: "file"
        });

        return {
          content: [
            {
              type: "text",
              text: `Comment added successfully: ${response.data.html_url}`
            }
          ]
        };
      } catch (error) {
        console.error("Error adding comment:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error while adding a comment: ${
                error instanceof Error ? error.message : String(error)
              }`
            }
          ]
        };
      }
    }
  );
}

export default addPrReviewCommentTool;
