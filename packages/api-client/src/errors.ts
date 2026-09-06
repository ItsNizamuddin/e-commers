export class ApiClientError extends Error {
    readonly code: string;
    readonly status: number;
    readonly details?: unknown;

    constructor(message: string, status: number, code: string, details?: unknown) {
        super(message);
        this.name = "ApiClientError";
        this.status = status;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, ApiClientError.prototype);
    }
}
