import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth/session";

/** The clearing house has no lobby: members land on their statement, nobody else gets in. */
export default async function Index() {
  redirect((await currentAccount()) ? "/statement" : "/sign-in");
}
