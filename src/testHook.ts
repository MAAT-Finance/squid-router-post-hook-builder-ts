import {
	Hex,
	createWalletClient,
	Chain,
	http,
	Address,
	erc20Abi,
	parseUnits,
	encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, base } from "viem/chains";
import { getAaveDepositPostHook } from "./postHook";
import { aavePoolAbi } from "../abi/aave-pool";
import * as dotenv from "dotenv"; // Import dotenv for environment variables

dotenv.config(); // Load environment variables from .env file

(async () => {
	const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address;
	const AAVE_POOL_PROXY_ADDR =
		"0x794a61358D6845594F94dc1DB02A252b5b4814aD" as Address;

	const user = "0x728F58cd379b47185243Ce981a514C17ed0F6Fc6";
	const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

	const wallet = createWalletClient({
		chain: arbitrum as Chain,
		transport: http(),
		account,
	});

	const hook = getAaveDepositPostHook(user, USDC_ARB as Address);

	console.log("Approving spending...");
	await wallet.writeContract({
		abi: erc20Abi,
		address: USDC_ARB,
		functionName: "approve",
		args: [AAVE_POOL_PROXY_ADDR, parseUnits("1000000", 6)],
		chain: wallet.chain,
		account: wallet.account,
	});

	console.log("Depositing...");

	await wallet.writeContract({
		abi: aavePoolAbi,
		address: AAVE_POOL_PROXY_ADDR,
		functionName: "supply",
		args: [USDC_ARB, parseUnits("1000000", 6), user, BigInt(0)],
		chain: wallet.chain,
		account: wallet.account,
		gas: 200_000,
	});
})();
