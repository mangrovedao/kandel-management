import { createWalletClient, isAddress, parseEther } from "viem";
import type { Address, Hex } from "viem";
import { getKandelMarket } from "../read/kandel-market";
import { publicActions } from "viem";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { baseMangrove } from "@mangrovedao/mgv/addresses";
import { kandelActions, validateKandelParams } from "@mangrovedao/mgv";
import { getBook } from "@mangrovedao/mgv/actions";
import { populateKandel } from "../actions/populate";

async function main() {
  const kandel = process.env.KANDEL as Address;

  if (!isAddress(kandel, { strict: true })) throw new Error("not an address");

  const client = createWalletClient({
    account: privateKeyToAccount(process.env.PRIVATE_KEY as Hex),
    transport: http(process.env.RPC_URL),
    chain: base,
  }).extend(publicActions);

  const market = await getKandelMarket(client, kandel, baseMangrove);

  const midPrice = 1 / 1_079_058;
  const pricePoints = 21;
  const priceOffset = 1.05; // 5% offset
  const offsetTotal = priceOffset ** (pricePoints / 2);
  const minPrice = midPrice / offsetTotal;
  const maxPrice = midPrice * offsetTotal;

  const book = await getBook(client, baseMangrove, market!);
  const state = await client.extend(kandelActions(baseMangrove, market!, kandel)).getKandelState();

  const params = validateKandelParams({
    midPrice,
    minPrice,
    maxPrice,
    pricePoints: BigInt(pricePoints),
    baseAmount: state.reserveBalanceBase,
    quoteAmount: state.reserveBalanceQuote,
    market: market!,
    stepSize: 1n,
    gasreq: 128000n,
    factor: 2,
    asksLocalConfig: book.asksConfig,
    bidsLocalConfig: book.bidsConfig,
    marketConfig: book.marketConfig,
  });

  // console.log(params);
  // process.exit(0);

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
    market!,
    0n
    // parseEther("0.01")
  );
}

main().catch(console.error);
