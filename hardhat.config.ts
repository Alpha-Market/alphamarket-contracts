import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import { vars } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-exposed';

const ALCHEMY_API_KEY = vars.get('ALCHEMY_API_KEY');
// const TESTING_PRIVATE_KEY = vars.get('SEPOLIA_PRIVATE_KEY');
// const ETHERSCAN_API_KEY = vars.get('ETHERSCAN_API_KEY');
// const ARBISCAN_API_KEY = vars.get('ARBISCAN_API_KEY');

const config: HardhatUserConfig = {
    solidity: '0.8.26',
    etherscan: {
        // apiKey: {
        //     sepolia: ETHERSCAN_API_KEY,
        //     arbitrumSepolia: ARBISCAN_API_KEY,
        // },
        customChains: [
            {
                network: 'arbitrumSepolia',
                chainId: 421614,
                urls: {
                    apiURL: 'https://api-sepolia.arbiscan.io/api',
                    browserURL: 'https://sepolia.arbiscan.io/',
                },
            },
        ],
    },
    sourcify: {
        enabled: true,
    },
    networks: {
        // sepolia: {
        //     url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        //     accounts: [TESTING_PRIVATE_KEY],
        // },
        // polygonzkEVM: {
        //     chainId: 2442,
        //     url: `https://polygonzkevm-cardona.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        //     accounts: [TESTING_PRIVATE_KEY],
        // },
        arbitrumSepolia: {
            chainId: 421614,
            url: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
            // accounts: [TESTING_PRIVATE_KEY],
        },
        hardhat: {
            chainId: 1337,
        },
    },
    gasReporter: {
        enabled: false,
    },
};

export default config;
