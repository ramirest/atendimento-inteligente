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

export const ragService = {
  /**
   * Loads the catalog data from catalog.json
   */
  loadCatalog(): CatalogItem[] {
    const filePath = path.join(__dirname, '../data/catalog.json');
    if (!fs.existsSync(filePath)) {
      console.warn('Catalog JSON not found at:', filePath);
      return [];
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData) as CatalogItem[];
  },

  /**
   * Retrieves relevant product info from the catalog based on the user's message.
   * This is a lightweight RAG implementation using keyword matching.
   */
  retrieveContext(userMessage: string): string {
    const catalog = this.loadCatalog();
    const normalizedMessage = userMessage.toLowerCase();
    
    // Find all matching items
    const matchedItems = catalog.filter(item => 
      item.keywords.some(kw => normalizedMessage.includes(kw.toLowerCase()))
    );

    if (matchedItems.length === 0) {
      return "Nenhum produto em específico identificado nesta mensagem. Responda de forma genérica sobre os serviços de vidraçaria, ou pergunte o que o cliente procura.";
    }

    // Format the matched items into a string context for the AI
    const contextFragments = matchedItems.map(item => {
      return `\nProduto: ${item.name}\nPreço Base: ${item.basePriceInfo}\nRegras: ${item.rules}`;
    });

    return `Informações recuperadas da base de conhecimento (Restrito para uso interno, NÃO invente dados fora deste contexto):\n${contextFragments.join('\n')}`;
  }
};
