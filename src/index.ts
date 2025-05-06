import { Command, Option } from "commander";
import { cashnesses, registry } from "./utils/registry";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  parseEther,
  parseUnits,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  kandelActions,
  mangroveActions,
  validateKandelParams,
  type MarketParams,
} from "@mangrovedao/mgv";
import ora from "ora";
import inquirer from "inquirer";
import { sow } from "./actions/sow";
import { getKandelMarket, getPopulateData } from "./read/kandel-market";
import { retractKandel } from "./actions/retract";
import { getBook } from "@mangrovedao/mgv/actions";
import { BA } from "@mangrovedao/mgv/lib";
import { populateKandel } from "./actions/populate";
import { multicall } from "viem/actions";

declare global {
  interface BigInt {
    toJSON: () => string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const program = new Command();

program.name("kandel-cli").description("CLI for Kandel").version("0.0.1");

program.command("list-chains").action(async () => {
  console.table({ chains: Object.keys(registry) });
});

const privateKeyOption = new Option(
  "-k, --private-key <private-key>",
  "Private key to use"
).env("PRIVATE_KEY");

const rpcUrlOption = new Option("--rpc-url <rpc-url>", "RPC URL to use").env(
  "RPC_URL"
);

const chainOption = new Option("-c, --chain <chain>", "Chain to use").default(
  "base"
);

program
  .command("sow")
  .addOption(privateKeyOption)
  .addOption(rpcUrlOption)
  .addOption(chainOption)
  .action(async (options) => {
    const entry = registry[options.chain as keyof typeof registry];

    const client = createWalletClient({
      account: privateKeyToAccount(options.privateKey as Hex),
      transport: http(options.rpcUrl),
      chain: entry.chain,
    });

    const mangroveClient = client.extend(mangroveActions(entry.mangrove));
    const loader = ora("Fetching open markets").start();
    const markets = await mangroveClient.getOpenMarkets({
      cashnesses: cashnesses,
    });
    loader.succeed(`Found ${markets.length} open markets`);

    const { market } = (await inquirer.prompt([
      {
        type: "select",
        choices: markets.map((m) => ({
          name: `${m.base.symbol}/${m.quote.symbol}, (tick spacing: ${m.tickSpacing})`,
          value: m,
        })),
        message: "Select a market",
        name: "market",
      },
    ])) as { market: MarketParams };

    await sow(client, entry.seeder, market);
  });

program
  .command("retract")
  .argument("<kandel>", "Kandel address")
  .addOption(privateKeyOption)
  .addOption(rpcUrlOption)
  .addOption(chainOption)
  .option("--leave-funds", "Leave funds (defaults to false)", false)
  .option("--leave-provision", "Leave provision (defaults to false)", false)
  .action(async (kandel, options) => {
    const entry = registry[options.chain as keyof typeof registry];

    const client = createWalletClient({
      account: privateKeyToAccount(options.privateKey as Hex),
      transport: http(options.rpcUrl),
      chain: entry.chain,
    });

    const loader = ora("Fetching market").start();
    const market = await getKandelMarket(client, kandel, entry.mangrove);
    if (!market) {
      loader.fail("Market not found");
      return;
    }
    loader.succeed(`Found market ${market.base.symbol}/${market.quote.symbol}`);

    await retractKandel(
      client,
      entry.mangrove,
      market,
      kandel,
      client.account.address,
      {
        withdrawFunds: !options.leaveFunds,
        withdrawProvision: !options.leaveProvision,
      }
    );
  });

const gasRequirementOption = new Option(
  "-g, --gas-requirement <number>",
  "Gas requirement"
)
  .default(128000n)
  .argParser(BigInt);

const baseAmountDepositOption = new Option(
  "-b, --base-amount <number>",
  "Base amount deposit"
).default("0");

const quoteAmountDepositOption = new Option(
  "-q, --quote-amount <number>",
  "Quote amount deposit"
).default("0");

const provisionOption = new Option(
  "-p, --provision <number>",
  "Provision to deposit in kandel"
)
  .default(0n)
  .argParser((value) => parseEther(value));

program
  .command("populate")
  .argument("<kandel>", "Kandel address")
  .argument("<price-points>", "Number of price points")
  .argument("<min-price>", "Minimum price")
  .argument("<mid-price>", "Current price")
  .argument("<max-price>", "Maximum price")
  .addOption(gasRequirementOption)
  .addOption(privateKeyOption)
  .addOption(rpcUrlOption)
  .addOption(chainOption)
  .addOption(baseAmountDepositOption)
  .addOption(quoteAmountDepositOption)
  .addOption(provisionOption)
  .action(
    async (kandel, pricePoints, minPrice, midPrice, maxPrice, options) => {
      const entry = registry[options.chain as keyof typeof registry];

      const client = createWalletClient({
        account: privateKeyToAccount(options.privateKey as Hex),
        transport: http(options.rpcUrl),
        chain: entry.chain,
      });

      const loader = ora("Getting market").start();
      const data = await getPopulateData(client, kandel, entry.mangrove);
      if (!data) {
        loader.fail("Market not found");
        return;
      }
      loader.succeed(
        `Found market ${data.market.base.symbol}/${data.market.quote.symbol}`
      );
      const { market, baseBalance, quoteBalance } = data;

      const loader2 = ora("Getting market congigs").start();
      const book = await getBook(client, entry.mangrove, market);
      loader2.succeed("Got market configs");

      const baseAmountDeposit = parseUnits(
        options.baseAmount,
        market.base.decimals
      );
      const quoteAmountDeposit = parseUnits(
        options.quoteAmount,
        market.quote.decimals
      );

      const params = validateKandelParams({
        market,
        minPrice: Number(minPrice),
        midPrice: Number(midPrice),
        maxPrice: Number(maxPrice),
        pricePoints: BigInt(pricePoints),
        baseAmount: baseBalance + baseAmountDeposit,
        quoteAmount: quoteBalance + quoteAmountDeposit,
        stepSize: 1n,
        gasreq: options.gasRequirement,
        factor: 2,
        asksLocalConfig: book.asksConfig,
        bidsLocalConfig: book.bidsConfig,
        marketConfig: book.marketConfig,
        deposit: true,
      });

      console.log("expected distribution:");
      console.table([
        ...params.distribution.bids.map((bid) => ({
          type: "bid",
          ...bid,
        })),
        ...params.distribution.asks.map((ask) => ({
          type: "ask",
          ...ask,
        })),
      ]);

      console.log(
        "Expected minimum provision required:",
        formatEther(params.minProvision),
        "ETH"
      );
      if (!params.isValid) {
        console.warn(
          "Params are considered invalid, this could be due to low liquidity in kandel and/or deposited"
        );
      }

      const { proceed } = (await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message:
            "Proceed with populating kandel ? (make sure to have enough provision already in kandel)",
          default: true,
        },
      ])) as { proceed: boolean };
      if (!proceed) {
        console.log("Aborting");
        return;
      }

      await populateKandel(
        client,
        client.account.address,
        kandel,
        {
          ...params.params,
          baseAmount: baseAmountDeposit,
          quoteAmount: quoteAmountDeposit,
        },
        entry.mangrove,
        market,
        options.provision
      );
    }
  );

