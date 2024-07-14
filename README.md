## Squid Router Complex Post Hook

Code in this repo is built to execute some calls from postHook after cross-chain or one-chain swap.

## LayerZero message sending after cross chain swap
In this example the calls after cross chain swap are:
1. Approving USDC/USDT to Uniswap SwapRouter
2. Swapping USDC/USDT to WETH in amount required to send LZ message
3. Unwrapping WETH to ETH
4. Approving to Gateway contract to make a dpeosit
5. Calling deposit() with left USDC/USDT and ETH as call value for other contract to fund LZ message with it

## Deposit after one chain swap
In second simplier example we are doing following:
1. Swapping token to USDC/USDT
2. Approving USDC/USDT to Gateway contract to deposit
3. Deposit to Gateway contract (ETH as value is not required, because token representations are minted on current chain)
