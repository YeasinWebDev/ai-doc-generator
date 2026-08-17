import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 5000,

  openaiApiKey: process.env.OPENROUTER_API_KEY,

  githubToken: process.env.GITHUB_TOKEN,
};