import { parseGithubUrl } from "../utils/github.utils.js";
import { getRepositoryTree, getUserRepositories } from "../services/github.service.js";
import { shouldIncludeFile } from "../utils/projectFiles.js";
import { generateDocumentation } from "../services/ai.service.js";
import prisma from "../lib/prisma.js";
export const documentationController = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }
        const { username, repo } = parseGithubUrl(url);
        const [repositoryTree] = await Promise.all([getRepositoryTree(username, repo)]);
        const filteredFiles = repositoryTree.tree.filter((item) => {
            return item.type === "blob" && shouldIncludeFile(item.path);
        });
        const aiResponse = await generateDocumentation(filteredFiles.map((file) => file.path).join("\n"));
        if (!aiResponse) {
            return res.status(500).json({ error: "AI response is empty" });
        }
        const existingDoc = await prisma.aiGeneratedDocuments.findFirst({
            where: { repoUrl: url, userGithubId: req.user?.id },
        });
        let doc;
        if (existingDoc) {
            doc = await prisma.aiGeneratedDocuments.update({
                where: { id: existingDoc.id },
                data: {
                    documentation: aiResponse,
                },
            });
        }
        else {
            doc = await prisma.aiGeneratedDocuments.create({
                data: {
                    userGithubId: req.user?.id,
                    repoUrl: url,
                    documentation: aiResponse,
                },
            });
        }
        return res.status(200).json({
            success: true,
            message: "Documentation generation started",
            aiResponse,
            documentId: doc.id,
        });
    }
    catch (error) {
        console.error("Error in documentationController:", error);
        if (error instanceof Error && /bad credentials|unauthorized|401|github token/i.test(error.message)) {
            return res.status(401).json({
                error: "GitHub authentication failed. Please check the GITHUB_TOKEN in your environment.",
            });
        }
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getUserRepositoriesController = async (req, res) => {
    try {
        const { username, page, perPage, search } = req.query;
        const repositories = await getUserRepositories(username, search, Number(page) || 1, Number(perPage) || 30);
        return res.status(200).json(repositories);
    }
    catch (error) {
        console.error("Error in getRepositories:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getDocumentationByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "ID is required" });
        }
        const document = await prisma.aiGeneratedDocuments.findUnique({
            where: { id: id },
        });
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }
        if (document.userGithubId !== req.user?.id) {
            return res.status(403).json({ error: "Forbidden" });
        }
        return res.status(200).json({ success: true, document });
    }
    catch (error) {
        console.error("Error in getDocumentationByIdController:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getUserGeneratedDocumentsController = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const documents = await prisma.aiGeneratedDocuments.findMany({
            where: { userGithubId: userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                repoUrl: true,
                description: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return res.status(200).json({ success: true, documents });
    }
    catch (error) {
        console.error("Error in getUserGeneratedDocumentsController:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
//# sourceMappingURL=documentation.controller.js.map