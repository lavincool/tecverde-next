import "server-only";

import { connectDatabase } from "./connection";

export const db = connectDatabase();
