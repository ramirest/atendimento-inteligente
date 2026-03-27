import fs from 'fs';
import path from 'path';

// Define structure of our knowledge items
export interface CatalogItem {
  id: string;
  name: string;
  keywords: string[];
  basePriceInfo: string;
  rules: string;
}

export interface CatalogData {
  B2B: CatalogItem[];
  B2C: CatalogItem[];
}

export const ragService = {
  /**
   * Loads the catalog data from catalog.json
   */
  loadCatalog(): CatalogData | null {
    const filePath = path.join(__dirname, '../data/catalog.json');
    if (!fs.existsSync(filePath)) {
      console.warn('Catalog JSON not found at:', filePath);
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as CatalogData;
  },

  /**
   * Retrieves relevant product info from the catalog based on the user's message and business context.
   */
  retrieveContext(userMessage: string, contextType: 'B2B' | 'B2C' | 'UNKNOWN'): string {
    if (contextType === 'UNKNOWN') {
      return "Aja com base nos seus conhecimentos gerais. O escopo exato do negócio não foi identificado para esta Inbox.";
    }

    const catalogData = this.loadCatalog();
    if (!catalogData) return "Catálogo de referências temporariamente indisponível.";

    const catalogArray = catalogData[contextType] || [];
    const normalizedMessage = userMessage.toLowerCase();
    
    // Find all matching items
    const matchedItems = catalogArray.filter(item => 
      item.keywords.some(kw => normalizedMessage.includes(kw.toLowerCase()))
    );

    if (matchedItems.length === 0) {
      return "Nenhum produto em específico identificado nesta mensagem. Responda de forma genérica sobre os serviços de vidraçaria, ou pergunte o que o cliente procura dentro do seu contexto de operação.";
    }

    // Format the matched items into a string context
    const contextFragments = matchedItems.map(item => {
      return `\nProduto/Serviço: ${item.name}\nPreço Base: ${item.basePriceInfo}\nRegras: ${item.rules}`;
    });

    return `Informações recuperadas da base de conhecimento (Restrito para uso interno no escopo ${contextType}, NÃO invente dados fora deste contexto):\n${contextFragments.join('\n')}`;
  }
};
