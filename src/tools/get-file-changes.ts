import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { exec } from "child_process";
import { z } from "zod";

function registerFileChangesTool(mcpServer: McpServer) {
  mcpServer.registerTool(
    "get-git-file-changes",
    {
      title: "Get Git File Changes",
      description:
        "Get the full diff and list of changed files in the current git repository.",
      inputSchema: {
        baseBranch: z
          .string()
          .default("main")
          .describe("The base branch to compare against (default main)."),

        includeDiff: z
          .boolean()
          .default(true)
          .describe(
            "Whether to include the full diff of changes (default true)."
          ),

        maxDiffLines: z
          .number()
          .default(500)
          .describe("Maximum number of lines in the diff (default 500)."),

        workingDirectory: z
          .string()
          .default(".")
          .describe(
            "The working directory of the git repository (default current directory)."
          )
      }
    },
    async (params) => {
      const { baseBranch, includeDiff, maxDiffLines, workingDirectory } =
        params;

      const filesDiffCommand = `git diff --name-status ${baseBranch}...HEAD`;

      const filesDiffResult = await new Promise<string>((resolve, reject) => {
        exec(
          filesDiffCommand,
          { cwd: workingDirectory },
          (error: Error | null, stdout: string, stderr: string) => {
            if (error) {
              reject(`Error executing git diff: ${stderr}`);
            } else {
              resolve(stdout);
            }
          }
        );
      });

      const statDiffCommand = `git diff --stat ${baseBranch}...HEAD`;

      const statDiffResult = await new Promise<string>((resolve, reject) => {
        exec(
          statDiffCommand,
          { cwd: workingDirectory },
          (error, stdout, stderr) => {
            if (error) {
              reject(`Error executing git diff --stat: ${stderr}`);
            } else {
              resolve(stdout);
            }
          }
        );
      });

      let diffResult = "";
      let totalDiffLines = 0;
      if (includeDiff) {
        const fullDiffCommand = `git diff ${baseBranch}...HEAD`;

        const fullDiffResult = await new Promise<string>((resolve, reject) => {
          exec(
            fullDiffCommand,
            { cwd: workingDirectory },
            (error, stdout, stderr) => {
              if (error) {
                reject(`Error executing git diff: ${stderr}`);
              } else {
                resolve(stdout);
              }
            }
          );
        });

        const diffLines = fullDiffResult.split("\n").slice(0, maxDiffLines);

        totalDiffLines = diffLines.length;
        diffResult = diffLines.join("\n");

        if (diffLines.length >= maxDiffLines) {
          diffResult += `\n... (truncated to ${maxDiffLines} lines)`;
        }
      }

      const commitsCommand = `git log ${baseBranch}...HEAD --pretty=format:"%h - %an, %ar : %s"`;
      const commitsResult = await new Promise<string>((resolve, reject) => {
        exec(
          commitsCommand,
          { cwd: workingDirectory },
          (error, stdout, stderr) => {
            if (error) {
              reject(`Error executing git log: ${stderr}`);
            } else {
              resolve(stdout);
            }
          }
        );
      });

      const response = {
        baseBranch,
        filesChanged: filesDiffResult,
        statDiff: statDiffResult,
        commits: commitsResult,
        diff: diffResult,
        truncated: totalDiffLines >= maxDiffLines,
        totalDiffLines
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  );
}

export default registerFileChangesTool;
