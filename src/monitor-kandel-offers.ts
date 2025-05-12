import {
  createPublicClient,
  http,
  isAddress,
  type Address,
  // type Hex, // Not explicitly used
} from "viem";
// import { privateKeyToAccount } from "viem/accounts"; // May not be needed if only reading
// import { base } from "viem/chains"; // Example chain, make configurable
import { getKandelMarket } from "./read/kandel-market";
// import { baseMangrove } from "@mangrovedao/mgv/addresses"; // Example mangrove, make configurable
import { kandelActions } from "@mangrovedao/mgv";
import { BA } from "@mangrovedao/mgv/lib"; // Added import for BA
// import ora from "ora"; // Will be removed
import { Command } from "commander";
import { registry } from "./utils/registry"; // For chain/mangrove config
import { formatUnits } from "viem";
import * as https from "https"; // For Slack integration
import { URL } from "url"; // For Slack integration
import {
  getBalancerPriceData,
  type BalancerPriceInfo,
} from "./balancer-v3-pricer"; // Added import
import Big from "big.js"; // For precise numeric comparisons

// Local KandelOffer interface if direct import is problematic
interface KandelOffer {
  id: bigint;
  tick: bigint;
  gives: bigint;
  // price?: number; // Removed to avoid type conflict, will be handled in ProcessedKandelOffer
  // Add other properties from KandelOffer if used, e.g., live, gasprice, gasreq etc.
  // For now, only adding what's directly causing linter errors or actively used.
}

// Type for processed Kandel offer with price
interface ProcessedKandelOffer extends KandelOffer {
  price: Big | undefined; // This is the Big.js version of the price
  // givesBase is true if the offer gives base (ask), false if it gives quote (bid)
  givesBase: boolean;
}

// Type for the overall processed Kandel state
interface ProcessedKandelState {
  kandelStatus: string;
  pricePoints: bigint;
  asks: ProcessedKandelOffer[];
  bids: ProcessedKandelOffer[];
  baseAmount: bigint;
  quoteAmount: bigint;
  reserveBalanceBase: bigint;
  reserveBalanceQuote: bigint;
  populatedAsksCount: number;
  populatedBidsCount: number;
}

// Helper to format base token amount
const formatBase = (amount: bigint, market: any) =>
  market && typeof market.base?.decimals === "number"
    ? `${formatUnits(amount, market.base.decimals)} ${market.base.symbol}`
    : `${amount} (raw base units)`;

// Helper to format quote token amount
const formatQuote = (amount: bigint, market: any) =>
  market && typeof market.quote?.decimals === "number"
    ? `${formatUnits(amount, market.quote.decimals)} ${market.quote.symbol}`
    : `${amount} (raw quote units)`;

// Helper to get display price string
const getDisplayPriceString = (
  priceAsBig: Big | undefined,
  market: any,
  decimals = 10 // Default practical decimals for general display
): string => {
  if (!priceAsBig || !market || typeof market.quote?.decimals !== "number") {
    return "N/A (price format error)";
  }
  const displayDecimals = Math.min(market.quote.decimals, decimals);
  const finalDisplayDecimals = Math.max(0, displayDecimals);
  let priceString = priceAsBig.toFixed(finalDisplayDecimals);
  if (priceString.indexOf(".") !== -1) {
    priceString = priceString.replace(/0+$/, "").replace(/\.$/, "");
  }
  return priceString;
};

// Helper to calculate price for a single Kandel offer
const calculateKandelOfferPrice = (
  offer: KandelOffer,
  market: any,
  offerType: "asks" | "bids"
): Big | undefined => {
  let priceBig: Big | undefined = undefined;
  const offerBa = offerType === "asks" ? BA.asks : BA.bids;

  if (market && typeof market.tickToPrice === "function") {
    try {
      const calculatedPrice = market.tickToPrice(offer.tick, offerBa);
      if (calculatedPrice instanceof Big) {
        priceBig = calculatedPrice;
      } else if (
        typeof calculatedPrice === "number" ||
        typeof calculatedPrice === "string"
      ) {
        priceBig = new Big(calculatedPrice.toString());
      } else {
        console.warn(
          `Kandel Monitor: market.tickToPrice for offer (tick: ${
            offer.tick
          }) returned unexpected type: ${typeof calculatedPrice}. Will attempt fallback.`
        );
      }
    } catch (e: any) {
      console.warn(
        `Kandel Monitor: Error using market.tickToPrice for offer (tick: ${offer.tick}): ${e.message}. Will attempt fallback.`
      );
    }
  }

  if (!priceBig && offer && typeof (offer as any).price === "number") {
    try {
      priceBig = new Big((offer as any).price);
    } catch (e: any) {
      console.warn(
        `Kandel Monitor: Error converting fallback offer.price to Big for offer: ${e.message}`
      );
      priceBig = undefined;
    }
  }
  return priceBig;
};

