import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { network } from 'hardhat';
import { networkConfig } from '../../../helper-hardhat.config';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// This module is only used for testing.
// Deployments for the product must be handled through UI when host creates a new group.
const GroupTokenModule = buildModule('GroupTokenModule', (m) => {
    const chainId = network.config.chainId;
    const deploymentsFilePath = resolve(
        __dirname,
        `../deployments/chain-${chainId}/deployed_addresses.json`,
    );
    const deployments = JSON.parse(readFileSync(deploymentsFilePath, 'utf-8'));

    const name = 'Test';
    const symbol = 'TEST';
    const bcAddress = deployments['ProxyModule#ERC1967Proxy'];
    const hostAddress = '0x3ef270a74CaAe5Ca4b740a66497085abBf236655';
    const { initialReserve } = networkConfig[network.name];

    const groupToken = m.contract('GroupToken', [name, symbol, bcAddress, hostAddress], {
        value: BigInt(initialReserve),
    });

    return { groupToken };
});

export default GroupTokenModule;
