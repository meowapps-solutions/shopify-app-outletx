export interface Order {
  id: string,
  shop: string,
  lineItems: {
    edges: {
      node: {
        id: string,
        quantity: number,
        variant?: {
          id: string,
        }
      }
    }[]
  }
  processedAt: string
}

export interface ProductVariant {
  id: string,
  shop: string,
  price: string,
  createdAt: string,
  triggeredRules?: { value: string }
  product: {
    id: string,
    tags: string[],
    collections: {
      edges: { node: { id: string, title: string } }[],
    },
    productType: string,
    vendor: string,
  }
  inventoryItem: {
    id: string,
    inventoryLevels: {
      edges: {
        node: {
          id: string,
          quantities: { id: string, name: string, quantity: number }[]
        }
      }[],
    }
  }
}

// Types

export type TPageInfo = {
  pageInfo: { hasNextPage: boolean, endCursor: string }, edges: unknown[]
}
