export interface ProductContext {
  productId?: string;
  productTitle?: string;
  material: string;
  config?: {
    [key: string]: string | number | boolean | undefined;
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