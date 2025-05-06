# memo PRL market May 1st, 2025

## price questions

order of magnitude of price of PRL ~ 10^-6 ETH
1 PRL is a microETH token (penny token)


### PRL addresses

PRL is an evolution of the [https://www.coingecko.com/fr/coins/mimo-governance-token].

It can be traded on multiple chains, and is a -layer zero- token

```python
baseAddress =  0xfD28f108e95f4D41daAE9dbfFf707D677985998E
sonicAddress = 0xfD28f108e95f4D41daAE9dbfFf707D677985998E
ethAdress =    0x6c0aeceeDc55c9d55d8B99216a670D85330941c3
```


### markets where PRL is traded

**base:**

+ Mangrove [PRL/WETH market on Base](https://app.mangrove.exchange/trade?market=0xfd28f108e95f4d41daae9dbfff707d677985998e%2C0x4200000000000000000000000000000000000006%2C1)

+ Balancer [weighted pool on Base]( https://balancer.fi/pools/base/v3/0x19e3e19945e7fd2a7856824c595981c7fe450bb5)

**sonic:** 
Beets (Balancer) [pool on Sonic](https://beets.fi/pools/sonic/v3/0xaf284b903bd355ebbe6ab88638b0c5a64774b86b)


### Base Balancer pool

[https://balancer.fi/pools/base/v3/0x19e3e19945e7fd2a7856824c595981c7fe450bb5]

weighted pool with parameters:

```python
fee    = 0.01 # 1%

# May 5
w_eth  = 19.85 # 20%
w_prl  = 80.15 # 80%
X_eth  = 3.1251
X_prl  = 9.537269  # in units of 1M

# on met 4 fois plus de PRL (mesuré en ETH parex)
# interet = moins besoin de cash
# rappel: principe du LBP decroitre le w_prl jusqu'a 1%
grossMarginalPrice = (X_eth/X_prl) * (w_prl/w_eth)
topBidBalancer = grossMarginalPrice * (1 - fee) # 1.309839541899731e-6
topAskM = 1.204292222957451
```
(May 5) so there is a buy-on-M/sell-on-B arb for sizeArb = 0.22e6 PRL

### Mangrove PRL/WETH market

#### size constraints

limit order has a minimum of 9000 PRL and 0.008590 WETH

#### view

```bash
bun cli view $KI
```

```python
┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
│    │ type │ price                    │ gives                         │ tick     │ provision  │
├────┼──────┼──────────────────────────┼───────────────────────────────┼──────────┼────────────┤
│  0 │ bids │ 3.408390655373014e-7     │ 0.145 WETH                    │ 148926n  │ 0.00000378 │
│  1 │ bids │ 3.5831336239036525e-7    │ 0.145 WETH                    │ 148426n  │ 0.00000378 │
│  2 │ bids │ 3.766835396790465e-7     │ 0.145 WETH                    │ 147926n  │ 0.00000378 │
│  3 │ bids │ 3.95995527821128e-7      │ 0.145 WETH                    │ 147426n  │ 0.00000378 │
│  4 │ bids │ 4.162976120165642e-7     │ 0.145 WETH                    │ 146926n  │ 0.00000378 │
│  5 │ bids │ 4.376405529735565e-7     │ 0.145 WETH                    │ 146426n  │ 0.00000378 │
│  6 │ bids │ 4.600777138240694e-7     │ 0.145 WETH                    │ 145926n  │ 0.00000378 │
│  7 │ bids │ 4.836651935461111e-7     │ 0.145 WETH                    │ 145426n  │ 0.00000378 │
│  8 │ bids │ 5.084619672263697e-7     │ 0.145 WETH                    │ 144926n  │ 0.00000378 │
│  9 │ bids │ 5.345300335139005e-7     │ 0.145 WETH                    │ 144426n  │ 0.00000378 │
│ 10 │ bids │ 5.619345696335368e-7     │ 0.145 WETH                    │ 143926n  │ 0.00000378 │
│ 11 │ bids │ 5.907440943466025e-7     │ 0.145 WETH                    │ 143426n  │ 0.00000378 │
│ 12 │ bids │ 6.210306392663695e-7     │ 0.145 WETH                    │ 142926n  │ 0.00000378 │
│ 13 │ bids │ 6.528699289565969e-7     │ 0.145 WETH                    │ 142426n  │ 0.00000378 │
│ 14 │ bids │ 6.863415702634462e-7     │ 0.145 WETH                    │ 141926n  │ 0.00000378 │
│ 15 │ bids │ 7.215292513541541e-7     │ 0.145 WETH                    │ 141426n  │ 0.00000378 │
│ 16 │ bids │ 7.585209509601125e-7     │ 0.145 WETH                    │ 140926n  │ 0.00000378 │
│ 17 │ bids │ 7.974091583475215e-7     │ 0.145 WETH                    │ 140426n  │ 0.00000378 │
│ 18 │ bids │ 8.382911045656009e-7     │ 0.145 WETH                    │ 139926n  │ 0.00000378 │
│ 19 │ bids │ 8.812690055505422e-7     │ 0.145 WETH                    │ 139426n  │ 0.00000378 │
│ 20 │ bids │ 9.264503176930297e-7     │ 0.011988484241373057 WETH     │ 138926n  │ 0.00000378 │
├────┼──────┼──────────────────────────┼───────────────────────────────┼──────────┼────────────┤
│ 60 │ asks │ 9.739480065083148e-7     │ 231524.152345385226935138 PRL │ -138426n │ 0.00000378 │
│ 61 │ asks │ 0.0000010238808290805955 │ 244858.549718443757329121 PRL │ -137926n │ 0.00000378 │
│ 62 │ asks │ 0.0000010763736309878857 │ 244858.549718443757329121 PRL │ -137426n │ 0.00000378 │
│ 63 │ asks │ 0.0000011315576584497673 │ 244858.549718443757329121 PRL │ -136926n │ 0.00000378 │
│ 64 │ asks │ 0.0000011895708864784807 │ 244858.549718443757329121 PRL │ -136426n │ 0.00000378 │
│ 65 │ asks │ 0.0000012505583638538179 │ 244858.549718443757329121 PRL │ -135926n │ 0.00000378 │
│ 66 │ asks │ 0.000001314672575784351  │ 244858.549718443757329121 PRL │ -135426n │ 0.00000378 │
│ 67 │ asks │ 0.000001382073825161746  │ 244858.549718443757329121 PRL │ -134926n │ 0.00000378 │
│ 68 │ asks │ 0.0000014529306333613997 │ 244858.549718443757329121 PRL │ -134426n │ 0.00000378 │
│ 69 │ asks │ 0.0000015274201615915157 │ 244858.549718443757329121 PRL │ -133926n │ 0.00000378 │
│ 70 │ asks │ 0.0000016057286538440971 │ 244858.549718443757329121 PRL │ -133426n │ 0.00000378 │
│ 71 │ asks │ 0.0000016880519025553618 │ 244858.549718443757329121 PRL │ -132926n │ 0.00000378 │
│ 72 │ asks │ 0.0000017745957381398523 │ 244858.549718443757329121 PRL │ -132426n │ 0.00000378 │
│ 73 │ asks │ 0.0000018655765436222098 │ 244858.549718443757329121 PRL │ -131926n │ 0.00000378 │
│ 74 │ asks │ 0.0000019612217956533317 │ 244858.549718443757329121 PRL │ -131426n │ 0.00000378 │
│ 75 │ asks │ 0.0000020617706332635988 │ 244858.549718443757329121 PRL │ -130926n │ 0.00000378 │
│ 76 │ asks │ 0.0000021674744557752077 │ 244858.549718443757329121 PRL │ -130426n │ 0.00000378 │
│ 77 │ asks │ 0.0000022785975513685557 │ 244858.549718443757329121 PRL │ -129926n │ 0.00000378 │
│ 78 │ asks │ 0.000002395417757874259  │ 244858.549718443757329121 PRL │ -129426n │ 0.00000378 │
│ 79 │ asks │ 0.000002518227157442967  │ 244858.549718443757329121 PRL │ -128926n │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘
```

### top of the book

```python
┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
│    │ type │ price                    │ amount                        │ tick     │ provision  │
├────┼──────┼──────────────────────────┼───────────────────────────────┼──────────┼────────────┤
│ 17 │ bids │ 8.75909894473427e-7      │ 0.153157894736842105 WETH     │ 139487n  │ 0.00000378 │
│ 18 │ bids │ 8.935142031197383e-7     │ 0.153157894736842105 WETH     │ 139288n  │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘
┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
│ 59 │ asks │ 9.297913820940417e-7     │ 232563.619047619047619047 PRL │ -138890n │ 0.00000378 │
│ 60 │ asks │ 9.484786175852039e-7     │ 232563.619047619047619047 PRL │ -138691n │ 0.00000378 │
│ 61 │ asks │ 9.675414349294863e-7     │ 232563.619047619047619047 PRL │ -138492n │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘

# May 4
┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
| 28 │ bids │ 0.0000010902390697125094 │ 0.258645869063567034 WETH     │ 137298n  │ 0.00000378 │
│ 29 │ bids │ 0.0000011121510325783068 │ 0.093141241186723575 WETH     │ 137099n  │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘
┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
│ 69 │ asks │ 0.0000011345033888678686 │ 150464.929787809523809517 PRL │ -136900n │ 0.00000378 │
│ 70 │ asks │ 0.0000011573049897447748 │ 232563.619047619047619047 PRL │ -136701n │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘

┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
| 29 │ bids │ 0.0000011121510325783068 │ 0.263844213936502042 WETH     │ 137099n  │ 0.00000378 │
│ 30 │ bids │ 0.0000011345033888678686 │ 0.014108596408317795 WETH     │ 136900n  │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘
┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
| 70 │ asks │ 0.0000011573049897447748 │ 220372.712991428571428564 PRL │ -136701n │ 0.00000378 │
│ 71 │ asks │ 0.0000011805648642660363 │ 232563.619047619047619047 PRL │ -136502n │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘

┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
| 30 │ bids │ 0.0000011345033888678686 │ 0.269147036756507328 WETH     │ 136900n  │ 0.00000378 │
│ 31 │ bids │ 0.0000011573049897447748 │ 0.094606433808848565 WETH     │ 136701n  │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘
┌────┬──────┬──────────────────────────┬───────────────────────────────┬──────────┬────────────┐
| 71 | asks │ 0.0000011805648642660363 │ 152427.036406047619047611 PRL │ -136502n │ 0.00000378 │
│ 72 │ asks │ 0.000001204292222957451  │ 232563.619047619047619047 PRL │ -136303n │ 0.00000378 │
└────┴──────┴──────────────────────────┴───────────────────────────────┴──────────┴────────────┘
 ```


## setting env variables

export RPC_URL=https://...
export PRIVATE_KEY=0x...
export KI=0x...

exported in .ev.local (listed in .gitgnore)

```zsh
source .env.local
```

```bash
bun --help 
```


## set-range.ts

bun run src/bots/set-range.ts --kandel 0x4a2b7f1c3d8e5c6f9e5b8a2c3d8e5c6f9e5b8a2c --rpc-url https://rpc.base.org --private-key 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef



### methodology

lax configuration: 21 bids/20 asks, ratio = 5%
tense configuration = venez lister chez nous: 21 bids/20 asks, ratio = 1%

construire la fonction p -> x(p),y(p)
comparer à la fonction Balancer et faire mieux

### balances

```bash
bun cli balances $KI
```



### transitions

#### retract

```bash
bun run src/index.ts retract $KI
Retracted kandel in tx 0x0b96263dc27f44298ce2c686c794d940569939ff0fe8c2e538d13c2ba2333e4b
```

CV: pas besoin de retract si on augmente le nombre de price points;
sinon il faut retract d'abord!

pas besoins de calculer la provision

--leave-funds = laisse les assets sur Kandle [mieux sauf si on veut swapper], --leave-provision = pareil avec les provisions


#### populate

Arguments:
  kandel                           Kandel address
  price-points                     Number of price points
  min-price                        Minimum price
  mid-price                        Current price
  max-price                        Maximum price

NB: we prefer the *in-out* presentation with `p_0 r^i` pour `i = -N, ..., N`

```python
midPrice = 0.9298820398243415e-6 # given by Balancer
pricePoints = 41 # demi price-points
ratio = 1.01
minPrice = midPrice * ratio ** (-40)
maxPrice = midPrice * ratio ** (+40)
print(minPrice, "\n", maxPrice)
qtyQuote = 2.91 # ETH
qtyBase  = 4883836 # PRL
```

```bash
bun cli populate $KI 41 minPrice midPrice maxPrice --provision 0.005 -b 4883836 -q 2.91
```

```python
# Rappel Balancer:
X_eth =  2.5308
X_prl  = 10.05e6 #in units of 1M
dX_eth/X_eth == 4 * dX_prl/X_prl
```

si je donne 20% de la pool en ETH (buy) 0.2 = 4 * dX_prl/X_prl, je recois 5% de la pool de PRL
si on paye avec un w_in = 1/2 w_out, on obtient moitié moins de out

## Next

- [x] exit, populate plus serré que Balancer, ratio = 1%
- [ ] automate trade detections on other exchanges?
- [ ] test sequences of buy/sell trades (circular tests)
- [ ] autres instructions = re-range, replace (shift grid by price)
- [ ] market order to verify consumption 
- [ ] exit bot (condition = all bids are empty)
prendre l'etat de Kandle dans la fonction exit
- [ ] arb bot vs Balancer pool pour alignement de prix
- [ ] trouver une source de prix?
- [ ] comment gérer une microcap?
- [ ] comparer les supply curve Balancer/Kandle; utilisler la limite continue de Kandel??
definir battre Balancer (supply curve Kandle > supply curve Balancer)
definir la courbe volume-volume *net* de Balancer
a quoi correspondent les poids approximatifs?
- [ ] apprendre token zero


https://app.mangrove.exchange/trade?market=0xfd28f108e95f4d41daae9dbfff707d677985998e,0x4200000000000000000000000000000000000006,1