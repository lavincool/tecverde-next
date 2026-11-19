import { issueInvite, inviteSecret, staffEmailSchema } from "@/features/staff/invites";
import { readAuthConfig } from "@/server/auth/config";
import { connectDatabase } from "@/server/db/connection";

const email = staffEmailSchema.parse(process.argv[2]);
const config = readAuthConfig();
const database = connectDatabase();

try {
  const token = await issueInvite(
    database,
    { email, role: "admin", actorId: null },
    inviteSecret(),
  );
  console.log(new URL(`/invite/${token}`, config.baseURL).href);
} finally {
  database.$client.close();
}
