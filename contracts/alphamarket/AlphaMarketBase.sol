// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title AlphaMarketBase
/// @notice This contract implements a base implementation for the alpha market contracts.
contract AlphaMarketBase is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    /*///////////////////////////////////////////////////////////////
                            ERRORS
    ///////////////////////////////////////////////////////////////*/

    /// Error to be used when an address is the zero address.
    error AlphaMarketBase__AddressCannotBeZero();

    /*///////////////////////////////////////////////////////////////
                            STATE VARIABLES
    ///////////////////////////////////////////////////////////////*/

    /// The address to send protocol fees to.
    address private protocolFeeDestination;

    /// The percentage of the transaction value to send to the protocol fee destination. (basis points)
    uint256 private protocolFeePercent;

    /// The percentage of the collected fees to share with the group contract. (basis points)
    uint256 private feeSharePercent;

    /*///////////////////////////////////////////////////////////////
                            EVENTS
    ///////////////////////////////////////////////////////////////*/

    /// Emitted when the protocol fee destination is updated.
    event ProtocolFeeDestinationUpdated(address newDestination);

    /// Emitted when the protocol fee percentage is updated.
    event ProtocolFeePercentUpdated(uint256 newPercent);

    /// Emitted when the fee share percentage is updated.
    event FeeSharePercentUpdated(uint256 newPercent);

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
    /// @param _protocolFeeDestination The address to send protocol fees to.
    /// @param _protocolFeePercent The percentage of the transaction value to send to the protocol fee destination. (basis points)
    /// @param _feeSharePercent The percentage of the collected fees to share with the group host. (basis points)
    function initialize(
        address _owner,
        address _protocolFeeDestination,
        uint256 _protocolFeePercent,
        uint256 _feeSharePercent
    ) public initializer {
        if (_owner == address(0) || _protocolFeeDestination == address(0)) {
            revert AlphaMarketBase__AddressCannotBeZero();
        }

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        protocolFeeDestination = _protocolFeeDestination;
        protocolFeePercent = _protocolFeePercent;
        feeSharePercent = _feeSharePercent;
    }

    /*///////////////////////////////////////////////////////////////
                            SETTER FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// @param _destination The address to send protocol fees to.
    function setProtocolFeeDestination(address _destination) external onlyOwner {
        if (_destination == address(0)) {
            revert AlphaMarketBase__AddressCannotBeZero();
        }
        protocolFeeDestination = _destination;

        emit ProtocolFeeDestinationUpdated(_destination);
    }

    /// @param _protocolFeePercent The percentage of the transaction to send to the protocol fee destination represented in basis points.
    function setProtocolFeePercent(uint256 _protocolFeePercent) external onlyOwner {
        protocolFeePercent = _protocolFeePercent;

        emit ProtocolFeePercentUpdated(_protocolFeePercent);
    }

    /// @param _feeSharePercent The collected fee share percentage for selling tokens represented in basis points.
    function setFeeSharePercent(uint256 _feeSharePercent) external onlyOwner {
        feeSharePercent = _feeSharePercent;

        emit FeeSharePercentUpdated(_feeSharePercent);
    }

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @return The address to send protocol fees to.
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

    /*//////////////////////////////////////////////////////////////
                            INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @param newImplementation The address of the new implementation contract.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
