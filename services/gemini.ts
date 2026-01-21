
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
            Analise a composição da página e sugira balões de fala baseados no tom da cena.

            BIBLIOTECA DE ESTILOS DISPONÍVEL:
            - 'speech': Padrão.
            - 'scream': Intensidade/Grito.
            - 'shock': Surpresa extrema.
            - 'burst': Impacto sonoro.
            - 'thought': Monólogo interno.
            - 'narrative': Explicação/Caixa.
            - 'dripping': Horror/Desespero.
            - 'mechanical': Robôs/Tecnologia.
            - 'ice': Frieza/Sarcasmo.
            - 'flower': Alegria/Romance.

            REGRAS:
            1. Posicione os balões para não tapar os rostos dos personagens.
            2. Use 'showTail: false' sempre.
            3. A leitura deve ser da direita para a esquerda (padrão japonês).`,
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
    console.error("Erro na análise profissional:", error);
    return [];
  }
}
