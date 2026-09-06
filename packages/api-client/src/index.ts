import { ApiClient, type ApiClientConfig } from "./client.js";
import { AuthClient } from "./domains/auth.js";
import { ProductsClient } from "./domains/products.js";
import { CategoriesClient } from "./domains/categories.js";
import { InventoryClient } from "./domains/inventory.js";
import { CartClient } from "./domains/cart.js";
import { CheckoutClient } from "./domains/checkout.js";
import { PaymentsClient } from "./domains/payments.js";
import { OrdersClient } from "./domains/orders.js";
import { ReviewsClient } from "./domains/reviews.js";
import { WishlistClient } from "./domains/wishlist.js";
import { SearchClient } from "./domains/search.js";
import { AdminClient } from "./domains/admin.js";

export * from "./errors.js";
export * from "./token-store.js";
export * from "./client.js";
export * from "./domains/auth.js";
export * from "./domains/products.js";
export * from "./domains/categories.js";
export * from "./domains/inventory.js";
export * from "./domains/cart.js";
export * from "./domains/checkout.js";
export * from "./domains/payments.js";
export * from "./domains/orders.js";
export * from "./domains/reviews.js";
export * from "./domains/wishlist.js";
export * from "./domains/search.js";
export * from "./domains/admin.js";

export interface EcommersApi {
    client: ApiClient;
    auth: AuthClient;
    products: ProductsClient;
    categories: CategoriesClient;
    inventory: InventoryClient;
    cart: CartClient;
    checkout: CheckoutClient;
    payments: PaymentsClient;
    orders: OrdersClient;
    reviews: ReviewsClient;
    wishlist: WishlistClient;
    search: SearchClient;
    admin: AdminClient;
}

export function createEcommersClient(config: ApiClientConfig): EcommersApi {
    const client = new ApiClient(config);
    return {
        client,
        auth: new AuthClient(client),
        products: new ProductsClient(client),
        categories: new CategoriesClient(client),
        inventory: new InventoryClient(client),
        cart: new CartClient(client),
        checkout: new CheckoutClient(client),
        payments: new PaymentsClient(client),
        orders: new OrdersClient(client),
        reviews: new ReviewsClient(client),
        wishlist: new WishlistClient(client),
        search: new SearchClient(client),
        admin: new AdminClient(client),
    };
}

