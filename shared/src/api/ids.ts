import { ulid } from 'ulid';

/** Generate a new ULID string. Lexicographically orderable, unique. */
export const newId = (): string => ulid();
