import axios, { AxiosError } from "axios";
import { API_INTEGRATOR_ID } from "./squid-sdk";

export async function getRoute(params: any) {
	try {
		console.log("Requesting route...");
		const result = await axios.post(
			"https://apiplus.squidrouter.com/v2/route",
			params,
			{
				headers: {
					"x-integrator-id": API_INTEGRATOR_ID,
					"Content-Type": "application/json",
				},
			}
		);
		const requestId = result.headers["x-request-id"]; // Retrieve request ID from response headers
		return { data: result.data, requestId: requestId };
	} catch (error) {
		const err = error as AxiosError;
		if (err.response) {
			console.error("API error:", error);
		}
		console.error("Error with parameters:", params);
		throw err.message;
	}
}
