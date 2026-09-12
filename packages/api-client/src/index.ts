import { ApiClient, type ApiClientConfig } from "./client";
import { AuthClient } from "./domains/auth";
import { ProductsClient } from "./domains/products";
import { CategoriesClient } from "./domains/categories";
import { InventoryClient } from "./domains/inventory";
import { CartClient } from "./domains/cart";
import { CheckoutClient } from "./domains/checkout";
import { PaymentsClient } from "./domains/payments";
import { OrdersClient } from "./domains/orders";
import { ReviewsClient } from "./domains/reviews";
import { WishlistClient } from "./domains/wishlist";
import { SearchClient } from "./domains/search";
import { AdminClient } from "./domains/admin";
import { LocationsClient } from "./domains/locations";
import { SeoClient } from "./domains/seo";
import { ManufacturingClient } from "./domains/manufacturing";

export * from "./errors";
export * from "./token-store";
export * from "./client";
export * from "./domains/auth";
export * from "./domains/products";
export * from "./domains/categories";
export * from "./domains/locations";
export * from "./domains/inventory";
export * from "./domains/cart";
export * from "./domains/checkout";
export * from "./domains/payments";
export * from "./domains/orders";
export * from "./domains/reviews";
export * from "./domains/wishlist";
export * from "./domains/search";
export * from "./domains/admin";
export * from "./domains/seo";
export * from "./domains/manufacturing";

export interface EcommersApi {
    client: ApiClient;
    auth: AuthClient;
    products: ProductsClient;
    categories: CategoriesClient;
    locations: LocationsClient;
    inventory: InventoryClient;
    cart: CartClient;
    checkout: CheckoutClient;
    payments: PaymentsClient;
    orders: OrdersClient;
    reviews: ReviewsClient;
    wishlist: WishlistClient;
    search: SearchClient;
    admin: AdminClient;
    seo: SeoClient;
    manufacturing: ManufacturingClient;
}

export function createEcommersClient(config: ApiClientConfig): EcommersApi {
    const client = new ApiClient(config);
    return {
        client,
        auth: new AuthClient(client),
        products: new ProductsClient(client),
        categories: new CategoriesClient(client),
        locations: new LocationsClient(client),
        inventory: new InventoryClient(client),
        cart: new CartClient(client),
        checkout: new CheckoutClient(client),
        payments: new PaymentsClient(client),
        orders: new OrdersClient(client),
        reviews: new ReviewsClient(client),
        wishlist: new WishlistClient(client),
        search: new SearchClient(client),
        admin: new AdminClient(client),
        seo: new SeoClient(client),
        manufacturing: new ManufacturingClient(client),
    };
}


