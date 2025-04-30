# kandel-management

To install bun, head to [bun.sh](https://bun.sh).

To install dependencies:

```bash
bun install
```

To run:

```bash
bun cli --help
```

## Possible env variables

Most of the commands will need a private key and rpc url (rpc url is optionnal). To spare passing the private key everytime, you can have those 2 arguments as environment variables:

```sh
export cosnt PRIVATE_KEY=0x...
export const RPC_URL=https://...
```

## Creating a kandel

```sh
❯ bun cli sow --help
$ bun run src/index.ts sow --help
Usage: kandel-cli sow [options]

Options:
  -k, --private-key <private-key>  Private key to use (env: PRIVATE_KEY)
  --rpc-url <rpc-url>              RPC URL to use (env: RPC_URL)
  -c, --chain <chain>              Chain to use (default: "base")
  -h, --help                       display help for command
```

Example command:

```sh
bun cli sow
```

## Populating a kandel

```sh
❯ bun cli populate --help
$ bun run src/index.ts populate --help
Usage: kandel-cli populate [options] <kandel> <price-points> <min-price> <mid-price> <max-price>

Arguments:
  kandel                           Kandel address
  price-points                     Number of price points
  min-price                        Minimum price
  mid-price                        Current price
  max-price                        Maximum price

Options:
  -g, --gas-requirement <number>   Gas requirement (default: "128000")
  -k, --private-key <private-key>  Private key to use (env: PRIVATE_KEY)
  --rpc-url <rpc-url>              RPC URL to use (env: RPC_URL)
  -c, --chain <chain>              Chain to use (default: "base")
  -b, --base-amount <number>       Base amount deposit (default: "0")
  -q, --quote-amount <number>      Quote amount deposit (default: "0")
  -p, --provision <number>         Provision to deposit in kandel (default: "0")
  -h, --help                       display help for command
```

Example command:

```sh
bun cli populate 0x71F5E2253db3edddeA95277b9403219D6F6Ab424 10 0.01 0.02 0.03 --provision 0.005
```

## Retracting a kandel

```sh
❯ bun cli retract --help
$ bun run src/index.ts retract --help
Usage: kandel-cli retract [options] <kandel>

Arguments:
  kandel                           Kandel address

Options:
  -k, --private-key <private-key>  Private key to use (env: PRIVATE_KEY)
  --rpc-url <rpc-url>              RPC URL to use (env: RPC_URL)
  -c, --chain <chain>              Chain to use (default: "base")
  --leave-funds                    Leave funds (defaults to false) (default: false)
  --leave-provision                Leave provision (defaults to false) (default: false)
  -h, --help                       display help for command
```

Example command:

```sh
bun cli retract 0x71F5E2253db3edddeA95277b9403219D6F6Ab424
```

## Viewing the kandel state

```sh
❯ bun cli view --help
$ bun run src/index.ts view --help
Usage: kandel-cli view [options] <kandel>

Arguments:
  kandel               Kandel address

Options:
  --rpc-url <rpc-url>  RPC URL to use (env: RPC_URL)
  -c, --chain <chain>  Chain to use (default: "base")
  -h, --help           display help for command
```

Example command:

```sh
bun cli view 0x71F5E2253db3edddeA95277b9403219D6F6Ab424
```

## Using bots

### Exit bot

In order to compute the exit condition, complete the `exitCondition` in `src/bots/exit.ts` and run it once ready with `bun run src/bots/exit.ts`

### Price grid move bot

In order to compute the price change condition, complete the `changePrice` in `src/bots/replace.ts` and run it once ready with `bun run src/bots/replace.ts`