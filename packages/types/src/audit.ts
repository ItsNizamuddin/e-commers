import { UserRole } from "./user.js";

export interface AuditActor {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface AuditFields {
    createdBy?: AuditActor;
    updatedBy?: AuditActor;
}
