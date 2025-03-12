import { BasePipe } from "./base.pipe";
import { events } from "./abi/erc721";
import { PortalResponse, PortalStreamData } from "@subsquid/portal-client";

interface Erc721TransferParams {
  startBlock: number;
  endBlock?: number;
  contracts?: string[];
  from?: string;
  to?: string;
}

interface BlockData extends PortalResponse {
  transactions: {
    hash: string;
  }[];
  logs: {
    address: string;
    topics: string[];
    data: string;
    transactionHash: string;
    logIndex: number;
  }[];
}

interface Erc721Transfer {
  from: string;
  to: string;
  tokenId: bigint;
  address: string;
}

export class Erc721Pipe extends BasePipe<
  Erc721TransferParams,
  Erc721Transfer[]
> {
  constructor(portalUrl: string) {
    super(portalUrl);
  }

  public async stream(params: Erc721TransferParams) {
    return this.getStream(params).pipeThrough(
      new TransformStream<PortalStreamData<BlockData>, Erc721Transfer[]>({
        transform: async ({ blocks }, controller) => {
          if (!blocks.length) return;

          const transfers = blocks
            .flatMap(({ logs }) => {
              if (!logs) {
                return;
              }

              return logs
                .filter((log) => {
                  return events.Transfer.is(log);
                })
                .map((log) => ({
                  ...events.Transfer.decode(log),
                  address: log.address,
                }));
            })
            .filter((transfer) => !!transfer);

          controller.enqueue(transfers);
        },
      })
    );
  }

  private getStream(params: Erc721TransferParams) {
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
          address: params.contracts,
          topic0: [events.Transfer.topic],
          transaction: true,
        },
      ],
    });
  }
}
