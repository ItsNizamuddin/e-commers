export interface TokenStore {
    getAccessToken: () => string | null;
    setAccessToken: (token: string | null) => void;
    clear: () => void;
}

export function createInMemoryTokenStore(initialToken: string | null = null): TokenStore {
    let currentToken = initialToken;
    return {
        getAccessToken: () => currentToken,
        setAccessToken: (token: string | null) => {
            currentToken = token;
        },
        clear: () => {
            currentToken = null;
        },
    };
}
