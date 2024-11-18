// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20Burnable, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ExponentialBondingCurve} from "../bonding-curves/ExponentialBondingCurve.sol";

/// @title GroupToken
/// @author Dustin Stacy
/// @notice This contract implements a simple ERC20 token that can be bought and sold using an exponential bonding curve.
contract GroupToken is ERC20Burnable {
    /*///////////////////////////////////////////////////////////////
                                ERRORS
    ///////////////////////////////////////////////////////////////*/

    /// @dev Emitted when the bonding curve address is the zero address.
    error GroupToken__BCAddressCannotBeZero();

    /// @dev Emitted when the buyer does not send the correct amount of Ether to mint the initial token.
    error GroupToken__IncorrectAmountOfEtherSent();

    /// @dev Emitted when attempting to perform an action with an amount that must be more than zero.
    error GroupToken__AmountMustBeMoreThanZero();

    /// @dev Emitted if the buyer does not send enough Ether to purchase the tokens.
    error GroupToken__InsufficientFundingForTransaction();

    /// @dev Emitted when attempting to burn an amount that exceeds the sender's balance.
    error GroupToken__BurnAmountExceedsBalance();

    /// @dev Emitted when attempting to reduce the total supply below one.
    error GroupToken__SupplyCannotBeReducedBelowOne();

    /// @dev Emitted when the protocol fee transfer fails.
    error GroupToken__ProtocolFeeTransferFailed();

    /// @dev Emitted when the token sale transfer fails.
    error GroupToken__TokenSaleTransferFailed();

    /*///////////////////////////////////////////////////////////////
                             STATE VARIABLES
    ///////////////////////////////////////////////////////////////*/

    /// @notice Instance of a Bonding Curve contract used to determine the price of tokens.
    ExponentialBondingCurve private immutable i_bondingCurve;

    /// @notice The total amount of Ether held in the contract.
    uint256 private reserveBalance;

    /// @notice The total amount of fees collected by the contract.
    uint256 private collectedFees;

    /*///////////////////////////////////////////////////////////////
                                EVENTS
    ///////////////////////////////////////////////////////////////*/

    /// @notice Event to log token purchases.
    event TokensPurchased(address indexed buyer, uint256 amountSpent, uint256 fees, uint256 tokensMinted);

    /// @notice Event to log token sales.
    event TokensSold(address indexed seller, uint256 amountReceived, uint256 fees, uint256 tokensBurnt);

    /*///////////////////////////////////////////////////////////////
                            MODIFIERS
    ///////////////////////////////////////////////////////////////*/

    /// @dev Modifier to check if the transaction gas price is below the maximum gas limit.
    modifier validGasPrice() {
        require(
            tx.gasprice <= i_bondingCurve.getMaxGasLimit(), "Transaction gas price cannot exceed maximum gas limit."
        );
        _;
    }

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    ///////////////////////////////////////////////////////////////*/

    /// @param _name The name of the token.
    /// @param _symbol The symbol of the token.
    /// @param _bcAddress The address of the ExponentialBondingCurve contract.
    /// @param _host The address of the host account.
    constructor(string memory _name, string memory _symbol, address _bcAddress, address _host)
        payable
        ERC20(_name, _symbol)
    {
        // Check if the bonding curve address is not the zero address and set the bonding curve instance.
        if (_bcAddress == address(0)) {
            revert GroupToken__BCAddressCannotBeZero();
        }
        i_bondingCurve = ExponentialBondingCurve(_bcAddress);

        // Mint the initial token to the contract creator.
        if (msg.value != i_bondingCurve.getInitialReserve()) {
            revert GroupToken__IncorrectAmountOfEtherSent();
        }
        reserveBalance += msg.value;
        _mint(_host, 1e18);
    }

    /*///////////////////////////////////////////////////////////////
                          EXTERNAL FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// @notice Allows a user to mint tokens by sending Ether to the contract.
    function mintTokens() external payable validGasPrice {
        if (msg.value == 0) {
            revert GroupToken__AmountMustBeMoreThanZero();
        }

        // Calculate the amount of tokens to mint.
        (uint256 amount, uint256 fees) = i_bondingCurve.getPurchaseReturn(totalSupply(), reserveBalance, msg.value);

        // Update the reserve balance.
        reserveBalance += (msg.value - fees);

        // Transfer protocol fees to the protocol fee destination
        (bool success,) = i_bondingCurve.getProtocolFeeDestination().call{value: fees}("");
        if (!success) {
            revert GroupToken__ProtocolFeeTransferFailed();
        }

        // Mint tokens to the buyer
        _mint(msg.sender, amount);

        // Emit an event to log the purchase.
        emit TokensPurchased(msg.sender, msg.value, fees, amount);
    }

    /// @notice Allows a user to burn tokens and receive ether from the contract.
    /// @param amount The amount of tokens to burn.
    /// @param sender The address of the sender.
    function burnTokens(uint256 amount, address sender) external validGasPrice {
        if (amount == 0) {
            revert GroupToken__AmountMustBeMoreThanZero();
        }

        /// Do we want to enforce this to prevent bricking the contract?
        if (totalSupply() - amount < 1e18) {
            revert GroupToken__SupplyCannotBeReducedBelowOne();
        }

        // Check if the seller has enough tokens to burn.
        uint256 balance = balanceOf(sender);

        if (balance < amount) {
            revert GroupToken__BurnAmountExceedsBalance();
        }

        // Calculate the amount of Ether to return to the seller.
        (uint256 salePrice, uint256 fees) = i_bondingCurve.getSaleReturn(totalSupply(), reserveBalance, amount);

        // Update the sale price and reserve balance.
        reserveBalance -= salePrice;
        salePrice -= fees;

        // Calculate the share of fees to be collected by the contract.
        uint256 feeShare =
            i_bondingCurve.getFeeSharePercent() != 0 ? (fees * i_bondingCurve.getFeeSharePercent()) / 1e18 : 0;
        collectedFees += feeShare;
        fees -= feeShare;

        // Burn tokens from the seller.
        burnFrom(sender, amount);

        // Emit an event to log the sale.
        emit TokensSold(sender, salePrice, fees, amount);

        // Transfer protocol fees to the protocol fee destination
        (bool received,) = i_bondingCurve.getProtocolFeeDestination().call{value: fees}("");
        if (!received) {
            revert GroupToken__ProtocolFeeTransferFailed();
        }

        // Transfer Ether to the seller.
        (bool recieved,) = payable(sender).call{value: salePrice}("");
        if (!recieved) {
            revert GroupToken__TokenSaleTransferFailed();
        }
    }

    /*///////////////////////////////////////////////////////////////
                          GETTER FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// @notice Returns the address of the ExponentialBondingCurve proxy contract.
    function getBondingCurveProxyAddress() external view returns (address) {
        return address(i_bondingCurve);
    }

    /// @notice Returns the total amount of Ether held in the contract.
    function getReserveBalance() external view returns (uint256) {
        return reserveBalance;
    }

    /// @notice Returns the total amount of fees collected by the contract.
    function getCollectedFees() external view returns (uint256) {
        return collectedFees;
    }
}