// Setup command line arguments
const program = new Command();
program
  .name("monitor-kandel-offers")
  .description(
    "Monitor the number of active bids and asks on a Kandel instance, with periodic checks and Slack notifications."
  )
  .requiredOption("-k, --kandel <address>", "Kandel contract address")
  .option("-r, --rpc-url <url>", "RPC URL", process.env.RPC_URL) // Default to env variable
  .option(
    "-c, --chain <name>",
    "Chain name (e.g., base)",
    process.env.CHAIN || "base"
  ) // Default to env variable or 'base'
  .option("-i, --interval <minutes>", "Monitoring interval in minutes", "15")
  .option(
    "--slack-webhook-url <url>",
    "Slack Webhook URL for notifications",
    process.env.SLACK_WEBHOOK_URL
  )
  .parse(process.argv);

const options = program.opts();

const kandelAddress = options.kandel as Address;
const rpcUrl = options.rpcUrl;
const chainName = options.chain;
const intervalMinutes = parseInt(options.interval, 10);

const slackWebhookUrl = options.slackWebhookUrl; // Rely solely on CLI arg or env var

if (!kandelAddress || !isAddress(kandelAddress)) {
  console.error("Error: Invalid or missing Kandel address.");
  process.exit(1);
}

if (!rpcUrl) {
  console.error(
    "Error: RPC URL is required. Set --rpc-url or RPC_URL environment variable."
  );
  process.exit(1);
}

if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
  console.error(
    "Error: Invalid interval. Must be a positive number of minutes."
  );
  process.exit(1);
}
const intervalMilliseconds = intervalMinutes * 60 * 1000;

const chainEntry = registry[chainName as keyof typeof registry];
if (!chainEntry) {
  console.error(
    `Error: Chain configuration not found for '${chainName}'. Check registry.`
  );
  process.exit(1);
}

