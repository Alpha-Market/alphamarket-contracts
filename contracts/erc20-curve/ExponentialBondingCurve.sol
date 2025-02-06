// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {BancorFormula} from "./utils/BancorFormula.sol";
import {Utils} from "../Utils.sol";

/// @title ExponentialBondingCurve
/// @author Dustin Stacy
/// @notice This contract implements the Bancor bonding curve.
/// The curve is defined by a reserveRatio, which determines the steepness and bend of the curve.
contract ExponentialBondingCurve is Initializable, OwnableUpgradeable, UUPSUpgradeable, BancorFormula {
    /*///////////////////////////////////////////////////////////////
                            ERRORS
    ///////////////////////////////////////////////////////////////*/

    /// @notice Error to be used when an address is the zero address.
    error ExponentialBondingCurve__FeeDestinationCannotBeZeroAddress();

    /*///////////////////////////////////////////////////////////////
                            STATE VARIABLES
    ///////////////////////////////////////////////////////////////*/
    /// @notice The address that collects protocol fees.
    address private protocolFeeDestination;

    /// @notice The percentage of the transaction value to send to the protocol fee destination.
    uint256 private protocolFeePercent;

    /// @notice The percentage of the collected fees to share with the group contract.
    /// @dev Could be used in conjuction with a Paymaster to facilitate gasless transactions.
    uint256 private feeSharePercent;

    /// @notice The balance of reserve tokens to initialize the bonding curve token with.
    /// @dev Could institue a formula to set the initial reserve based on a flat fiat amount.
    uint256 private initialReserve;

    /// @dev Solidity does not support floating point numbers, so we use fixed point math.
    /// @dev Precision also acts as the number 1 commonly used in curve calculations.
    uint256 private constant PRECISION = 1e18;

    /// @dev Value to represent the reserve ratio for use in calculations (in ppm).
    uint32 private reserveRatio;

    /*///////////////////////////////////////////////////////////////
                            EVENTS
    ///////////////////////////////////////////////////////////////*/

    /// @notice Emitted when the protocol fee destination is updated.
    event ProtocolFeeDestinationUpdated(address indexed newDestination);

    /// @notice Emitted when the protocol fee percentage is updated.
    event ProtocolFeePercentUpdated(uint256 newPercent);

    /// @notice Emitted when the fee share percentage is updated.
    event FeeSharePercentUpdated(uint256 newPercent);

    /// @notice Emitted when the initial reserve is updated.
    event InitialReserveUpdated(uint256 newReserve);

    /// @notice Emitted when the reserve ratio is updated.
    event ReserveRatioUpdated(uint32 newRatio);

    /*///////////////////////////////////////////////////////////////
                        INITIALIZER FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// @dev Disables the default initializer function.
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the bonding curve with the given parameters.
    /// @param _owner The owner of the contract.
    /// @param _protocolFeeDestination The address to send protocol fees to.
    /// @param _protocolFeePercent The protocol fee percentage represented in basis points.
    /// @param _feeSharePercent The collected fee share percentage represented in basis points.
    /// @param _initialReserve The balance of reserve tokens to initialize the bonding curve token with.
    /// @param _reserveRatio The reserve ratio in ppm.
    function initialize(
        address _owner,
        address _protocolFeeDestination,
        uint256 _protocolFeePercent,
        uint256 _feeSharePercent,
        uint256 _initialReserve,
        uint32 _reserveRatio
    ) public initializer {
        if (_owner == address(0) || _protocolFeeDestination == address(0)) {
            revert ExponentialBondingCurve__FeeDestinationCannotBeZeroAddress();
        }
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        protocolFeeDestination = _protocolFeeDestination;
        protocolFeePercent = _protocolFeePercent;
        initialReserve = _initialReserve;
        reserveRatio = _reserveRatio;

        if (_feeSharePercent > 0) {
            feeSharePercent = _feeSharePercent;
        }
    }

    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Function to calculate the amount of continuous tokens to return based on reserve tokens received.
    /// @param currentSupply The current supply of continuous tokens (in 1e18 format).
    /// @param reserveTokenBalance The balance of reserve tokens (in wei).
    /// @param reserveTokensReceived The amount of reserve tokens received (in wei).
    /// @return purchaseReturn The amount of continuous tokens to mint (in 1e18 format).
    /// @return fees The amount of protocol fees to send to the protocol fee destination (in wei).
    function getPurchaseReturn(uint256 currentSupply, uint256 reserveTokenBalance, uint256 reserveTokensReceived)
        public
        view
        returns (uint256 purchaseReturn, uint256 fees)
    {
        // Calculate the protocol fees.
        fees = Utils.calculateBasisPointsPercentage(reserveTokensReceived, protocolFeePercent);

        uint256 remainingReserveTokens = reserveTokensReceived - fees;

        // Calculate the amount of tokens to mint.
        purchaseReturn =
            calculatePurchaseReturn(currentSupply, reserveTokenBalance, reserveRatio, remainingReserveTokens);

        return (purchaseReturn, fees);
    }

    /// @notice Calculates the amount of ether that can be returned for the given amount of tokens.
    /// @param currentSupply The current supply of continuous tokens (in 1e18 format).
    /// @param reserveTokenBalance The balance of reserve tokens (in wei).
    /// @param tokensToBurn The amount of continuous tokens to burn (in 1e18 format).
    /// @return saleValue The amount of ether to return (in wei).
    /// @return fees The amount of protocol fees to send to the protocol fee destination (in wei).
    function getSaleReturn(uint256 currentSupply, uint256 reserveTokenBalance, uint256 tokensToBurn)
        public
        view
        returns (uint256 saleValue, uint256 fees)
    {
        // Calculate the amount of ether returned for the given amount of tokens.
        saleValue = calculateSaleReturn(currentSupply, reserveTokenBalance, reserveRatio, tokensToBurn);

        // Calculate the protocol fees.
        fees = Utils.calculateBasisPointsPercentage(saleValue, protocolFeePercent);

        return (saleValue, fees);
    }

    /// @notice Function to calculate the amount of reserve tokens needed to mint a continuous token.
    /// @param currentSupply The current supply of continuous tokens (in 1e18 format).
    /// @param reserveTokenBalance The balance of reserve tokens (in wei).
    /// @return depositAmount The amount of reserve tokens needed to mint a continuous token (in wei).
    /// @dev This function is very gas intensive and should be used with caution.
    function getMintCost(uint256 currentSupply, uint256 reserveTokenBalance)
        external
        view
        returns (uint256 depositAmount, uint256 fees)
    {
        // We want to mint exactly 1 token, scaled by PRECISION
        uint256 targetReturn = PRECISION;

        // Binary search for the deposit amount
        uint256 low = 0;
        uint256 high = reserveTokenBalance * 10;
        uint256 mid;

        while (high - low > 1) {
            mid = (low + high) / 2;

            // Calculate the return for depositing 'mid' amount of reserve tokens
            (uint256 returnAmount, uint256 returnFees) = getPurchaseReturn(currentSupply, reserveTokenBalance, mid);
            fees = returnFees;
            if (returnAmount < targetReturn) {
                low = mid;
            } else {
                high = mid;
            }
        }

        depositAmount = high;
    }

    /// @notice Function to calculate the current price of the continuous token.
    /// @param currentSupply The current supply of continuous tokens (in 1e18 format).
    /// @param reserveTokenBalance The balance of reserve tokens (in wei).
    /// @return tokenPrice The current price of the continuous token (in wei).
    /// @return fees The amount of protocol fees to send to the protocol fee destination (in wei).
    function getTokenPrice(uint256 currentSupply, uint256 reserveTokenBalance)
        external
        view
        returns (uint256 tokenPrice, uint256 fees)
    {
        (tokenPrice, fees) = getSaleReturn(currentSupply, reserveTokenBalance, PRECISION);
    }

    /*//////////////////////////////////////////////////////////////
                            SETTER FUNCTIONS (OWNER)
    //////////////////////////////////////////////////////////////*/

    /// @param _feeDestination The address to send protocol fees to.
    function setProtocolFeeDestination(address _feeDestination) external onlyOwner {
        if (_feeDestination == address(0)) {
            revert ExponentialBondingCurve__FeeDestinationCannotBeZeroAddress();
        }
        protocolFeeDestination = _feeDestination;

        emit ProtocolFeeDestinationUpdated(_feeDestination);
    }

    /// @param _basisPoints The percentage of the transaction to send to the protocol fee destination represented in basis points.
    function setProtocolFeePercent(uint256 _basisPoints) external onlyOwner {
        protocolFeePercent = _basisPoints;

        emit ProtocolFeePercentUpdated(_basisPoints);
    }

    /// @param _basisPoints The collected fee share percentage for selling tokens represented in basis points.
    function setFeeSharePercent(uint256 _basisPoints) external onlyOwner {
        feeSharePercent = _basisPoints;

        emit FeeSharePercentUpdated(_basisPoints);
    }

    /// @param _initialReserve The balance of reserve tokens to initialize the bonding curve token with.
    function setInitialReserve(uint256 _initialReserve) external onlyOwner {
        initialReserve = _initialReserve;

        emit InitialReserveUpdated(_initialReserve);
    }

    /// @param _reserveRatio The reserve ratio used to define the steepness of the bonding curve in ppm.
    function setReserveRatio(uint32 _reserveRatio) external onlyOwner {
        reserveRatio = _reserveRatio;

        emit ReserveRatioUpdated(_reserveRatio);
    }

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @return The address that collects protocol fees.
    function getProtocolFeeDestination() external view returns (address) {
        return protocolFeeDestination;
    }

    /// @return The percentage of the transaction value to send to the protocol fee destination.
    function getProtocolFeePercent() external view returns (uint256) {
        return protocolFeePercent;
    }

    /// @return The percentage of the collected fees to share with the token contract.
    function getFeeSharePercent() external view returns (uint256) {
        return feeSharePercent;
    }

    /// @return The balance of reserve tokens to initialize the bonding curve token with.
    function getInitialReserve() external view returns (uint256) {
        return initialReserve;
    }

    /// @return The reserve ratio used to define the steepness of the bonding curve.
    function getReserveRatio() external view returns (uint32) {
        return reserveRatio;
    }

    /// @return The `PRECISION` constant.
    function getPrecision() external pure returns (uint256) {
        return PRECISION;
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @param newImplementation The address of the new implementation contract.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
