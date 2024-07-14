import * as dotenv from "dotenv";
import { Provider, ethers } from "ethers";
dotenv.config();

const ARB_RPC_URL = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const BASE_RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

// Provider Functions

export function getArbitrumProvider(): Provider {
	return new ethers.JsonRpcProvider(ARB_RPC_URL);
}

export function getBaseProvider(): Provider {
	return new ethers.JsonRpcProvider(BASE_RPC_URL);
}