program
  .command("view")
  .argument("<kandel>", "Kandel address")
  .addOption(rpcUrlOption)
  .addOption(chainOption)
  .action(async (kandel, options) => {
    const entry = registry[options.chain as keyof typeof registry];

    const client = createPublicClient({
      transport: http(options.rpcUrl),
      chain: entry.chain,
    });

    const loader = ora("Getting market").start();
    const market = await getKandelMarket(client, kandel, entry.mangrove);
    if (!market) {
      loader.fail("Market not found");
      return;
    }
    loader.succeed(`Found market ${market.base.symbol}/${market.quote.symbol}`);

    const state = await client
      .extend(kandelActions(entry.mangrove, market, kandel))
      .getKandelState();

    console.log(
      "\nMarket:",
      `${market.base.symbol}/${market.quote.symbol}, state: ${state.kandelStatus}`
    );
    console.table({
      "Deposited Volume": {
        base: formatUnits(state.reserveBalanceBase, market.base.decimals),
        quote: formatUnits(state.reserveBalanceQuote, market.quote.decimals),
      },
      "Offered Volume": {
        base: formatUnits(state.baseAmount, market.base.decimals),
        quote: formatUnits(state.quoteAmount, market.quote.decimals),
      },
    });

    console.log("\nprovisions : ");
    console.table({
      unlocked: formatEther(state.unlockedProvision),
      total: formatEther(state.totalProvision),
    });

    const offers = [...state.bids, ...state.asks];
    if (offers.length === 0) {
      console.log("No offers found");
      return;
    }
   
  // Step 1: Filter out offers with zero gives
  const filtered = offers
  .filter(offer => offer.gives !== 0n)
  .map(offer => ({
    type: offer.ba,
    price: offer.price.toExponential(),
    amount:
      offer.ba === BA.asks
        ? `${formatUnits(offer.gives, market.base.decimals)} ${market.base.symbol}`
        : `${formatUnits(offer.gives, market.quote.decimals)} ${market.quote.symbol}`,
    tick: offer.tick,
    provision: formatEther(offer.provision),
  }));

  // Step 2: Separate into bids and asks
  const bids = filtered.filter(row => row.type !== BA.asks);
  const asks = filtered.filter(row => row.type === BA.asks);

  // Step 3: Output to console
  console.log("\nBids: ");
  console.table(bids);
  // console.log(); // Add a blank line
  console.log("\nAsks: ");
  console.table(asks);
  });

program
  .command("balances")
  .argument("<address>", "Address to get balances for")
  .addOption(rpcUrlOption)
  .addOption(chainOption)
  .action(async (address, options) => {
    const entry = registry[options.chain as keyof typeof registry];

    const client = createPublicClient({
      transport: http(options.rpcUrl),
      chain: entry.chain,
    });

    const markets = await client
      .extend(mangroveActions(entry.mangrove))
      .getOpenMarkets({
        cashnesses: cashnesses,
      });

    const { market } = (await inquirer.prompt([
      {
        type: "select",
        choices: markets.map((m) => ({
          name: `${m.base.symbol}/${m.quote.symbol} (${m.tickSpacing})`,
          value: m,
        })),
        message: "Select a market",
        name: "market",
      },
    ])) as { market: MarketParams };

    const [baseBalance, quoteBalance] = await multicall(client, {
      contracts: [
        {
          abi: erc20Abi,
          address: market.base.address,
          functionName: "balanceOf",
          args: [address],
        },
        {
          abi: erc20Abi,
          address: market.quote.address,
          functionName: "balanceOf",
          args: [address],
        },
      ],
      allowFailure: false,
    });

    console.table({
      base: `${formatUnits(baseBalance, market.base.decimals)} ${
        market.base.symbol
      }`,
      quote: `${formatUnits(quoteBalance, market.quote.decimals)} ${
        market.quote.symbol
      }`,
    });
  });
program.parse();
