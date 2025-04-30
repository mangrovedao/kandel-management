import type { Account, Client } from "viem";

export function checkClient(
  client: Client
): client is Client & { account: Account } {
  return !!client.account;
}
