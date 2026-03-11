import { spawn, ChildProcess } from "child_process";
import type { Address, Chain, Hex } from "viem";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardhat local chain configuration
export const hardhat: Chain = {
  id: 31337,
  name: "Hardhat",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    default: {
      name: "Hardhat",
      url: "http://127.0.0.1:8545",
    },
  },
  testnet: true,
};

// Alternative Hardhat chain for parallel testing (port 8546)
export const hardhatAlt: Chain = {
  id: 31337,
  name: "Hardhat Alt",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8546"] },
  },
  blockExplorers: {
    default: {
      name: "Hardhat Alt",
      url: "http://127.0.0.1:8546",
    },
  },
  testnet: true,
};

export const hardhatAccounts: {
  privateKey: Hex;
  address: Address;
}[] = [
  {
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
  {
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  },
  {
    privateKey:
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  },
  {
    privateKey:
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  },
  {
    privateKey:
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  },
  {
    privateKey:
      "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  },
  {
    privateKey:
      "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  },
  {
    privateKey:
      "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  },
  {
    privateKey:
      "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
    address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
  },
];

class HardhatManager {
  private static instances: Map<number, HardhatManager> = new Map();
  private process: ChildProcess | null = null;
  private isRunning = false;
  private timeouts: Set<number> = new Set();
  private port: number;

  private constructor(port: number) {
    this.port = port;
  }

  static getInstance(port: number = 8545): HardhatManager {
    if (!HardhatManager.instances.has(port)) {
      HardhatManager.instances.set(port, new HardhatManager(port));
    }
    return HardhatManager.instances.get(port)!;
  }

  private addTimeout(timeout: number): number {
    this.timeouts.add(timeout);
    return timeout;
  }

  private clearAllTimeouts(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
  }

  async start(): Promise<void> {
    // If already running, just increment ref count and return
    if (this.isRunning) {
      console.log(`🔄 Hardhat node is already running`);
      return;
    }

    return this._doStart();
  }

  private async _doStart(): Promise<void> {
    if (this.isRunning) return;

    // Check if already running with more thorough validation
    if (await this.checkNodeHealth()) {
      console.log("✅ Hardhat node already running");
      this.isRunning = true;
      return;
    }

    return new Promise((resolve, reject) => {
      console.log("🚀 Starting Hardhat node...");

      // Get the package root directory (two levels up from test/hardhat)
      const packageRoot = path.resolve(__dirname, "../..");

      this.process = spawn(
        "npx",
        ["hardhat", "node", "--port", this.port.toString()],
        {
          stdio: ["ignore", "pipe", "pipe"],
          cwd: packageRoot,
          env: { ...process.env, FORCE_COLOR: "0" },
          detached: false, // 부모 프로세스와 함께 종료되도록
        },
      );

      let resolved = false;

      const cleanup = () => {
        this.process?.stdout?.removeAllListeners();
        this.process?.stderr?.removeAllListeners();
        this.process?.removeAllListeners();
      };

      this.process.stdout?.on("data", (data) => {
        const output = data.toString();

        // Do not log anything from hardhat node, only log when node is ready
        // if (
        //   // output.includes("Started HTTP and WebSocket JSON-RPC server") ||
        //   // output.includes("Account") ||
        //   // output.includes("Private Key") ||
        //   // output.includes("Hardhat Network")
        //   output.includes("WARNING")
        // ) {
        //   console.log(`Hardhat: ${output.trim()}`);
        // }

        if (
          output.includes("Started HTTP and WebSocket JSON-RPC server") &&
          !resolved
        ) {
          console.log("🔄 Server started, verifying node health...");

          const timeout = this.addTimeout(
            setTimeout(async () => {
              if (!resolved && (await this.waitForNodeReady())) {
                resolved = true;
                this.isRunning = true;
                cleanup();
                console.log("✅ Hardhat node is ready!");
                resolve();
              }
            }, 3000) as unknown as number,
          );
        }
      });

      this.process.stderr?.on("data", (data) => {
        const error = data.toString();

        // Skip npm warnings and other noise
        if (error.includes("npm warn") || error.includes("npm WARN")) {
          return;
        }

        // Only log important errors
        if (
          error.includes("EADDRINUSE") ||
          error.includes("ERROR") ||
          error.includes("FATAL") ||
          error.includes("Failed")
        ) {
          console.log(`Hardhat stderr: ${error.trim()}`);
        }

        if (error.includes("EADDRINUSE") && !resolved) {
          console.log("✅ Port already in use, verifying existing node...");

          const timeout = this.addTimeout(
            setTimeout(async () => {
              if (!resolved && (await this.waitForNodeReady())) {
                resolved = true;
                this.isRunning = true;
                cleanup();
                resolve();
              }
            }, 2000) as unknown as number,
          );
        }
      });

      this.process.on("error", (error) => {
        console.error("Process error:", error);
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(error);
        }
      });

      const mainTimeout = this.addTimeout(
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(new Error("Hardhat failed to start within 30 seconds"));
          }
        }, 30000) as unknown as number,
      );
    });
  }

  async stop(): Promise<void> {
    return this._doStop();
  }

  private async _doStop(): Promise<void> {
    if (!this.process && !this.isRunning) return;

    console.log("🛑 Stopping Hardhat node...");

    this.clearAllTimeouts();

    return new Promise((resolve) => {
      if (!this.process) {
        this.isRunning = false;
        resolve();
        return;
      }

      const cleanup = () => {
        this.isRunning = false;
        this.process = null;
        resolve();
      };

      this.process.once("exit", cleanup);

      this.process.kill("SIGTERM");

      const forceKillTimeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log("🔥 Force killing Hardhat process...");
          this.process.kill("SIGKILL");
          cleanup();
        }
      }, 3000);

      this.process.once("exit", () => {
        clearTimeout(forceKillTimeout);
      });
    });
  }

  async forceCleanup(): Promise<void> {
    console.log("🔥 Force cleanup - resetting all state");
    this.clearAllTimeouts();
    if (this.process && !this.process.killed) {
      this.process.kill("SIGKILL");
      this.process = null;
    }
    this.isRunning = false;
  }

  private async waitForNodeReady(maxRetries: number = 10): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (await this.checkNodeHealth()) {
        if (await this.verifyNodeFunctionality()) {
          return true;
        }
      }

      console.log(`⏳ Node health check ${i + 1}/${maxRetries}...`);
      await new Promise((resolve) => {
        const timeout = this.addTimeout(setTimeout(resolve, 1000) as unknown as number);
      });
    }
    return false;
  }

  private async checkNodeHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://127.0.0.1:${this.port}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return false;

      const result = await response.json();
      return result && !result.error && result.result !== undefined;
    } catch (error) {
      return false;
    }
  }

  private async verifyNodeFunctionality(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`http://127.0.0.1:${this.port}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBlockByNumber",
          params: ["0x0", false],
          id: 2,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return false;

      const result = await response.json();
      return result && !result.error && result.result !== null;
    } catch (error) {
      return false;
    }
  }

  getStatus(): boolean {
    return this.isRunning;
  }
}

export const hardhatNode = HardhatManager.getInstance(8545);
export const hardhatNodeAlt = HardhatManager.getInstance(8546);
