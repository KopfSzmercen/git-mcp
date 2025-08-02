import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as dotenv from "dotenv";

const GET_PULL_REQUEST_DETAILS_QUERY = `
query GetPullRequestDetails($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {


      id
      number
      title
      state # OPEN, CLOSED, or MERGED
      url
      createdAt
      updatedAt
      closedAt
      mergedAt
      

      author {
        login
        avatarUrl
        url
      }
      mergedBy {
        login
        avatarUrl
      }
      assignees(first: 10) {
        nodes {
          login
          avatarUrl
        }
      }
      
      # --- Branch & Merge Info ---
      headRefName # The source branch name
      baseRefName # The target branch name
      mergeable # Can this be merged? (MERGEABLE, CONFLICTING, UNKNOWN)
      

      additions
      deletions
      changedFiles
      

      labels(first: 10) {
        nodes {
          name
          color
        }
      }
      
      reviews(first: 50) {
        nodes {
          author { login }
          state # APPROVED, CHANGES_REQUESTED, COMMENTED
          body
          submittedAt
        }
      }
      

      commitList: commits(first: 100) {
        totalCount
        nodes {
          commit {
            oid
            messageHeadline
            author {
              name
              email
              date
              user {
                login
              }
            }
          }
        }
      }
      
      # --- Status Checks (aliased as 'statusCheck') ---
      # Gets the CI/CD status for only the latest commit
      statusCheck: commits(last: 1) {
        nodes {
          commit {
            statusCheckRollup {
              state # SUCCESS, FAILURE, PENDING
            }
          }
        }
      }
    }
  }
}
`;

function getPrDetailsTool(mcp: McpServer) {
  mcp.registerTool(
    "get-pr-details",
    {
      title: "Get Pull Request Details",
      description:
        "Retrieve details of a specific pull request from the GitHub repository.",
      inputSchema: {
        owner: z.string().describe("The owner of the GitHub repository."),
        repo: z.string().describe("The name of the GitHub repository."),
        prNumber: z
          .number()
          .describe("The number of the pull request to retrieve.")
      }
    },
    async (params) => {
      dotenv.config();

      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
      const { owner, repo, prNumber } = params;

      try {
        const response = (await octokit.graphql(
          GET_PULL_REQUEST_DETAILS_QUERY,
          {
            owner,
            repo,
            number: prNumber
          }
        )) as any;

        const prDetails = response.repository.pullRequest;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(prDetails, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching pull request details.`
            }
          ]
        };
      }
    }
  );
}

export default getPrDetailsTool;
