import { Squid } from "@0xsquid/sdk";
import { Config } from "@0xsquid/sdk/dist/types";

export const SDK_INTEGRATOR_ID = "baat-c34ed33a-e43d-4903-8898-a62fcc1113c5";
export const API_INTEGRATOR_ID = "halo-497fab89-3145-47b1-8e06-ce2865b1a3ac";

export const SQUID_API_URL = "https://v2.api.squidrouter.com";
export const APIPLUS_SQUID_URL = "https://apiplus.squidrouter.com";

export async function getSDK(): Promise<Squid> {
	// instantiate the SDK
	const config: Config = {
		baseUrl: APIPLUS_SQUID_URL, // for mainnet use "https://api.0xsquid.com"
		integratorId: SDK_INTEGRATOR_ID,
	};

	const squid = new Squid(config);
	await squid.init();

	// init the SDK
	console.log("Squid inited");

	return squid;
}
