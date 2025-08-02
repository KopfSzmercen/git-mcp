import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as dotenv from "dotenv";

const GET_PULL_REQUESTS_QUERY = `
query ListPullRequests(
  $owner: String!, 
  $repo: String!, 
  $first: Int!, 
  $after: String,
  $orderBy: IssueOrder
) {
  repository(owner: $owner, name: $repo) {
    pullRequests(
      first: $first, 
      after: $after,
      orderBy: $orderBy
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        title
        state
        createdAt
        updatedAt
        author {
          login
        }
        url
        body
        comments {
          totalCount
        }
        reviews {
          totalCount
        }
        commits {
          totalCount
        }
        additions
        deletions
        changedFiles
      }
    }
  }
}
`;

function listPullRequestsTool(mcp: McpServer) {
  mcp.registerTool(
    "list-pull-requests",
    {
      title: "List Pull Requests",
      description: "List pull requests from the GitHub repository.",
      inputSchema: {
        owner: z.string().describe("The owner of the GitHub repository."),
        repo: z.string().describe("The name of the GitHub repository."),
        state: z.enum(["open", "closed", "all"]).optional(),
        base: z.string().optional(),
        sort: z.enum(["CREATED_AT", "UPDATED_AT"]).optional(),
        direction: z.enum(["asc", "desc"]).optional(),
        perPage: z
          .number()
          .default(30)
          .describe("Number of PRs per page (default 30)."),
        page: z.number().default(1).optional()
      }
    },
    async (params) => {
      dotenv.config();

      const { owner, perPage, repo, base, direction, page, sort, state } =
        params;

      let allPullRequests: any[] = [];
      let hasNextPage = true;
      let afterCursor = null;

      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

      try {
        while (hasNextPage) {
          const queryVariables: any = {
            owner,
            repo,
            first: perPage,
            after: afterCursor,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28"
            }
          };

          if (state && state !== "all") {
            queryVariables.states = [state.toUpperCase()];
          }
          if (base) {
            queryVariables.base = base;
          }
          if (sort || direction) {
            queryVariables.orderBy = {
              field: sort ? sort.toUpperCase() : "CREATED_AT",
              direction: direction ? direction.toUpperCase() : "DESC"
            };
          }

          const results = (await octokit.graphql(
            GET_PULL_REQUESTS_QUERY,
            queryVariables
          )) as any;

          const pullRequestsData = results?.repository?.pullRequests ?? [];

          allPullRequests = allPullRequests.concat(
            pullRequestsData.nodes || []
          );

          hasNextPage = pullRequestsData.pageInfo.hasNextPage;
          afterCursor = pullRequestsData.pageInfo.endCursor;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(allPullRequests, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching pull requests.`
            }
          ]
        };
      }
    }
  );
}

export default listPullRequestsTool;
