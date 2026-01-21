
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
            Sua tarefa é analisar a arte e sugerir balões de fala, focando especialmente em gritos e efeitos se a cena for de ação.

            TYPES MAPPING:
            - 'speech': Fala normal (oval).
            - 'scream': Grito agressivo (bordas irregulares).
            - 'shock': Grito de surpresa ou choque (estilo flash/estrelado).
            - 'burst': Impacto ou fala poderosa (bordas grossas e angulares).
            - 'thought': Pensamentos (nuvem).
            - 'soft-rect': Fala calma/explanação.
            - 'narrative': Narração.

            Retorne um JSON array rigoroso. Não inclua setas (showTail deve ser false).`,
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
