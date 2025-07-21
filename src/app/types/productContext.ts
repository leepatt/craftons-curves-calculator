export interface ProductContext {
  productId?: string;
  productTitle?: string;
  material: string;
  config?: {
    [key: string]: any;
  };
}

export interface WindowWithProductContext extends Window {
  productContext?: ProductContext;
}

declare global {
  interface Window {
    productContext?: ProductContext;
  }
} 