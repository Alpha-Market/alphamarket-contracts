import { expect } from 'chai';
import { ethers } from 'hardhat';
import { $Utils } from '../typechain-types/contracts-exposed/Utils.sol/$Utils';

describe('Utils Library', function () {
    let utils: $Utils; // Explicitly type the contract instance

    // Deploy the contract before each test
    beforeEach(async function () {
        const UtilsFactory = await ethers.getContractFactory('$Utils');
        utils = (await UtilsFactory.deploy()) as $Utils;
    });

    describe('calculateBasisPointsPercentage', function () {
        it('should correctly calculate percentage of an amount', async function () {
            const amount: bigint = 1000n * 10n ** 18n;
            const basisPoints: number = 1000; // 1000 basis points = 10%
            const result: bigint = await utils.$calculateBasisPointsPercentage(amount, basisPoints);
            expect(result).to.equal(100n * 10n ** 18n); // 10% of 1000 should be 100
        });

        it('should correctly calculate percentage of an amount', async function () {
            const amount: bigint = 1000n * 10n ** 18n;
            const basisPoints: number = 500; // 500 basis points = 5%
            const result: bigint = await utils.$calculateBasisPointsPercentage(amount, basisPoints);
            expect(result).to.equal(50n * 10n ** 18n); // 5% of 1000 should be 50
        });

        it('should correctly calculate percentage of an amount', async function () {
            const amount: bigint = 1000n * 10n ** 18n;
            const basisPoints: number = 0; // 0 basis points = 0%
            const result: bigint = await utils.$calculateBasisPointsPercentage(amount, basisPoints);
            expect(result).to.equal(0n); // 0% of 1000 should be 0
        });

        it('should correctly calculate percentage of an amount', async function () {
            const amount: bigint = 1000n * 10n ** 18n;
            const basisPoints: number = 543; // 543 basis points = 5.43%
            const result: bigint = await utils.$calculateBasisPointsPercentage(amount, basisPoints);
            expect(result).to.equal(543n * 10n ** 17n); // 5.43% of 1000 should be 54.3
        });

        it('should correctly calculate percentage of an amount', async function () {
            const amount: bigint = 64834n * 10n ** 15n;
            const basisPoints: number = 4731; // 4731 basis points = 47.31%
            const result: bigint = await utils.$calculateBasisPointsPercentage(amount, basisPoints);
            expect(result).to.equal(306729654n * 10n ** 11n); // 47.31% of 64834 should be 30672.9654
        });
    });

    describe('getPrecision', function () {
        it('should return the correct precision', async function () {
            const precision: bigint = await utils.$getPrecision();
            expect(precision).to.equal('1000000000000000000'); // 1e18
        });
    });

    describe('getBasisPointsPrecision', function () {
        it('should return the correct basis points precision', async function () {
            const basisPointsPrecision: bigint = await utils.$getBasisPointsPrecision();
            expect(basisPointsPrecision).to.equal('10000'); // 1e4
        });
    });
});