async function sendToSlack(webhookUrl: string, text: string): Promise<void> {
  if (!webhookUrl) {
    // console.log("Slack webhook URL not provided, skipping Slack notification.");
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    try {
      const payload = JSON.stringify({ text });
      const parsedUrl = new URL(webhookUrl);
      const requestOptions = {
        method: "POST",
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const req = https.request(requestOptions, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(`Slack API Error: ${res.statusCode} - ${responseBody}`)
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Failed to send to Slack: ${error.message}`));
      });

      req.write(payload);
      req.end();
    } catch (error: any) {
      reject(new Error(`Error initializing Slack request: ${error.message}`));
    }
  });
}

async function getKandelReport(
  client: any,
  kandelAddress: Address,
  market: any,
  chainName: string,
  currentProcessedState: ProcessedKandelState
): Promise<string[]> {
  const logs: string[] = [];
  const PRICE_DISPLAY_FIXED_DECIMALS = 8;

  if (!market) {
    console.error(
      "CRITICAL: 'market' object is null/undefined at start of getKandelReport."
    );
    // Early exit or throw if market is crucial and missing
    logs.push("ERROR: Market details unavailable for report generation.");
    return logs;
  }

  logs.push(`Kandel Report for ${kandelAddress} on chain: ${chainName}`);
  logs.push(`Market: ${market.base.symbol}/${market.quote.symbol}`);
  logs.push(`Timestamp: ${new Date().toLocaleString()}`);
  logs.push(`------------------------------------`);

  let kandelBestAskGivesBaseQtySmallestUnits: bigint | undefined;
  let kandelBestBidGivesQuoteQtySmallestUnits: bigint | undefined;
  let kandelNumericBestAskPrice: Big | undefined;
  let kandelNumericBestBidPrice: Big | undefined;

  try {
    // Use the provided processed state
    const state = currentProcessedState;

    logs.push(`Kandel Status: ${state.kandelStatus}`);
    logs.push(`Configured Price Points (per side): ${state.pricePoints}`);
    logs.push(`------------------------------------`);
    // Use counts from processed state
    logs.push(`Total Asks in state: ${state.asks.length}`);
    logs.push(`Total Bids in state: ${state.bids.length}`);
    logs.push(`------------------------------------`);
    logs.push(`Populated Asks (gives > 0): ${state.populatedAsksCount}`);
    logs.push(`Populated Bids (gives > 0): ${state.populatedBidsCount}`);
    logs.push(`------------------------------------`);

    if (state.populatedAsksCount > 0) {
      const bestAskOffer = state.asks
        .filter((ask) => ask.gives > 0n && ask.price) // Ensure price is available
        .reduce((prev, current) =>
          prev.price!.lt(current.price!) ? prev : current
        ); // Lowest price is best ask
      kandelNumericBestAskPrice = bestAskOffer.price;
      const displayAskPrice = getDisplayPriceString(
        kandelNumericBestAskPrice,
        market
      );
      logs.push(
        `Kandel Best Ask Price: ${displayAskPrice} ${
          market?.quote?.symbol || "Quote"
        }/${market?.base?.symbol || "Base"}`
      );
      logs.push(
        `Kandel Best Ask Quantity (Base): ${formatBase(
          bestAskOffer.gives,
          market
        )}`
      );
      kandelBestAskGivesBaseQtySmallestUnits = bestAskOffer.gives;
    } else {
      logs.push(`Kandel Best Ask Price: N/A (No populated asks)`);
      logs.push(`Kandel Best Ask Quantity (Base): N/A`);
      kandelNumericBestAskPrice = undefined;
    }

    if (state.populatedBidsCount > 0) {
      const bestBidOffer = state.bids
        .filter((bid) => bid.gives > 0n && bid.price) // Ensure price is available
        .reduce((prev, current) =>
          prev.price!.gt(current.price!) ? prev : current
        ); // Highest price is best bid
      kandelNumericBestBidPrice = bestBidOffer.price;
      const displayBidPrice = getDisplayPriceString(
        kandelNumericBestBidPrice,
        market
      );
      logs.push(
        `Kandel Best Bid Price: ${displayBidPrice} ${
          market?.quote?.symbol || "Quote"
        }/${market?.base?.symbol || "Base"}`
      );
      logs.push(
        `Kandel Best Bid Quantity (Quote): ${formatQuote(
          bestBidOffer.gives,
          market
        )}`
      );
      kandelBestBidGivesQuoteQtySmallestUnits = bestBidOffer.gives;
    } else {
      logs.push(`Kandel Best Bid Price: N/A (No populated bids)`);
      logs.push(`Kandel Best Bid Quantity (Quote): N/A`);
      kandelNumericBestBidPrice = undefined;
    }
    logs.push(`------------------------------------`);

    logs.push(`Total Base in Offers: ${formatBase(state.baseAmount, market)}`);
    logs.push(
      `Total Quote in Offers: ${formatQuote(state.quoteAmount, market)}`
    );
    logs.push(`Reserve Base : ${formatBase(state.reserveBalanceBase, market)}`);
    logs.push(
      `Reserve Quote : ${formatQuote(state.reserveBalanceQuote, market)}`
    );
  } catch (error: any) {
    // This catch might be redundant if currentProcessedState is guaranteed to be valid
    // Or if errors are handled during its creation.
    const errorMessage = `Error processing Kandel state for report: ${error.message}`;
    logs.push(`ERROR: ${errorMessage}`);
    console.error(errorMessage, error);
  }
  logs.push(`------------------------------------`);

  // Helper function for price comparison logs
  const getPriceComparisonLog = (
    price1: Big | undefined,
    name1: string,
    price2: Big | undefined,
    name2: string,
    preferLower: boolean // true for asks (cheaper is better), false for bids (higher is better)
  ): string => {
    const p1Str = price1 ? price1.toFixed(PRICE_DISPLAY_FIXED_DECIMALS) : "N/A";
    const p2Str = price2 ? price2.toFixed(PRICE_DISPLAY_FIXED_DECIMALS) : "N/A";

    if (price1 && price2) {
      if (price1.eq(price2)) {
        return `    🤝 Similar price on ${name1} & ${name2} (${p1Str})`;
      }
      if (preferLower) {
        return price1.lt(price2)
          ? `    ✅ Cheaper on ${name1} (${p1Str}) vs ${name2} (${p2Str})`
          : `    ✅ Cheaper on ${name2} (${p2Str}) vs ${name1} (${p1Str})`;
      } else {
        // prefer higher
        return price1.gt(price2)
          ? `    📈 Better on ${name1} (${p1Str}) vs ${name2} (${p2Str})`
          : `    📈 Better on ${name2} (${p2Str}) vs ${name1} (${p1Str})`;
      }
    } else if (price1) {
      return `    ${name1} price: ${p1Str} (${name2} price N/A)`;
    } else if (price2) {
      return `    ${name2} price: ${p2Str} (${name1} price N/A)`;
    } else {
      return `    Prices not available for comparison from ${name1} or ${name2}.`;
    }
  };

  // Fetch and add Balancer V3 data
  try {
    // For simplicity in this step, we'll assume Balancer data fetching happens elsewhere or is passed in.
    // Let's simulate that it's passed or handled.
    // If Balancer calls are made here, client needs to be re-introduced as a parameter.

    // console.log(
    //   `Kandel Monitor: Fetching Balancer V3 price data for ${market.base.symbol}/${market.quote.symbol}...`
    // );
    // const balancerData: BalancerPriceInfo = await getBalancerPriceData(
    //   client, // This \'client\' would need to be passed to getKandelReport
    //   market,
    //   kandelBestAskGivesBaseQtySmallestUnits,
    //   kandelBestBidGivesQuoteQtySmallestUnits
    // );
    // console.log("Kandel Monitor: Balancer V3 data fetched.");

    // TEMPORARY: Simulate Balancer data or assume it's fetched by the caller of getKandelReport
    // For now, we'll just skip the Balancer section if the client isn't passed in
    // This is a placeholder until client handling is clarified for this refactored function.
    if (client) {
      // Check if client is available
      console.log(
        `Kandel Monitor: Fetching Balancer V3 price data for ${market.base.symbol}/${market.quote.symbol}...`
      );
      const balancerData: BalancerPriceInfo = await getBalancerPriceData(
        client, // Use the passed-in client
        market,
        kandelBestAskGivesBaseQtySmallestUnits,
        kandelBestBidGivesQuoteQtySmallestUnits
      );
      console.log("Kandel Monitor: Balancer V3 data fetched.");

      if (balancerData.error) {
        logs.push(`Balancer V3 Data Error: ${balancerData.error}`);
      } else {
        logs.push(`Balancer V3 Information:`);
        if (balancerData.balancerMarginalPrice_QuotePerBase) {
          logs.push(
            `  Marginal Price (${market.quote.symbol}/${market.base.symbol}): ${balancerData.balancerMarginalPrice_QuotePerBase}`
          );
        } else {
          logs.push(`  Marginal Price: Not available`);
        }
        if (balancerData.balancerBidPrice_BaseToken_QuotePerBase) {
          logs.push(
            `  Balancer Bid Price (for ${market.base.symbol}, in ${market.quote.symbol}): ${balancerData.balancerBidPrice_BaseToken_QuotePerBase}`
          );
        } else {
          logs.push(
            `  Balancer Bid Price (for ${market.base.symbol}): Not available`
          );
        }
        if (balancerData.balancerAskPrice_BaseToken_QuotePerBase) {
          logs.push(
            `  Balancer Ask Price (for ${market.base.symbol}, in ${market.quote.symbol}): ${balancerData.balancerAskPrice_BaseToken_QuotePerBase}`
          );
        } else {
          logs.push(
            `  Balancer Ask Price (for ${market.base.symbol}): Not available`
          );
        }

        // Price Comparison & Arbitrage Insights Section
        logs.push(`------------------------------------`);
        logs.push(
          `Price Comparison & Arbitrage Insights (${market.base.symbol}/${market.quote.symbol}):`
        );

        const balancerNumericAskPrice =
          balancerData.balancerAskPrice_BaseToken_QuotePerBase
            ? new Big(balancerData.balancerAskPrice_BaseToken_QuotePerBase)
            : undefined;
        const balancerNumericBidPrice =
          balancerData.balancerBidPrice_BaseToken_QuotePerBase
            ? new Big(balancerData.balancerBidPrice_BaseToken_QuotePerBase)
            : undefined;

        // Buying Base Token (Lower Ask is Better)
        logs.push(`  🛒 Buying ${market.base.symbol}:`);
        logs.push(
          getPriceComparisonLog(
            kandelNumericBestAskPrice,
            "Kandel",
            balancerNumericAskPrice,
            "Balancer",
            true // Prefer lower for asks
          )
        );

        // Selling Base Token (Higher Bid is Better)
        logs.push(`  💰 Selling ${market.base.symbol}:`);
        logs.push(
          getPriceComparisonLog(
            kandelNumericBestBidPrice,
            "Kandel",
            balancerNumericBidPrice,
            "Balancer",
            false // Prefer higher for bids
          )
        );

        // Arbitrage Check
        let arbitrageFound = false;
        if (
          kandelNumericBestAskPrice &&
          balancerNumericBidPrice &&
          kandelNumericBestAskPrice.lt(balancerNumericBidPrice)
        ) {
          logs.push(
            `    🤑 ARBITRAGE: Buy ${
              market.base.symbol
            } on Kandel (ask: ${kandelNumericBestAskPrice.toFixed(
              PRICE_DISPLAY_FIXED_DECIMALS
            )}) and sell on Balancer (bid: ${balancerNumericBidPrice.toFixed(
              PRICE_DISPLAY_FIXED_DECIMALS
            )})!`
          );
          arbitrageFound = true;
        }
        if (
          balancerNumericAskPrice &&
          kandelNumericBestBidPrice &&
          balancerNumericAskPrice.lt(kandelNumericBestBidPrice)
        ) {
          logs.push(
            `    🤑 ARBITRAGE: Buy ${
              market.base.symbol
            } on Balancer (ask: ${balancerNumericAskPrice.toFixed(
              PRICE_DISPLAY_FIXED_DECIMALS
            )}) and sell on Kandel (bid: ${kandelNumericBestBidPrice.toFixed(
              PRICE_DISPLAY_FIXED_DECIMALS
            )})!`
          );
          arbitrageFound = true;
        }
        if (!arbitrageFound) {
          logs.push(
            `    🧐 No direct arbitrage opportunity detected between Kandel best prices and Balancer exec prices.`
          );
        }
      }
    } else {
      logs.push(
        "Balancer V3 data fetching skipped (client not available to report function)."
      );
    }
  } catch (balancerError: any) {
    logs.push(`Failed to fetch Balancer V3 data: ${balancerError.message}`);
    console.error("Error calling getBalancerPriceData:", balancerError);
  }
  logs.push(`------------------------------------`);

  return logs;
}

// Function to process raw Kandel state and calculate prices for all offers
async function processKandelState(
  client: any,
  kandelAddress: Address,
  market: any,
  mangroveDefaultParams: any // Changed from mangroveAddress to mangroveDefaultParams
): Promise<ProcessedKandelState | null> {
  if (!market || !market.base || !market.quote) {
    console.error(
      "Kandel Monitor: Market details incomplete in processKandelState."
    );
    return null;
  }

  try {
    const rawState = await client
      .extend(kandelActions(mangroveDefaultParams, market, kandelAddress)) // Use mangroveDefaultParams directly
      .getKandelState();

    const processedAsks: ProcessedKandelOffer[] = rawState.asks.map(
      (ask: KandelOffer) => ({
        ...ask,
        price: calculateKandelOfferPrice(ask, market, "asks"),
        givesBase: true,
      })
    );

    const processedBids: ProcessedKandelOffer[] = rawState.bids.map(
      (bid: KandelOffer) => ({
        ...bid,
        price: calculateKandelOfferPrice(bid, market, "bids"),
        givesBase: false,
      })
    );

    return {
      kandelStatus: rawState.kandelStatus,
      pricePoints: rawState.pricePoints,
      asks: processedAsks,
      bids: processedBids,
      baseAmount: rawState.baseAmount,
      quoteAmount: rawState.quoteAmount,
      reserveBalanceBase: rawState.reserveBalanceBase,
      reserveBalanceQuote: rawState.reserveBalanceQuote,
      populatedAsksCount: processedAsks.filter((o) => o.gives > 0n).length,
      populatedBidsCount: processedBids.filter((o) => o.gives > 0n).length,
    };
  } catch (error: any) {
    console.error(
      `Kandel Monitor: Failed to fetch or process Kandel state for ${kandelAddress}: ${error.message}`
    );
    return null;
  }
}

// Function to check for executions by comparing current and previous states
function checkForExecutions(
  currentState: ProcessedKandelState,
  previousState: ProcessedKandelState | null,
  market: any
): string[] {
  const executionLogs: string[] = [];
  if (!previousState) {
    return executionLogs; // No previous state to compare against
  }

  const findOfferById = (
    offers: ProcessedKandelOffer[],
    id: bigint
  ): ProcessedKandelOffer | undefined => {
    return offers.find((offer) => offer.id === id);
  };

  // Check Asks (Kandel selling base, receiving quote)
  previousState.asks.forEach((prevAsk) => {
    if (prevAsk.gives === 0n) return; // Skip empty offers from previous state

    const currentAsk = findOfferById(currentState.asks, prevAsk.id);
    const priceStr = prevAsk.price
      ? getDisplayPriceString(prevAsk.price, market, 6)
      : "N/A";

    if (!currentAsk || currentAsk.gives < prevAsk.gives) {
      const executedAmountBase = currentAsk
        ? prevAsk.gives - currentAsk.gives
        : prevAsk.gives;
      const executedAmountQuote = prevAsk.price
        ? new Big(formatUnits(executedAmountBase, market.base.decimals)).times(
            prevAsk.price
          )
        : null;
      const quoteReceivedStr = executedAmountQuote
        ? `${executedAmountQuote.toFixed(market.quote.decimals)} ${
            market.quote.symbol
          }`
        : "N/A";

      executionLogs.push(
        `  🔴 Ask Executed (ID ${prevAsk.id}): Sold ${formatBase(
          executedAmountBase,
          market
        )} at ~${priceStr} ${market.quote.symbol}/${
          market.base.symbol
        }. Received ~${quoteReceivedStr}. ${
          !currentAsk ? "(Fully)" : "(Partially)"
        }`
      );
    }
  });

  // Check Bids (Kandel buying base, paying quote)
  previousState.bids.forEach((prevBid) => {
    if (prevBid.gives === 0n) return; // Skip empty offers

    const currentBid = findOfferById(currentState.bids, prevBid.id);
    const priceStr = prevBid.price
      ? getDisplayPriceString(prevBid.price, market, 6)
      : "N/A";

    if (!currentBid || currentBid.gives < prevBid.gives) {
      const executedAmountQuote = currentBid
        ? prevBid.gives - currentBid.gives
        : prevBid.gives; // This is 'gives' in quote for bids
      const executedAmountBase = prevBid.price
        ? new Big(formatUnits(executedAmountQuote, market.quote.decimals)).div(
            prevBid.price.eq(0) ? 1 : prevBid.price // Avoid division by zero
          )
        : null;
      const baseReceivedStr = executedAmountBase
        ? `${executedAmountBase.toFixed(market.base.decimals)} ${
            market.base.symbol
          }`
        : "N/A";

      executionLogs.push(
        `  🟢 Bid Executed (ID ${
          prevBid.id
        }): Bought ~${baseReceivedStr} at ~${priceStr} ${market.quote.symbol}/${
          market.base.symbol
        }. Paid ${formatQuote(executedAmountQuote, market)}. ${
          !currentBid ? "(Fully)" : "(Partially)"
        }`
      );
    }
  });

  return executionLogs;
}

async function monitorKandelOffers() {
  console.log(
    `Initializing Kandel Monitor for ${kandelAddress} on chain: ${chainName}`
  );
  console.log(`Monitoring interval: ${intervalMinutes} minutes.`);
  if (slackWebhookUrl) {
    console.log(`Slack notifications will be sent if a webhook URL is active.`);
  } else {
    console.log(
      "Slack Webhook URL not configured. Notifications will only be to console."
    );
  }

  const client = createPublicClient({
    transport: http(rpcUrl),
    chain: chainEntry.chain,
  });

  console.log("Kandel Monitor: Getting Kandel market details...");
  const market = await getKandelMarket(
    client,
    kandelAddress,
    chainEntry.mangrove
  );

  if (!market) {
    const errorMsg = `Market not found for Kandel ${kandelAddress}. Exiting.`;
    console.error(errorMsg);
    if (slackWebhookUrl) {
      try {
        await sendToSlack(
          slackWebhookUrl,
          `🚨 Kandel Monitor Alert 🚨\n${errorMsg}`
        );
      } catch (slackError: any) {
        console.error(
          "Failed to send initial error to Slack:",
          slackError.message
        );
      }
    }
    process.exit(1);
  }
  console.log(`Found market: ${market.base.symbol}/${market.quote.symbol}`);

  let previousProcessedState: ProcessedKandelState | null = null;

  const performCheck = async () => {
    const checkTime = new Date().toISOString();
    console.log(
      `\n[${checkTime}] Kandel Monitor: Performing check for ${kandelAddress}...`
    );

    const currentProcessedState = await processKandelState(
      client,
      kandelAddress,
      market,
      chainEntry.mangrove
    );

    if (!currentProcessedState) {
      console.error(
        `[${checkTime}] Kandel Monitor: Failed to process current Kandel state. Skipping check.`
      );
      // Optionally send a Slack alert about the failure to process state
      if (slackWebhookUrl) {
        try {
          await sendToSlack(
            slackWebhookUrl,
            `🚨 Kandel Monitor Alert (${kandelAddress} on ${chainName}) 🚨\nFailed to process Kandel state at ${checkTime}. Check logs.`
          );
        } catch (slackError: any) {
          console.error(
            `[${checkTime}] Kandel Monitor: Failed to send Slack alert about state processing failure:`,
            slackError.message
          );
        }
      }
      return; // Skip further processing if state is null
    }

    // --------------- START DEBUG LOGGING ---------------
    console.log("DEBUG: Previous State Offers (IDs, Gives, Prices):");
    if (previousProcessedState) {
      console.log(
        "  Asks:",
        previousProcessedState.asks.map((o) => ({
          id: o.id.toString(),
          gives: o.gives.toString(),
          price: o.price?.toString(),
        }))
      );
      console.log(
        "  Bids:",
        previousProcessedState.bids.map((o) => ({
          id: o.id.toString(),
          gives: o.gives.toString(),
          price: o.price?.toString(),
        }))
      );
    } else {
      console.log("  No previous state.");
    }
    console.log("DEBUG: Current State Offers (IDs, Gives, Prices):");
    if (currentProcessedState) {
      console.log(
        "  Asks:",
        currentProcessedState.asks.map((o) => ({
          id: o.id.toString(),
          gives: o.gives.toString(),
          price: o.price?.toString(),
        }))
      );
      console.log(
        "  Bids:",
        currentProcessedState.bids.map((o) => ({
          id: o.id.toString(),
          gives: o.gives.toString(),
          price: o.price?.toString(),
        }))
      );
    } else {
      // This case should be covered by the !currentProcessedState check above, but good for completeness
      console.log("  Current state is null (should not happen here).");
    }
    // --------------- END DEBUG LOGGING -----------------

    // Check for executions
    const executionLogs = checkForExecutions(
      currentProcessedState,
      previousProcessedState,
      market
    );

    if (executionLogs.length > 0) {
      const executionReportTitle = `*🔔 Kandel Executions Detected - ${kandelAddress} (${chainName}) - ${new Date().toLocaleString()}*`;
      const executionReport =
        executionReportTitle + "\n```\n" + executionLogs.join("\n") + "\n```";
      console.log("\n--- Kandel Executions ---");
      console.log(executionLogs.join("\n"));
      console.log("-------------------------");
      if (slackWebhookUrl) {
        try {
          await sendToSlack(slackWebhookUrl, executionReport);
          console.log(
            `[${checkTime}] Kandel Monitor: Execution report sent to Slack.`
          );
        } catch (error: any) {
          console.error(
            `[${checkTime}] Kandel Monitor: Failed to send execution report to Slack:`,
            error.message
          );
        }
      }
    }

    // Generate the main report
    const reportLines = await getKandelReport(
      client,
      kandelAddress,
      market,
      chainName,
      currentProcessedState
    );
    const reportMessage = reportLines.join("\n");

    console.log(reportMessage);

    if (slackWebhookUrl) {
      const slackMessage = `*Kandel Monitor Report - ${kandelAddress} (${chainName})*\n\`\`\`\n${reportMessage}\n\`\`\``;
      try {
        await sendToSlack(slackWebhookUrl, slackMessage);
        console.log(`[${checkTime}] Kandel Monitor: Report sent to Slack.`);
      } catch (error: any) {
        console.error(
          `[${checkTime}] Kandel Monitor: Failed to send report to Slack:`,
          error.message
        );
      }
    }

    // Update previous state for the next check
    previousProcessedState = currentProcessedState;
  };

  await performCheck();
  setInterval(performCheck, intervalMilliseconds);

  console.log(
    `\nKandel Monitor: Running. Next check in ${intervalMinutes} minutes. Press Ctrl+C to stop.`
  );
}

monitorKandelOffers();
