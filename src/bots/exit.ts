import { createWalletClient, http, publicActions, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getKandelMarket } from "../read/kandel-market";
import { baseMangrove } from "@mangrovedao/mgv/addresses";
import {
  kandelActions,
  type GetKandelStateResult,
  type MarketParams,
} from "@mangrovedao/mgv";
import { retractKandel } from "../actions/retract";

const client = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as Hex),
  transport: http(process.env.RPC_URL),
  chain: base,
}).extend(publicActions);

const kandel = "0x71F5E2253db3edddeA95277b9403219D6F6Ab424";

async function exitCondition(
  state: GetKandelStateResult,
  market: MarketParams
) {
  // TODO: implement exit condition
  return false;
}

async function botLoop(market: MarketParams, interval: number) {
  while (true) {
    const state = await client
      .extend(kandelActions(baseMangrove, market, kandel))
      .getKandelState();

    const exit = await exitCondition(state, market);
    if (exit) {
      await retractKandel(
        client,
        baseMangrove,
        market,
        kandel,
        client.account.address,
        {
          withdrawFunds: false,
          withdrawProvision: false,
        }
      );
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

async function main() {
  const market = await getKandelMarket(client, kandel, baseMangrove);

  if (!market) {
    throw new Error("Market not found");
  }

  await botLoop(market, 4000);
}

main().catch(console.error);
