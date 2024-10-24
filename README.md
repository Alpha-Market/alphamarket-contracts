<h1 align="center">
Alpha Market DAO and Bonding Curves
</h1>



<p align="center">
  <a href="#description">Description</a> •
  <a href="#local-setup">Local Setup</a> •
  <a href="#dao">DAO</a> •
  <a href="#bonding-curves">Bonding Curves</a> •
  <a href="#groups">Groups</a> •
  <a href="#planned-updates">Planned Updates</a> •
  <a href="#license">License</a>
</p>

---

<h4 align="center">
Website: <a href=''>https://enter-site-here.com</a>
</div>

## Description

The framework consists of several smart contracts working in tandem to manage the issuance, redemption, and pricing of tokens within a curation market platform. At its core, an ERC20 token contract interacts with a bonding curve contract to dynamically set token prices based on supply and reserve balances. Users can mint new tokens by sending M-Bitcoin, with the number of tokens issued and the associated fees being calculated through the bonding curve. Conversely, tokens can be burned to receive M-Bitcoin, with redemption values also determined by the bonding curve to ensure liquidity and accurate pricing.

In addition to token management, the system includes a protocol for fee collection, where a portion of transaction fees is shared with the token contract. This setup supports ongoing funding for group initiatives and platform maintenance. Together, these contracts ensure a fluid and responsive token economy, enabling efficient market operations and sustainable growth for the curation market platform.

The DAO oversees the management and adjustment of the bonding curves used in the token system. It operates through governance mechanisms enabled by smart contracts, which allow token holders to propose and vote on changes to key parameters such as curve settings and fee structures. By leveraging governance tokens, the DAO can implement adjustments to the curves in response to market conditions, ensuring that token issuance and redemption remain balanced and effective. This decentralized approach provides transparency and adaptability, enabling the system to evolve and respond to the needs of the platform and its participants while maintaining the integrity and functionality of the token economy.

## Local Setup

