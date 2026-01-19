
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeMangaPage(
  base64Image: string,
  mimeType: string
): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Aja como um Editor-Chefe de Mangá e Especialista em Letreiramento.
            Sua tarefa é dar vida a esta página através de balões de fala ou caixas de narração.

            DIRETRIZES:
            1. SE HOUVER PERSONAGENS: Identifique quem está falando e crie diálogos que combinem com a expressão deles.
            2. TIPOS DE BALÃO (bubbleType):
               - 'speech': Fala normal (padrão).
               - 'thought': Pensamentos ou monólogo interno (nuvem).
               - 'scream': Grito, choque ou intensidade (espinhoso).
               - 'narrative': Narração do autor ou tempo (caixa retangular).
               - 'whisper': Sussurro ou fala baixa (pontilhado).
            3. POSICIONAMENTO: Coloque os balões em áreas vazias (espaço negativo).
            4. ORDEM DE LEITURA: Padrão japonês (Direita para Esquerda, Cima para Baixo).

            Retorne um JSON array rigoroso com objetos contendo:
            - panelNumber: Número do quadro.
            - suggestedDialogue: O texto (em Português).
            - position: {x, y} em porcentagem (0-100).
            - tailAngle: Ângulo (0-360) para o rabicho.
            - tailLength: Comprimento do rabicho.
            - fontSize: Tamanho sugerido (12-20).
            - bubbleScale: Largura sugerida (20-60).
            - bubbleType: Escolha entre 'speech', 'thought', 'scream', 'narrative', 'whisper'.
            - readingOrder: Ordem sequencial.`,
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
