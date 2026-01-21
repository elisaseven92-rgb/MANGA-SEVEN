
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeMangaPage(
  base64Image: string,
  mimeType: string
): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Aja como um Editor de Mangá Profissional.
            Sua tarefa é analisar a arte e sugerir balões de fala usando os novos tipos baseados em modelos geométricos.

            TYPES MAPPING:
            - 'speech': Fala normal (oval).
            - 'scream': Grito ou choque (explosão).
            - 'thought': Pensamentos (nuvem).
            - 'soft-rect': Fala calma/explanação (caixa arredondada).
            - 'trapezoid': Fala assertiva (caixa angular).
            - 'starburst': Momento de ação intensa ou surpresa.
            - 'capsule': Diálogos longos.
            - 'bean': Fala orgânica ou cômica.
            - 'narrative': Narração/Contexto (caixa preta ou retangular).

            Retorne um JSON array rigoroso.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              panelNumber: { type: Type.INTEGER },
              suggestedDialogue: { type: Type.STRING },
              position: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER }
                },
                required: ["x", "y"]
              },
              tailAngle: { type: Type.NUMBER },
              tailLength: { type: Type.NUMBER },
              fontSize: { type: Type.INTEGER },
              bubbleScale: { type: Type.NUMBER },
              bubbleType: { type: Type.STRING },
              readingOrder: { type: Type.INTEGER }
            },
            required: ["panelNumber", "suggestedDialogue", "position", "tailAngle", "tailLength", "fontSize", "bubbleScale", "bubbleType", "readingOrder"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]").sort((a: any, b: any) => a.readingOrder - b.readingOrder);
  } catch (error) {
    console.error("Erro na análise visual narrativa:", error);
    return [];
  }
}
