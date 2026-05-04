import axios from "axios";

export const GATEWAY_URL = process.env.GATEWAY_URL || "http://127.0.0.1:4080";
export const CORE_API_URL = process.env.CORE_API_URL || "http://127.0.0.1:3001";

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const request = async (url: string, method: string = "GET", data: any = null, token: string = "") => {
  try {
    const res = await axios({
      url: (url.startsWith('http') ? '' : GATEWAY_URL) + url,
      method,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      timeout: 10000
    });
    return res.data;
  } catch (err: any) {
    console.error(`[P14-ERR] ${method} ${url} FAILED:`, err?.response?.status || err.message);
    return null;
  }
};
