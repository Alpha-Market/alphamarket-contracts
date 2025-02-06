import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const TreasuryModule = buildModule('TreasuryModule', (m) => {
    const owner = '0x3ef270a74CaAe5Ca4b740a66497085abBf236655';

    const treasury = m.contract('AlphaMarketTreasury');

    const initialze = m.encodeFunctionCall(treasury, 'initialize', [owner]);

    const proxyContract = m.contract('ERC1967Proxy', [treasury, initialze]);

    return { proxyContract };
});

export default TreasuryModule;
