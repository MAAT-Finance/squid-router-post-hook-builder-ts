// This file stores web3 related constants such as addresses, token definitions, ETH currency references and ABI's

import { ChainId, Token } from "@uniswap/sdk-core";

// Addresses

export const NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const GATEWAY_ADDRESS = "0x58fDAb34aD58a750A22e5d024293Fe9f77CBe7aC";

export const USDC_TOKEN_VAULT_ADDRESS =
	"0xF08C77ac7056AD2172C8b688c80Ff8b8D93CB562";

export const POOL_FACTORY_CONTRACT_ADDRESS =
	"0x1F98431c8aD98523631AE4a59f267346ea31F984";
export const QUOTER_CONTRACT_ADDRESS =
	"0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

export const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

export const SQUID_MULTICALL_ADDRESS =
	"0xEa749Fd6bA492dbc14c24FE8A3d08769229b896c";

// Currencies and Tokens

export const ARBITRUM_EID = 30110;

export const WETH_TOKEN = new Token(
	ChainId.ARBITRUM_ONE,
	"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
	18,
	"WETH",
	"Wrapped Ether"
);

export const USDC_TOKEN = new Token(
	ChainId.ARBITRUM_ONE,
	"0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
	6,
	"USDC",
	"USD//C"
);

export const USDT_TOKEN = new Token(
	ChainId.ARBITRUM_ONE,
	"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
	6,
	"USDT",
	"Tether USD"
);

export const TOKEN_VAULT_ADDRESSES = {
	[USDC_TOKEN.address]: "0xF08C77ac7056AD2172C8b688c80Ff8b8D93CB562",
	[USDT_TOKEN.address]: "0x0dac12432d034B3fd923709FDC097B84557d0Bb4",
};
