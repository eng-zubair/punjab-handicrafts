export interface CartItem {
  productId: string;
  title: string;
  price: string;
  image: string;
  district: string;
  giBrand: string;
  storeId: string;
  storeName: string;
  quantity: number;
  stock: number;
  variant?: {
    type: string;
    option: string;
    sku: string;
  };
}

const CART_STORAGE_KEY = 'sanatzar_cart';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const cart = localStorage.getItem(CART_STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error('Error reading cart:', error);
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity: number = 1): CartItem[] {
  const cart = getCart();
  const existingItemIndex = cart.findIndex(i => 
    i.productId === item.productId && 
    JSON.stringify(i.variant) === JSON.stringify(item.variant)
  );
  
  if (existingItemIndex >= 0) {
    const existingItem = cart[existingItemIndex];
    const newQuantity = Math.min(existingItem.quantity + quantity, item.stock);
    cart[existingItemIndex] = { ...existingItem, quantity: newQuantity };
  } else {
    const newQuantity = Math.min(quantity, item.stock);
    cart.push({ ...item, quantity: newQuantity });
  }
  
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId: string, variantSku?: string): CartItem[] {
  const cart = getCart().filter(item => {
    if (item.productId !== productId) return true;
    // If removing specific variant
    if (variantSku) {
      return item.variant?.sku !== variantSku;
    }
    // If no variant specified, remove all instances of this product (legacy behavior)
    // Or should we be stricter? For now, let's say if variantSku is undefined, we remove all.
    return false; 
  });
  saveCart(cart);
  return cart;
}

export function updateCartItemQuantity(productId: string, quantity: number, variantSku?: string): CartItem[] {
  const cart = getCart();
  const itemIndex = cart.findIndex(i => 
    i.productId === productId && 
    (variantSku ? i.variant?.sku === variantSku : !i.variant)
  );
  
  if (itemIndex >= 0) {
    if (quantity <= 0) {
      cart.splice(itemIndex, 1);
    } else {
      const item = cart[itemIndex];
      cart[itemIndex] = { ...item, quantity: Math.min(quantity, item.stock) };
    }
  }
  
  saveCart(cart);
  return cart;
}

export function clearCart(): void {
  saveCart([]);
}

export function getCartCount(): number {
  return getCart().reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(): number {
  return getCart().reduce((total, item) => {
    return total + (parseFloat(item.price) * item.quantity);
  }, 0);
}
