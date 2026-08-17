import type { Request, Response } from "express";
import { parseGithubUrl } from "../utils/github.utils.js";
import { getRepositoryTree } from "../services/github.service.js";
import { shouldIncludeFile } from "../utils/projectFiles.js";
import { generateDocumentation } from "../services/ai.service.js";

export const documentationController = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const { username, repo } = parseGithubUrl(url);
    const [repositoryTree] = await Promise.all([getRepositoryTree(username as string, repo as string)]);

    const filteredFiles = repositoryTree.tree.filter((item) => {
      return item.type === "blob" && shouldIncludeFile(item.path);
    });

    const aiResponse = await generateDocumentation(filteredFiles.map((file) => file.path).join("\n"));

    return res.status(200).json({
      message: "Documentation generation started",
      aiResponse,
    });
  } catch (error) {
    console.error("Error in documentationController:", error);

    if (error instanceof Error && /bad credentials|unauthorized|401|github token/i.test(error.message)) {
      return res.status(401).json({
        error: "GitHub authentication failed. Please check the GITHUB_TOKEN in your environment.",
      });
    }

    return res.status(500).json({ error: "Internal Server Error" });
  }
};
