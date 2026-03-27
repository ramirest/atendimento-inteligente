import fs from 'fs';
import path from 'path';

// Define structure of our knowledge items
export interface CatalogItem {
  id: string;
  name: string;
  keywords: string[];
  preco: string;
  regras_de_negocio: string;
  restricoes: string;
}

export interface CatalogData {
  B2B: CatalogItem[];
  B2C: CatalogItem[];
}

export const ragService = {
  loadCatalog(): CatalogData | null {
    const filePath = path.join(__dirname, '../data/catalog.json');
    if (!fs.existsSync(filePath)) return null;
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as CatalogData;
  },

  retrieveContext(userMessage: string, contextType: 'B2B' | 'B2C' | 'UNKNOWN'): string {
    if (contextType === 'UNKNOWN') return "Aja com base nos seus conhecimentos gerais. O escopo exato do negócio não foi identificado.";
    const catalogData = this.loadCatalog();
    if (!catalogData) return "Catálogo de referências temporariamente indisponível.";

    const catalogArray = catalogData[contextType] || [];
    const normalizedMessage = userMessage.toLowerCase();
    
    const matchedItems = catalogArray.filter(item => 
      item.keywords.some(kw => normalizedMessage.includes(kw.toLowerCase()))
    );

    if (matchedItems.length === 0) return "Nenhum produto em específico identificado nesta mensagem. Responda de forma genérica sobre os serviços pertinentes ou qualifique o cliente.";

    const contextFragments = matchedItems.map(item => {
      return `\nLinha: ${item.name}\nPreço: ${item.preco}\nRegras: ${item.regras_de_negocio}\nRestrições: ${item.restricoes}`;
    });

    return `Informações OFICIAIS da base Jateart/Almeida. (Restrito uso interno no escopo ${contextType}):\n${contextFragments.join('\n')}`;
  }
};
