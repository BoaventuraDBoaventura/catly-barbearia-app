
import { GoogleGenAI, Type } from "@google/genai";

// Validação da API Key
const getApiKey = (): string | undefined => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey === 'your_api_key_here') {
    console.warn('⚠️ Gemini API Key não configurada. Configure em .env.local');
    return undefined;
  }
  return apiKey;
};

export async function getStyleAdvice(serviceName: string) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return "Configure sua API Key do Gemini para receber dicas personalizadas!";
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: `O cliente está interessado no serviço: ${serviceName}. Dê 3 dicas rápidas e profissionais sobre esse estilo de corte ou cuidado. Responda de forma curta e amigável em português.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    return "Sempre use produtos de qualidade para manter seu visual impecável!";
  }
}

// Fallback usando API gratuita de geocodificação reversa
async function getAddressFromOpenStreetMap(lat: number, lng: number): Promise<{ address: string; url?: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt`,
      {
        headers: {
          'User-Agent': 'Catly-Barbearia-App/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Falha na geocodificação');
    }

    const data = await response.json();

    // Extrair informações relevantes
    const address = data.address || {};
    const parts = [];

    if (address.suburb || address.neighbourhood) {
      parts.push(address.suburb || address.neighbourhood);
    }
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.state) {
      parts.push(address.state);
    }

    const formattedAddress = parts.length > 0
      ? parts.join(', ')
      : data.display_name?.split(',').slice(0, 3).join(',') || 'Localização Identificada';

    return {
      address: formattedAddress,
      url: `https://www.google.com/maps?q=${lat},${lng}`
    };
  } catch (error) {
    console.error("OpenStreetMap Error:", error);
    throw error;
  }
}

export async function getAddressFromCoords(lat: number, lng: number): Promise<{ address: string; url?: string }> {
  const apiKey = getApiKey();

  // Se não houver API key, usar OpenStreetMap diretamente
  if (!apiKey) {
    console.log('📍 Usando OpenStreetMap para geocodificação (sem API Gemini)');
    try {
      return await getAddressFromOpenStreetMap(lat, lng);
    } catch (error) {
      return {
        address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
        url: `https://www.google.com/maps?q=${lat},${lng}`
      };
    }
  }

  // Tentar usar Gemini primeiro
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: `Com base nas coordenadas GPS: Latitude ${lat}, Longitude ${lng}, identifique o endereço em Moçambique.
      
Retorne APENAS no formato: 'Bairro, Cidade, Província'

Províncias válidas em Moçambique: Maputo (Cidade ou Província), Gaza, Inhambane, Sofala, Manica, Tete, Zambézia, Nampula, Niassa, Cabo Delgado.

Exemplo: 'Polana Cimento, Maputo, Cidade de Maputo'`,
    });

    // Extração do texto gerado
    const address = response.text?.trim() || "Localização Identificada";

    return {
      address,
      url: `https://www.google.com/maps?q=${lat},${lng}`
    };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error("Erro ao buscar endereço via Gemini Maps:", errorMsg);

    // Fallback para OpenStreetMap
    console.log('📍 Usando OpenStreetMap como fallback');
    try {
      return await getAddressFromOpenStreetMap(lat, lng);
    } catch (fallbackError) {
      console.error("Erro no fallback OpenStreetMap:", fallbackError);
      // Último fallback: coordenadas
      return {
        address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
        url: `https://www.google.com/maps?q=${lat},${lng}`
      };
    }
  }
}
