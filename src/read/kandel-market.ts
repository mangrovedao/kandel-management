import {
  mangroveActions,
  type MangroveActionsDefaultParams,
  type MarketParams,
} from "@mangrovedao/mgv";
import { isAddressEqual, type Address, type Client } from "viem";
import { cashnesses } from "../utils/registry";
import { multicall } from "viem/actions";
import {
  kandelBaseTokenParams,
  kandelQuoteTokenParams,
  reserveBalanceParams,
  tickSpacingParams,
} from "@mangrovedao/mgv/builder";
import { BA } from "@mangrovedao/mgv/lib";

export async function getKandelMarket(
  client: Client,
  kandel: Address,
  mangrove: MangroveActionsDefaultParams
): Promise<MarketParams | null> {
  try {
    const [markets, [base, quote, tickSpacing]] = await Promise.all([
      client
        .extend(mangroveActions(mangrove))
        .getOpenMarkets({ cashnesses: cashnesses }),
      multicall(client, {
        allowFailure: false,
        contracts: [
          {
            address: kandel,
            ...kandelBaseTokenParams,
          },
          {
            address: kandel,
            ...kandelQuoteTokenParams,
          },
          {
            address: kandel,
            ...tickSpacingParams,
          },
        ],
      }),
    ]);

    return (
      markets.find(
        (m) =>
          isAddressEqual(m.base.address, base) &&
          isAddressEqual(m.quote.address, quote) &&
          m.tickSpacing === tickSpacing
      ) || null
    );
  } catch (error) {
    return null;
  }
}

export async function getPopulateData(
  client: Client,
  kandel: Address,
  mangrove: MangroveActionsDefaultParams
) {
  try {
    const [markets, [base, quote, tickSpacing, baseBalance, quoteBalance]] =
      await Promise.all([
        client
          .extend(mangroveActions(mangrove))
          .getOpenMarkets({ cashnesses: cashnesses }),
        multicall(client, {
          allowFailure: false,
          contracts: [
            {
              address: kandel,
              ...kandelBaseTokenParams,
            },
            {
              address: kandel,
              ...kandelQuoteTokenParams,
            },
            {
              address: kandel,
              ...tickSpacingParams,
            },
            {
              address: kandel,
              ...reserveBalanceParams(BA.asks),
            },
            {
              address: kandel,
              ...reserveBalanceParams(BA.bids),
            },
          ],
        }),
      ]);

    const market = markets.find(
      (m) =>
        isAddressEqual(m.base.address, base) &&
        isAddressEqual(m.quote.address, quote) &&
        m.tickSpacing === tickSpacing
    );
    if (!market) {
      return null;
    }

    return {
      market,
      baseBalance,
      quoteBalance,
    };
  } catch (error) {
    return null;
  }
}
