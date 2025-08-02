import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { exec } from "child_process";

function getCurrentGitHubRepo(mcpServer: McpServer) {
  mcpServer.registerTool(
    "get-current-github-repo",
    {
      title: "Get Current GitHub Repository",
      description:
        "Retrieve the current GitHub repository URL from the local git configuration.",
      inputSchema: {}
    },
    async () => {
      const getRepoCommand = `git config --get remote.origin.url`;

      const repoUrl = await new Promise<string>((resolve, reject) => {
        exec(
          getRepoCommand,
          (error: Error | null, stdout: string, stderr: string) => {
            if (error) {
              reject(`Error executing git config: ${stderr}`);
            } else {
              resolve(stdout.trim());
            }
          }
        );
      });

      return {
        content: [
          {
            type: "text",
            text: `Current GitHub Repository URL: ${repoUrl}`
          }
        ]
      };
    }
  );
}

export default getCurrentGitHubRepo;
