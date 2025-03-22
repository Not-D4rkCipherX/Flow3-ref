import { Keypair } from "@solana/web3.js";
import axios, { AxiosResponse } from "axios";
import bs58 from "bs58";
import * as nacl from "tweetnacl";
import UserAgent from "user-agents";
import { logMessage } from "../utils/logger";
import { getProxyAgent } from "./proxy";

const userAgent = new UserAgent().toString();

export class Flow3Referral {
  private refCode: string;
  private curentNum: number;
  private total: number;
  private proxy: string | null;
  private axiosConfig: any;
  private wallet: Keypair;

  constructor(refCode: string, proxy: string | null = null, currentNum: number, total: number,) {
    this.refCode = refCode;
    this.proxy = proxy;
    this.curentNum = currentNum;
    this.total = total;
    this.wallet = Keypair.generate();
    this.axiosConfig = {
      ...(this.proxy && { httpsAgent: getProxyAgent(this.proxy, this.curentNum, this.total) }),
      timeout: 6000000,
      headers: {
        "User-Agent": userAgent,
        Origin: "https://dashboard.flow3.tech",
        Referer: "https://dashboard.flow3.tech",
      },
    };
  }

  async makeRequest(method: string, url: string, config: any = {}, retries: number = 3): Promise<AxiosResponse | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios({
          method,
          url,
          ...this.axiosConfig,
          ...config,
        });
        return response;
      } catch (error: any) {
        if (i === retries - 1) {
          logMessage(this.curentNum, this.total, `Request failed: ${(error as any).message}`, "error");
          return null;
        }
        logMessage(this.curentNum, this.total, `Request failed: ${error.response.data}`, "error");
        logMessage(this.curentNum, this.total, `Retrying... (${i + 1}/${retries})`, "error");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    return null;
  }

  public getWallet(): { publicKey: string; secretKey: string } {
    return {
      publicKey: this.wallet.publicKey.toBase58(),
      secretKey: bs58.encode(this.wallet.secretKey),
    };
  }

  async generateSignature(message: string) {
    const messageBuffer = Buffer.from(message);
    const signature = nacl.sign.detached(messageBuffer, this.wallet.secretKey);
    const encode = bs58.encode(signature);
    return encode;
  }

  async login() {
    logMessage(this.curentNum, this.total, `Trying Register Account...`, "process");
    const message = `Please sign this message to connect your wallet to Flow 3 and verifying your ownership only.`;
    const signature = await this.generateSignature(message);
    const payload = {
      message: message,
      walletAddress: this.wallet.publicKey.toBase58(),
      signature: signature,
      referralCode: this.refCode,
    };

    try {
      const response = await this.makeRequest("POST", "https://api.flow3.tech/api/v1/user/login", {
        data: payload,
      });
      if (response?.data.statusCode === 200) {
        logMessage(this.curentNum, this.total, 'Register Account Success', "success");
        return response.data.data.refreshToken
      }
      return null
    } catch (error: any) {
      logMessage(this.curentNum, this.total, `Login failed: ${error.message}`, "error");
      return null;
    }
  }

  }
