'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const modules_1 = require('@nomicfoundation/hardhat-ignition/modules');
const hardhat_1 = require('hardhat');
const helper_hardhat_config_1 = require('../../../helper-hardhat.config');
const path_1 = require('path');
const fs_1 = require('fs');
// This module is only used for testing.
// Deployments for the product must be handled through UI when host creates a new group.
const GroupTokenModule = (0, modules_1.buildModule)('GroupTokenModule', (m) => {
    const chainId = hardhat_1.network.config.chainId;
    const deploymentsFilePath = (0, path_1.resolve)(
        __dirname,
        `../deployments/chain-${chainId}/deployed_addresses.json`,
    );
    const deployments = JSON.parse((0, fs_1.readFileSync)(deploymentsFilePath, 'utf-8'));
    const name = 'Test';
    const symbol = 'TEST';
    const bcAddress = deployments['ProxyModule#ERC1967Proxy'];
    const hostAddress = '0x3ef270a74CaAe5Ca4b740a66497085abBf236655';
    const { initialReserve } = helper_hardhat_config_1.networkConfig[hardhat_1.network.name];
    const groupToken = m.contract('GroupToken', [name, symbol, bcAddress, hostAddress], {
        value: BigInt(initialReserve),
    });
    return { groupToken };
});
exports.default = GroupTokenModule;
