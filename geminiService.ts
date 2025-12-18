
import { GoogleGenAI, Type, FunctionDeclaration, Tool, Content } from "@google/genai";
import { ImageSize, AspectRatio } from "./types";

// Note: API Key is handled by the UI/Bridge setup to prevent leakage
const getAI = () => new GoogleGenAI({ apiKey: (window as any).FELIPE_API_KEY || process.env.API_KEY || "" });

const bashTool: FunctionDeclaration = {
  name: "run_bash",
  description: "Execute a REAL bash command in the Termux environment. Use for file management, git, or running scripts. Restricted to workspace directory.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: { type: Type.STRING, description: "The bash command (e.g., 'ls -la', 'mkdir project', 'python3 script.py')" }
    },
    required: ["command"]
  }
};

const fileWriteTool: FunctionDeclaration = {
  name: "write_file",
  description: "Write content to a real file on the phone's storage.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "File path relative to workspace" },
      content: { type: Type.STRING, description: "The source code or text content" }
    },
    required: ["path", "content"]
  }
};

const FELIPE_TOOLS: Tool[] = [{
  functionDeclarations: [bashTool, fileWriteTool]
}];

const SYSTEM_INSTRUCTION = `You are Felipe Code, an elite AI Engineer running inside an Android Termux environment.
- You have REAL access to the file system.
- Always check files before editing.
- Your workspace is usually '~/felipe-workspace' or '/sdcard/Documents/felipe'.
- Be extremely careful with destructive commands.
- If you need to perform complex tasks, break them into smaller bash steps.
- Output style: Technical, efficient, and secure.
`;

export class GeminiService {
  async chatWithTools(history: Content[], newMessage: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [...history, { role: 'user', parts: [{ text: newMessage }] }],
      config: {
        tools: FELIPE_TOOLS,
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response;
  }

  async sendToolResults(history: Content[], toolOutputs: any[]) {
    const ai = getAI();
    const toolResponseParts = toolOutputs.map(out => ({
      functionResponse: {
        name: out.name,
        response: { result: out.output }
      }
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [...history, { role: 'tool', parts: toolResponseParts }],
      config: {
        tools: FELIPE_TOOLS,
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response;
  }

  // Multi-modal capabilities
  async generateImage(prompt: string, size: ImageSize = '1K') {
     const ai = getAI();
     const response = await ai.models.generateContent({
       model: 'gemini-3-pro-image-preview',
       contents: { parts: [{ text: prompt }] },
       config: { imageConfig: { aspectRatio: "1:1", imageSize: size } },
     });
     const part = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
     return part ? `data:image/png;base64,${part.inlineData.data}` : "";
  }
}
