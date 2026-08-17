import OpenAI from "openai";
import { env } from "../config/env.js";

const openai = new OpenAI({
  apiKey: env.openaiApiKey,
  baseURL: "https://openrouter.ai/api/v1",
});

export async function generateDocumentation(repositoryContext: string) {
  const response = await openai.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b:free",

    messages: [
      {
        role: "system",
        content: `
You are a senior software engineer.

Analyze the provided repository code and generate
accurate technical documentation.

Rules:
- Only describe functionality supported by the code.
- Do not invent features.
- If something cannot be determined, say "Not detected".
- Output Markdown.
        `,
      },
      {
        role: "user",
        content: `
Analyze this repository:

${repositoryContext}

Generate documentation containing:

# Project Overview

## Features

## Technology Stack

## Project Structure

## Architecture

## Installation

## Environment Variables

## API Endpoints

## Database

## Development Guide
        `,
      },
    ],

    temperature: 0.2,
  });

  return response.choices[0]?.message?.content ?? "";
}
