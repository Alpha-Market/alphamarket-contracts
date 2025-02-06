//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library Utils {
    /// @dev Precision for basis points calculations.
    /// @dev This is used to convert the protocol fee to a fraction.
    uint256 private constant BASIS_POINTS_PRECISION = 1e4;

    /// @dev Solidity does not support floating point numbers, so we use fixed point math.
    /// @dev Precision also acts as the number 1 commonly used in curve calculations.
    uint256 private constant PRECISION = 1e18;

    function calculateBasisPointsPercentage(uint256 amount, uint256 basisPoints) internal pure returns (uint256) {
        return ((amount * basisPoints) / BASIS_POINTS_PRECISION);
    }

    function getPrecision() internal pure returns (uint256) {
        return PRECISION;
    }

    function getBasisPointsPrecision() internal pure returns (uint256) {
        return BASIS_POINTS_PRECISION;
    }
}
