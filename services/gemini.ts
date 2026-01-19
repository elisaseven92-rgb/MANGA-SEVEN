
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeMangaPage(
  base64Image: string,
  mimeType: string
): Promise<any[]> {
  // Criar a instância aqui garante que a API_KEY injetada pelo Vite esteja disponível
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
            1. SE HOUVER PERSONAGENS: Identifique quem está falando e crie diálogos que combinem com a expressão deles. O 'tailAngle' deve apontar para o falante.
            2. SE NÃO HOUVER DIÁLOGO CLARO: Interprete a "vibe" da imagem. Crie uma NARRATIVA poética, épica ou descritiva (monólogo interno) que ajude a contar a história do que está acontecendo na cena. 
               Exemplo: Em uma cena de floresta vazia, coloque: "O silêncio aqui é ensurdecedor... algo está à espreita."
            3. POSICIONAMENTO: Coloque os balões em áreas vazias (espaço negativo) para não cobrir detalhes importantes da arte.
            4. ORDEM DE LEITURA: Organize pelo 'readingOrder' seguindo o padrão japonês (Direita para Esquerda, Cima para Baixo).

            Retorne um JSON array rigoroso com objetos contendo:
            - panelNumber: Número do quadro.
            - description: Breve descrição do porquê desta fala/narração.
            - suggestedDialogue: O texto (em Português) para o balão.
            - position: {x, y} em porcentagem (0-100).
            - tailAngle: Ângulo (0-360) para o rabicho. Se for narração, aponte para o centro do quadro.
            - tailLength: Comprimento do rabicho (40-100).
            - fontSize: Tamanho sugerido (12-20).
            - bubbleScale: Largura sugerida do balão (20-60).
            - readingOrder: Ordem sequencial de leitura.`,
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
              description: { type: Type.STRING },
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
              readingOrder: { type: Type.INTEGER }
            },
            required: ["panelNumber", "description", "suggestedDialogue", "position", "tailAngle", "tailLength", "fontSize", "bubbleScale", "readingOrder"],
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