This repository utilizes the [Foundry](https://book.getfoundry.sh/getting-started/installation) smart contract development toolchain.

```bash
# Clone this repository and cd into directory
git clone https://github.com/dustinstacy/bonding-curve.git
cd bonding-curve
```

## DAO 

### Infrastructure Overview

### 1. Governance Token (ERC20)

The backbone of this DAO is a Governance Token that adheres to the OpenZeppelin ERC20 standard. This token is used to grant voting power to the DAO's members and represents ownership and influence within the organization.

- **Contract**: `ERC20`
- **Features**: 
  - **Mintable/Burnable**: Allows for the creation and destruction of tokens based on governance decisions or economic needs.
  - **Capped Supply**: Optionally, the total supply of tokens can be capped to ensure scarcity.
  - **Governance Voting Power**: Token holders use their tokens to vote on proposals, with voting power proportional to the number of tokens held.

### 2. Governor Contract (Governance)

The Governor contract manages the proposal and voting process. This contract is derived from OpenZeppelin's `Governor` library, which provides a flexible and secure way to handle governance decisions.

- **Contract**: `Governor`
- **Features**: 
  - **Proposal Creation**: Members can create proposals by submitting a governance proposal along with the required token amount to fund the proposal.
  - **Voting**: Token holders vote on proposals within a predefined voting period. Voting is usually conducted via the ERC20 token balance, with each token representing one vote.
  - **Quorum and Thresholds**: Customizable quorum and voting thresholds ensure that proposals require sufficient participation and support to pass.

### 3. Timelock Contract

The Timelock contract acts as a delay mechanism for executing proposals once they’ve been approved. It prevents immediate execution of changes, providing a grace period during which members can review the outcomes and potentially challenge decisions.

- **Contract**: `TimelockController`
- **Features**: 
  - **Delay**: A fixed delay period (e.g., 2 days) before any approved proposal is executed, allowing for transparency and time to address any potential issues or disputes.
  - **Admin Control**: A designated admin (often a multisig wallet) has the authority to set or update the delay period, ensuring flexibility while maintaining security.
  - **Execution Queue**: Approved proposals are placed in a queue for execution after the delay period expires, ensuring a controlled implementation of decisions.

### How It All Works Together

1. **Governance Token Distribution**: Members acquire governance tokens through various means, such as purchasing, earning through contributions, or participating in a distribution event.

2. **Proposal Creation and Voting**: Members submit proposals to the Governor contract. Proposals may include changes to the DAO's protocol, spending of treasury funds, or modifications to the governance process itself. Other token holders vote on these proposals according to their token holdings.

3. **Proposal Approval**: Once a proposal reaches the required quorum and meets the approval threshold, it is sent to the Timelock contract.

4. **Timelock Delay**: The Timelock contract enforces a delay before executing the proposal, during which period stakeholders can review the proposal's details and prepare for the change.

5. **Execution**: After the delay, the Timelock executes the proposal if no objections have been raised, ensuring that changes are applied in a controlled and transparent manner.

### Benefits of This Infrastructure

- **Decentralization**: Token-based voting and proposal mechanisms distribute decision-making power among all stakeholders.
- **Security**: The Timelock contract adds a layer of security by delaying implementation, allowing for oversight and reducing the risk of hasty decisions.
- **Flexibility**: The system can be adjusted to fit different governance models and community needs by customizing tokenomics, voting thresholds, and delay periods.

## Bonding Curves

## Overview

Bonding curve smart contracts are mechanisms that facilitate the dynamic pricing and liquidity of a token by linking the price of the token to its supply through a mathematical curve. These contracts are often used in DAOs to manage token issuance and incentivize participation. By implementing a bonding curve, a DAO can create a continuous market for its governance or utility tokens, adjusting the token price based on demand and supply.

## How Bonding Curves Work

A bonding curve is a mathematical function that defines the relationship between the price and the supply of a token. As more tokens are bought, the price increases according to the curve, and as tokens are sold, the price decreases. This mechanism ensures that the price of the token is directly influenced by market activity, providing liquidity and adjusting the value based on demand.

## Key Components

### 1. **Bonding Curve Contracts**

Bonding curve contracts are smart contracts designed to manage the issuance and redemption of tokens using a mathematical curve to determine pricing.

- **Contracts**: `ExponentialBondingCurve`, `LinearBondingCurve`
- **Features**:
  - **Pricing Function**: Utilizes mathematical formulas (e.g., exponential, linear) to dynamically set the token price based on the current supply and reserve balance.
  - **Customizable Curves**: Allows adjustments to state variables such as `reserveRatio` and `initialReserve` to tailor the curve’s shape and behavior according to specific needs.
  - **Fee Management**: Provides mechanisms to set and adjust the percentage of fees collected by both the protocol and the token contract, ensuring flexibility in fee distribution.
  - **Upgradeability**: Implements the `ERC1967` standard for upgradeability, enabling the contract to be upgraded or replaced while maintaining its state and functionality.

### 2. **Liquidity and Incentives**

Bonding curves provide liquidity by creating a continuous market for the token. They also align incentives by adjusting the token price in response to market demand.

- **Features**:
  - **Liquidity Provision**: Ensures that tokens can be bought or sold at any time, improving market liquidity.
  - **Incentive Alignment**: The price mechanism encourages early participation and rewards users who contribute early to the Group.


## Groups

### 1. **Curve Token Contracts**

The curve token contracts manage tokens used for groups launched by hosts on a curation market platform. These ERC20 tokens interact with a bonding curve to facilitate their issuance and redemption.

- **Contract**: `GroupToken`, `LinearToken`
- **Features**:
  - **Dynamic Pricing**: Uses the corresponding curve contract to determine token prices based on the curve’s formula and the current reserve balance.
  - **Token Issuance**: Enables users to mint new tokens by sending Ether. The number of tokens minted and associated fees are determined by the bonding curve.
  - **Token Redemption**: Allows users to burn tokens in exchange for Ether. Redemption values are calculated using the bonding curve, providing liquidity and market-driven pricing.
  - **Fee Collection**: The token contract collects a share of the protocol fees from each transaction, which is used to fund group initiatives and support the platform.

### Use Case

The curve token is used on a curation market platform where hosts can launch and manage groups. Each group can issue tokens that are bought and sold using the exponential bonding curve. This setup ensures:

- **Automated Price Discovery**: The bonding curve ensures that token prices adjust automatically based on market activity and reserve balance.
- **Continuous Liquidity**: Users can always buy or sell tokens, ensuring ongoing liquidity for the market.
- **Flexible Fee Structure**: Protocol and fee-sharing settings are adjustable, allowing for effective management of fees and rewards.

## Planned Updates

Our project is continually evolving to enhance functionality and user experience. Here are some exciting updates planned for the future:

- **Ordinal Integrations for L1 Asset Exposure**: We aim to integrate ordinal mechanisms to provide exposure and interaction with Layer 1 (L1) assets, enhancing the versatility and reach of our token ecosystem.

- **Group DAOs for Incentives**: We plan to introduce Group DAOs that will offer tailored incentives for participation and contribution. These DAOs will allow for more targeted rewards and governance, fostering greater engagement and collaboration within groups.

- **Expanded Curve Shapes**: To provide more flexibility and options, we will introduce additional bonding curve shapes, including Decaying and Logarithmic curves. These new curves will offer varied pricing dynamics to better suit different use cases and market conditions.

- **Membership Auctions**: We are working on implementing membership auctions, which will allow users to bid for exclusive access or benefits within the platform. This feature will create new opportunities for engagement and value generation.

- **User Interaction Incentives (Point System)**: A point-based system will be introduced to reward user interactions and contributions. This system will incentivize active participation and help drive engagement through gamified rewards and recognition.

Stay tuned for these updates as we continue to enhance and expand our platform to better serve our community and meet evolving needs.

## License

The MIT License (MIT)

Copyright (c) 2024 Dustin Stacy
