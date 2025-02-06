// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title AlphaMarketTreasury
/// @author Dustin Stacy
/// @notice This contract implements a base for the alpha market contracts.
contract AlphaMarketTreasury is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    /*///////////////////////////////////////////////////////////////
                            ERRORS
    ///////////////////////////////////////////////////////////////*/

    /// Error to be used when an address is the zero address.
    error AlphaMarketTreasury__AddressCannotBeZero();

    /*///////////////////////////////////////////////////////////////
                            EVENTS
    ///////////////////////////////////////////////////////////////*/

    /// Emitted when the owner withdraws funds from the contract.
    event Withdrawal(address indexed owner, uint256 amount);

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
    function initialize(address _owner) public initializer {
        if (_owner == address(0)) {
            revert AlphaMarketTreasury__AddressCannotBeZero();
        }
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        emit Withdrawal(owner(), balance);
        payable(owner()).transfer(balance);
    }

    receive() external payable {}

    fallback() external payable {}

    /*//////////////////////////////////////////////////////////////
                            INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @param newImplementation The address of the new implementation contract.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
