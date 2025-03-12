import { Erc721Pipe } from "./erc721.pipe";

async function main() {
  const erc721Pipe = new Erc721Pipe(
    "https://portal.sqd.dev/datasets/base-mainnet"
  );
  const stream = await erc721Pipe.stream({
    startBlock: 27419255,
    contracts: ["0x3319197b0d0f8ccd1087f2d2e47a8fb7c0710171"],
  });

  for await (const block of stream) {
    console.log(block);
  }
}

main();
