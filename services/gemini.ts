
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
            text: `Aja como um Editor-Chefe de Mangá (Shonen Jump).
            Analise a página de arte bruta e sugira balões de diálogo profissionais.

            BIBLIOTECA DE ESTILOS:
            - 'speech': Diálogos normais.
            - 'scream': Gritos de impacto.
            - 'shock': Revelações chocantes.
            - 'thought': Monólogo interno.
            - 'narrative': Caixas de tempo/lugar.
            - 'fear': Momentos de tensão/horror.
            - 'dripping': Desespero absoluto.

            REGRAS EDITORIAIS:
            1. NÃO COBRIR os rostos ou expressões chaves.
            2. Fluxo de leitura: Canto Superior Direito -> Canto Inferior Esquerdo.
            3. Equilibre o uso de preto: balões de impacto ('burst') devem estar perto de áreas de muita ação.
            4. Se a cena for silenciosa, use balões pequenos e 'whisper'.`,
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

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Erro na análise profissional:", error);
    return [];
  }
}
