import {
  kandelActions,
  validateKandelParams,
  type GetKandelStateResult,
} from "@mangrovedao/mgv";
import type { MarketParams } from "@mangrovedao/mgv";
import { baseMangrove } from "@mangrovedao/mgv/addresses";
import type { Hex } from "viem";
import { publicActions } from "viem";
import { http } from "viem";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { populateKandel } from "../actions/populate";
import { getBook } from "@mangrovedao/mgv/actions";
import { getKandelMarket } from "../read/kandel-market";

const client = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as Hex),
  transport: http(process.env.RPC_URL),
  chain: base,
}).extend(publicActions);

const kandel = "0x71F5E2253db3edddeA95277b9403219D6F6Ab424";

async function changePrice(state: GetKandelStateResult, market: MarketParams) {
  // TODO: implement change price
  return {
    midPrice: 0,
    minPrice: 0,
    maxPrice: 0,
    shouldReplace: false,
  };
}

async function botLoop(market: MarketParams, interval: number) {
  while (true) {
    const state = await client
      .extend(kandelActions(baseMangrove, market, kandel))
      .getKandelState();

    const { midPrice, minPrice, maxPrice, shouldReplace } = await changePrice(
      state,
      market
    );

    if (shouldReplace) {
      const book = await getBook(client, baseMangrove, market);

      const params = validateKandelParams({
        minPrice,
        maxPrice,
        midPrice,
        pricePoints: BigInt(state.pricePoints),
        baseAmount: state.reserveBalanceBase,
        quoteAmount: state.reserveBalanceQuote,
        market,
        stepSize: 1n,
        gasreq: 128000n,
        factor: 2,
        asksLocalConfig: book.asksConfig,
        bidsLocalConfig: book.bidsConfig,
        marketConfig: book.marketConfig,
      });

      await populateKandel(
        client,
        client.account.address,
        kandel,
        {
          ...params.params,
          baseAmount: 0n,
          quoteAmount: 0n,
        },
        baseMangrove,
        market,
        0n
      );
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
