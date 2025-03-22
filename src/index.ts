import chalk from "chalk";
import fs from "fs";
import { Flow3Referral } from "./classes/flow3";
import { getRandomProxy, loadProxies } from "./classes/proxy";
import { logMessage, prompt, rl } from "./utils/logger";

async function main(): Promise<void> {
  console.log(
    chalk.cyan(`
      FLOW3 AUTO REFER
      
      Join Telegram Channel: https://t.me/D4rkCipherX
  `)
  );

  const refCode = await prompt(chalk.yellow("Enter Referral Code: "));
  const count = parseInt(await prompt(chalk.yellow("How many do you want? ")));
  const proxiesLoaded = loadProxies();
  if (!proxiesLoaded) {
    console.log(chalk.yellow("No proxy available. Using default IP."));
  }
  let successful = 0;
  const accountsFlow = fs.createWriteStream("accounts.txt", { flags: "a" });
  const tokenAccount = fs.createWriteStream("token.txt", { flags: "a" });

  try {
    let retryCount = 0;
    const maxRetries = 3;
    while (successful < count) {
      console.log(chalk.white("-".repeat(85)));
      const currentProxy = await getRandomProxy(successful + 1, count);
      const flow = new Flow3Referral(refCode, currentProxy, successful + 1, count);

      try {
        const token = await flow.login();
        if (token) {
          const wallet = flow.getWallet();
          logMessage(successful + 1, count, `Wallet Address: ${wallet.publicKey}`, "success");
          logMessage(successful + 1, count, `Private Key: ${wallet.secretKey}`, "success");
          accountsFlow.write(`Wallet Address : ${wallet.publicKey}\nPrivate Key : ${wallet.secretKey}\n`);
          tokenAccount.write(`${wallet.secretKey}\n`);
          accountsFlow.write(`===================================================================\n`);
          successful++;
          retryCount = 0;
        }
      } catch (error) {
        logMessage(successful + 1, count, `Error: ${(error as Error).message}, retrying...`, "error");
        retryCount++;
        if (retryCount >= maxRetries) {
          console.log(chalk.red("Max retries reached, skipping..."));
          successful++;
          retryCount = 0;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

  } finally {
    accountsFlow.end();
    tokenAccount.end();
    console.log(chalk.magenta("\n[*] Done!"));
    rl.close();
  }
}

main().catch((err) => {
  console.error(chalk.red("Error occurred:"), err);
  process.exit(1);
});
