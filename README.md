# SQD Pipe for ERC-721 Transfers

Decode ERC-721 NFT transfer events from Portal stream 

## What This Project Does

1. Connect to SQD Portal for efficient blockchain data retrieval
2. Stream ERC721 NFT transfer events from specified contracts
3. Process and transform blockchain log data into usable event objects

The project uses a pipe architecture that can be extended to support other EVM events beyond ERC721 transfers.

## Project Structure

```
erc721-pipe/
├── src/                  # TypeScript source files
│   ├── abi/              # ABI definitions for EVM contracts 
│   │   └── erc721.ts     # ERC721 ABI with event definitions (auto-generated)
│   ├── base.pipe.ts      # Base abstract class for all pipe implementations
│   ├── erc721.pipe.ts    # ERC721 transfer events pipe implementation
│   └── index.ts          # Main entry point
```

## How to Install

```bash
# Clone the repository
git clone <repository-url>
cd erc721-pipe

# Install dependencies
npm install
```

## How to Run

The main example in `index.ts` shows how to use the ERC721Pipe to stream transfer events from a specific contract:

```bash
# Run the development version with hot reload
npm run dev

# Or build and run the production version
npm run build
npm run start
```

## Usage Example

```typescript
import { Erc721Pipe } from "./erc721.pipe";

async function main() {
  // Initialize the pipe with SQD Portal URL for the desired network. In this examples we're using Base
  const erc721Pipe = new Erc721Pipe(
    "https://portal.sqd.dev/datasets/base-mainnet"
  );
  
  // Stream transfer events starting from block 27419255
  // for a specific contract address
  const stream = await erc721Pipe.stream({
    startBlock: 27419255,
    contractAddress: "0x3319197b0d0f8ccd1087f2d2e47a8fb7c0710171",
    // Optional filters:
    // endBlock: 27500000,  // End at a specific block
    // from: "0x...",       // Filter by sender address
    // to: "0x..."          // Filter by recipient address
  });

  // Process the stream of transfer events
  for await (const transfers of stream) {
    console.log("FOUND", transfers);
    // Each transfer has: from, to, tokenId, address properties
  }
}

main();
```

## How to Extend to Decode Other Events

### 1. Add New ABI Files

If you need to use other contract ABIs:

1. Create an ABI definition file (e.g., JSON ABI)
2. Place it in the `abi/` folder
3. Generate TypeScript interfaces using the SQD EVM typegen tool:

```bash
npx @subsquid/evm-typegen src/abi/YourContractName src/path/to/abi.json
```

### 2. Create a New Pipe Class

Create a new pipe class extending the BasePipe abstract class, similar to the ERC721Pipe:

```typescript
import { BasePipe } from "./base.pipe";
import { events } from "./abi/your-contract"; // Import your generated events
import { PortalResponse, PortalStreamData } from "@subsquid/portal-client";

// Define parameter and event interfaces
interface YourEventParams {
  startBlock: number;
  endBlock?: number;
  contractAddress?: string;
  // Add other filters as needed
}

interface YourEventData {
  // Define the structure of your decoded event
  address: string;
  // Add other properties based on your event
}

// Extend the BasePipe class
export class YourEventPipe extends BasePipe<YourEventParams, YourEventData[]> {
  constructor(portalUrl: string) {
    super(portalUrl);
  }

  public async stream(params: YourEventParams) {
    return this.getStream(params).pipeThrough(
      new TransformStream<PortalStreamData<BlockData>, YourEventData[]>({
        transform: async ({ blocks }, controller) => {
          if (!blocks.length) return;

          const events = blocks
            .flatMap(({ logs }) => {
              if (!logs) return;
              
              return logs
                .filter((log) => {
                  // Use your event signature/topic to filter logs
                  return yourEvents.YourEvent.is(log);
                })
                .map((log) => ({
                  // Decode the log data
                  ...yourEvents.YourEvent.decode(log),
                  address: log.address,
                }));
            })
            .filter((event) => !!event);

          controller.enqueue(events);
        },
      })
    );
  }

  private getStream(params: YourEventParams) {
    return this.portalClient.getStream({
      type: "evm",
      fromBlock: params.startBlock,
      toBlock: params.endBlock,
      fields: {
        block: {
          number: true,
          hash: true,
          timestamp: true,
        },
        log: {
          address: true,
          topics: true,
          data: true,
          transactionHash: true,
          logIndex: true,
          transactionIndex: true,
        },
      },
      logs: [
        {
          address: [params.contractAddress],
          topic0: [yourEvents.YourEvent.topic], // Use your event topic
          transaction: true,
        },
      ],
    });
  }
}
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compiles TypeScript to JavaScript in the `dist` directory |
| `npm run start` | Runs the compiled JavaScript from the `dist` directory |
| `npm run dev` | Runs with nodemon watching for file changes |
| `npm run watch` | TypeScript watch mode (compiles but doesn't run) |
| `npm run dev:debug` | Runs dev mode with Node.js inspector |
| `npm run clean` | Removes all files from the `dist` directory |