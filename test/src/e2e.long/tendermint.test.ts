// Copyright 2018-2019 Kodebox, Inc.
// This file is part of CodeChain.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import {
    validator0Address,
    validator1Address,
    validator2Address,
    validator3Address
} from "../helper/constants";
import { PromiseExpect } from "../helper/promise";
import CodeChain from "../helper/spawn";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Tendermint ", function() {
    const promiseExpect = new PromiseExpect();
    let nodes: CodeChain[];

    beforeEach(async function() {
        this.timeout(60_000);

        const validatorAddresses = [
            validator0Address,
            validator1Address,
            validator2Address,
            validator3Address
        ];
        nodes = validatorAddresses.map(address => {
            return new CodeChain({
                chain: `${__dirname}/../scheme/tendermint-int.json`,
                argv: [
                    "--engine-signer",
                    address.toString(),
                    "--password-path",
                    "test/tendermint/password.json",
                    "--force-sealing",
                    "--no-discovery"
                ],
                additionalKeysPath: "tendermint/keys"
            });
        });
        await Promise.all(nodes.map(node => node.start()));
    });

    describe("getPossibleAuthors", function() {
        it("latest", async function() {
            const validators = [
                "tccq94guhkrfndnehnca06dlkxcfuq0gdlamvw9ga4f",
                "tccq8p9hr53lnxnhzcn0d065lux7etz22azaca786tt",
                "tccq8fj6lxn9tchqdqqe93yaga6fzxh5rndzu8k2gdw",
                "tccq9y6e0k6af9058qq4h4ffpt9xmat2vkeyue23j8y"
            ];
            expect(
                await nodes[0].sdk.rpc.sendRpcRequest(
                    "chain_getPossibleAuthors",
                    [null]
                )
            ).deep.equal(validators);
            expect(
                await nodes[1].sdk.rpc.sendRpcRequest(
                    "chain_getPossibleAuthors",
                    [null]
                )
            ).deep.equal(validators);
            expect(
                await nodes[2].sdk.rpc.sendRpcRequest(
                    "chain_getPossibleAuthors",
                    [null]
                )
            ).deep.equal(validators);
            expect(
                await nodes[3].sdk.rpc.sendRpcRequest(
                    "chain_getPossibleAuthors",
                    [null]
                )
            ).deep.equal(validators);
        });

        it("genesis", async function() {
            const validators = ["tccq94guhkrfndnehnca06dlkxcfuq0gdlamvw9ga4f"];
            expect(
                await nodes[0].sdk.rpc.sendRpcRequest(
                    "chain_getPossibleAuthors",
                    [0]
                )
            ).deep.equal(validators);
            expect(
                await nodes[1].sdk.rpc.sendRpcRequest(
                    "chain_getPossibleAuthors",
                    [0]
                )
            ).deep.equal(validators);
            expect(
                await nodes[2].sdk.rpc.sendRpcRequest(
                    "chain_getPossibleAuthors",
                    [0]
                )
            ).deep.equal(validators);
            expect(
                await nodes[3].sdk.rpc.sendRpcRequest(
                    "chain_getPossibleAuthors",
                    [0]
                )
            ).deep.equal(validators);
        });

        it("larger than the current block", async function() {
            const currentBlock = await nodes[0].getBestBlockNumber();
            expect(
                nodes[0].sdk.rpc.sendRpcRequest("chain_getPossibleAuthors", [
                    currentBlock + 10
                ])
            ).be.rejectedWith("Engine");
            expect(
                nodes[1].sdk.rpc.sendRpcRequest("chain_getPossibleAuthors", [
                    currentBlock + 100
                ])
            ).be.rejectedWith("Engine");
            expect(
                nodes[2].sdk.rpc.sendRpcRequest("chain_getPossibleAuthors", [
                    currentBlock + 1000
                ])
            ).be.rejectedWith("Engine");
            expect(
                nodes[3].sdk.rpc.sendRpcRequest("chain_getPossibleAuthors", [
                    currentBlock + 10000
                ])
            ).be.rejectedWith("Engine");
        });
    });

    it("Block generation", async function() {
        const startHight = await nodes[0].getBestBlockNumber();

        await promiseExpect.shouldFulfill(
            "connect",
            Promise.all([
                nodes[0].connect(nodes[1]),
                nodes[0].connect(nodes[2]),
                nodes[0].connect(nodes[3]),
                nodes[1].connect(nodes[2]),
                nodes[1].connect(nodes[3]),
                nodes[2].connect(nodes[3])
            ])
        );
        await promiseExpect.shouldFulfill(
            "wait peers",
            Promise.all([
                nodes[0].waitPeers(4 - 1),
                nodes[1].waitPeers(4 - 1),
                nodes[2].waitPeers(4 - 1),
                nodes[3].waitPeers(4 - 1)
            ])
        );

        await promiseExpect.shouldFulfill(
            "block generation",
            Promise.all([
                nodes[0].waitBlockNumber(startHight + 1),
                nodes[1].waitBlockNumber(startHight + 1),
                nodes[2].waitBlockNumber(startHight + 1),
                nodes[3].waitBlockNumber(startHight + 1)
            ])
        );
    }).timeout(60_000);

    it("Block generation with restart", async function() {
        const startHeight = await nodes[0].getBestBlockNumber();

        await promiseExpect.shouldFulfill(
            "connect",
            Promise.all([
                nodes[0].connect(nodes[1]),
                nodes[0].connect(nodes[2]),
                nodes[0].connect(nodes[3]),
                nodes[1].connect(nodes[2]),
                nodes[1].connect(nodes[3]),
                nodes[2].connect(nodes[3])
            ])
        );
        await promiseExpect.shouldFulfill(
            "wait peers",
            Promise.all([
                nodes[0].waitPeers(4 - 1),
                nodes[1].waitPeers(4 - 1),
                nodes[2].waitPeers(4 - 1),
                nodes[3].waitPeers(4 - 1)
            ])
        );

        await promiseExpect.shouldFulfill(
            "block generation",
            Promise.all([
                nodes[0].waitBlockNumber(startHeight + 1),
                nodes[1].waitBlockNumber(startHeight + 1),
                nodes[2].waitBlockNumber(startHeight + 1),
                nodes[3].waitBlockNumber(startHeight + 1)
            ])
        );

        await promiseExpect.shouldFulfill(
            "stop",
            Promise.all([
                nodes[0].clean(),
                nodes[1].clean(),
                nodes[2].clean(),
                nodes[3].clean()
            ])
        );

        await promiseExpect.shouldFulfill(
            "start",
            Promise.all([
                nodes[0].start(),
                nodes[1].start(),
                nodes[2].start(),
                nodes[3].start()
            ])
        );

        const intermediateHeight = await nodes[0].getBestBlockNumber();
        expect(startHeight).lessThan(intermediateHeight);

        await promiseExpect.shouldFulfill(
            "reconnect",
            Promise.all([
                nodes[0].connect(nodes[1]),
                nodes[0].connect(nodes[2]),
                nodes[0].connect(nodes[3]),
                nodes[1].connect(nodes[2]),
                nodes[1].connect(nodes[3]),
                nodes[2].connect(nodes[3])
            ])
        );

        await promiseExpect.shouldFulfill(
            "wait peers2",
            Promise.all([
                nodes[0].waitPeers(4 - 1),
                nodes[1].waitPeers(4 - 1),
                nodes[2].waitPeers(4 - 1),
                nodes[3].waitPeers(4 - 1)
            ])
        );

        await promiseExpect.shouldFulfill(
            "block generation2",
            Promise.all([
                nodes[0].waitBlockNumber(intermediateHeight + 1),
                nodes[1].waitBlockNumber(intermediateHeight + 1),
                nodes[2].waitBlockNumber(intermediateHeight + 1),
                nodes[3].waitBlockNumber(intermediateHeight + 1)
            ])
        );
    }).timeout(40_000);

    it("Block generation with transaction", async function() {
        await promiseExpect.shouldFulfill(
            "connect",
            Promise.all([
                nodes[0].connect(nodes[1]),
                nodes[0].connect(nodes[2]),
                nodes[0].connect(nodes[3]),
                nodes[1].connect(nodes[2]),
                nodes[1].connect(nodes[3]),
                nodes[2].connect(nodes[3])
            ])
        );
        await promiseExpect.shouldFulfill(
            "wait peers",
            Promise.all([
                nodes[0].waitPeers(4 - 1),
                nodes[1].waitPeers(4 - 1),
                nodes[2].waitPeers(4 - 1),
                nodes[3].waitPeers(4 - 1)
            ])
        );

        const startHeight = await nodes[0].getBestBlockNumber();
        await promiseExpect.shouldFulfill(
            "payTx",
            Promise.all([
                nodes[0].sendPayTx({ seq: 0 }),
                nodes[0].sendPayTx({ seq: 1 }),
                nodes[0].sendPayTx({ seq: 2 })
            ])
        );

        await promiseExpect.shouldFulfill(
            "block generation",
            Promise.all([
                nodes[0].waitBlockNumber(startHeight + 1),
                nodes[1].waitBlockNumber(startHeight + 1),
                nodes[2].waitBlockNumber(startHeight + 1),
                nodes[3].waitBlockNumber(startHeight + 1)
            ])
        );
    }).timeout(60_000);

    it("Block sync", async function() {
        const startHeight = await nodes[0].getBestBlockNumber();

        await promiseExpect.shouldFulfill(
            "connect",
            Promise.all([
                nodes[0].connect(nodes[1]),
                nodes[0].connect(nodes[2]),
                nodes[1].connect(nodes[2])
            ])
        );
        await promiseExpect.shouldFulfill(
            "wait peers",
            Promise.all([
                nodes[0].waitPeers(3 - 1),
                nodes[1].waitPeers(3 - 1),
                nodes[2].waitPeers(3 - 1)
            ])
        );

        await promiseExpect.shouldFulfill(
            "wait blocknumber",
            Promise.all([
                nodes[0].waitBlockNumber(startHeight + 3),
                nodes[1].waitBlockNumber(startHeight + 3),
                nodes[2].waitBlockNumber(startHeight + 3)
            ])
        );

        await promiseExpect.shouldFulfill(
            "disconnect",
            Promise.all([
                nodes[0].disconnect(nodes[1]),
                nodes[0].disconnect(nodes[2])
            ])
        );

        // Now create blocks without nodes[0]. To create new blocks, the
        // nodes[4] should sync all message and participate in the network.

        await promiseExpect.shouldFulfill(
            "reconnect",
            Promise.all([
                nodes[3].connect(nodes[1]),
                nodes[3].connect(nodes[2])
            ])
        );

        const heightOfNode0 = await nodes[0].getBestBlockNumber();
        await promiseExpect.shouldFulfill(
            "best blocknumber",
            Promise.all([
                nodes[1].waitBlockNumber(heightOfNode0 + 1),
                nodes[2].waitBlockNumber(heightOfNode0 + 1),
                nodes[3].waitBlockNumber(heightOfNode0 + 1)
            ])
        );
    }).timeout(90_000);

    it("Gossip", async function() {
        const startHeight = await nodes[0].getBestBlockNumber();
        await promiseExpect.shouldFulfill(
            "connect",
            Promise.all([
                nodes[0].connect(nodes[1]),
                nodes[1].connect(nodes[2]),
                nodes[2].connect(nodes[3])
            ])
        );

        await promiseExpect.shouldFulfill(
            "wait blocknumber",
            Promise.all([
                nodes[0].waitBlockNumber(startHeight + 1),
                nodes[1].waitBlockNumber(startHeight + 1),
                nodes[2].waitBlockNumber(startHeight + 1),
                nodes[3].waitBlockNumber(startHeight + 1)
            ])
        );
    }).timeout(20_000);

    it("Gossip with not-permissioned node", async function() {
        function createNodeWihtOutSigner() {
            return new CodeChain({
                chain: `${__dirname}/../scheme/tendermint-int.json`,
                argv: [
                    "--no-miner",
                    "--password-path",
                    "test/tendermint/password.json",
                    "--no-discovery"
                ],
                additionalKeysPath: "tendermint/keys"
            });
        }

        nodes.push(createNodeWihtOutSigner());
        nodes.push(createNodeWihtOutSigner());
        await Promise.all([nodes[4].start(), nodes[5].start()]);

        const startHeight = await nodes[0].getBestBlockNumber();
        // 4 <-> 5
        // 0 <-> 4, 1 <-> 4
        // 2 <-> 5, 3 <-> 5
        await promiseExpect.shouldFulfill(
            "connect",
            Promise.all([
                nodes[4].connect(nodes[5]),
                nodes[4].connect(nodes[0]),
                nodes[4].connect(nodes[1]),
                nodes[5].connect(nodes[2]),
                nodes[5].connect(nodes[3])
            ])
        );

        await promiseExpect.shouldFulfill(
            "wait blocknumber",
            Promise.all([
                nodes[0].waitBlockNumber(startHeight + 1),
                nodes[1].waitBlockNumber(startHeight + 1),
                nodes[2].waitBlockNumber(startHeight + 1),
                nodes[3].waitBlockNumber(startHeight + 1),
                nodes[4].waitBlockNumber(startHeight + 1),
                nodes[5].waitBlockNumber(startHeight + 1)
            ])
        );
    }).timeout(60_000);

    afterEach(async function() {
        if (this.currentTest!.state === "failed") {
            nodes.map(node => node.keepLogs());
        }
        await Promise.all(nodes.map(node => node.clean()));
        promiseExpect.checkFulfilled();
    });
});
