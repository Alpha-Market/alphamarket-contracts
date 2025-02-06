// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Utils} from "../Utils.sol";

/// @title MembershipPricingEngine
/// @author Dustin Stacy
/// @notice This contract implements a bonding curve for a Membership NFT.
contract MembershipPricingEngine is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    /*///////////////////////////////////////////////////////////////
                            ERRORS
    ///////////////////////////////////////////////////////////////*/

    /// Error to be used when an address is the zero address.
    error MembershipPricingEngine__AddressCannotBeZero();

    /*///////////////////////////////////////////////////////////////
                            STATE VARIABLES
    ///////////////////////////////////////////////////////////////*/

    /// The balance of reserve tokens to initialize the bonding curve token with.
    uint256 private initialCost;

    /// The reserve ratio for use in calculations (ppm).
    uint32 private scalingFactor;

    /*///////////////////////////////////////////////////////////////
                            EVENTS
    ///////////////////////////////////////////////////////////////*/

    /// Emitted when the initial reserve is updated.
    event InitialCostUpdated(uint256 newReserve);

    /// Emitted when the reserve ratio is updated.
    event ScalingFactorUpdated(uint32 newRatio);

    /*///////////////////////////////////////////////////////////////
                        INITIALIZER FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// @dev Disables the default initializer function.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// Initializes the bonding curve with the given parameters.
    /// @param _owner The owner of the contract.
    /// @param _initialCost The balance of reserve tokens to initialize the bonding curve token with.
    /// @param _scalingFactor The reserve ratio used to define the steepness of the bonding curve in ppm.
    function initialize(address _owner, uint256 _initialCost, uint32 _scalingFactor) public initializer {
        if (_owner == address(0)) {
            revert MembershipPricingEngine__AddressCannotBeZero();
        }

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        initialCost = _initialCost;
        scalingFactor = _scalingFactor;
    }

    /*//////////////////////////////////////////////////////////////
                        PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// Calculates the cost of minting the next membership NFT.
    /// @param currentSupply The current supply of memberships (in 1e18 format).
    /// @return costToMint The cost to mint the next membership (in wei).
    function getMembershipCost(uint256 currentSupply) public view returns (uint256 costToMint) {
        uint256 precision = Utils.getPrecision();
        uint256 basisPoints = Utils.getBasisPointsPrecision();
        if (currentSupply == 0) {
            costToMint = initialCost;
        } else {
            uint256 sum1 = (currentSupply - 1) * (currentSupply) * (2 * (currentSupply - 1) + 1) / 6;
            uint256 sum2 = (currentSupply) * (currentSupply + 1) * (2 * (currentSupply) + 1) / 6;
            uint256 summation = sum2 - sum1;
            costToMint = ((summation * precision * scalingFactor) / basisPoints) + initialCost;
        }

        return (costToMint);
    }

    function getLogarithimicMembershipCost(uint256 reserveBalance, uint256 currentSupply)
        public
        view
        returns (uint256 costToMint)
    {
        uint256 basisPoints = Utils.getBasisPointsPrecision();
        if (currentSupply == 0) {
            costToMint = initialCost;
        } else {
            uint256 value = getMembershipValue(reserveBalance, currentSupply);

            costToMint = value * scalingFactor / basisPoints;
        }

        return (costToMint);
    }

    /// Calculates the current value of a membership NFT.
    /// @param currentSupply The current supply of memberships (in 1e18 format).
    /// @return value The current value of the membership NFT (in wei).
    function getMembershipValue(uint256 reserveBalance, uint256 currentSupply) public pure returns (uint256 value) {
        value = reserveBalance / currentSupply;
        return value;
    }

    /*//////////////////////////////////////////////////////////////
                            SETTER FUNCTIONS (OWNER)
    //////////////////////////////////////////////////////////////*/

    /// @param _initialCost The balance of reserve tokens to initialize the bonding curve token with.
    function setInitialCost(uint256 _initialCost) external onlyOwner {
        initialCost = _initialCost;

        emit InitialCostUpdated(_initialCost);
    }

    /// @param _scalingFactor The reserve ratio used to define the steepness of the bonding curve in ppm.
    function setScalingFactor(uint32 _scalingFactor) external onlyOwner {
        scalingFactor = _scalingFactor;

        emit ScalingFactorUpdated(_scalingFactor);
    }

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @return The balance of reserve tokens to initialize the bonding curve token with.
    function getInitialCost() external view returns (uint256) {
        return initialCost;
    }

    /// @return The reserve ratio used to define the steepness of the bonding curve.
    function getScalingFactor() external view returns (uint32) {
        return scalingFactor;
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @param newImplementation The address of the new implementation contract.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
