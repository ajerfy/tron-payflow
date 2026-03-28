// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOTCSettlement {
    function createDeal(
        address tokenA,
        uint256 amountA,
        address tokenB,
        uint256 amountB,
        address counterparty,
        uint256 timeoutHours
    ) external returns (uint256);
    function acceptDeal(uint256 dealId) external;
    function fundDeal(uint256 dealId) external payable;
    function confirmSettlement(uint256 dealId) external;
    function executeSettlement(uint256 dealId) external;
}

interface ITokenApprove {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract ReentrantDealParticipant {
    IOTCSettlement public immutable target;
    uint256 public attackDealId;
    bool public triedReentry;

    constructor(address targetAddress) {
        target = IOTCSettlement(targetAddress);
    }

    function approveToken(address token, address spender, uint256 amount) external {
        ITokenApprove(token).approve(spender, amount);
    }

    function createDeal(
        address tokenA,
        uint256 amountA,
        address tokenB,
        uint256 amountB,
        address counterparty,
        uint256 timeoutHours
    ) external returns (uint256) {
        return target.createDeal(tokenA, amountA, tokenB, amountB, counterparty, timeoutHours);
    }

    function accept(uint256 dealId) external {
        target.acceptDeal(dealId);
    }

    function fund(uint256 dealId) external payable {
        attackDealId = dealId;
        target.fundDeal{value: msg.value}(dealId);
    }

    function confirm(uint256 dealId) external {
        attackDealId = dealId;
        target.confirmSettlement(dealId);
    }

    function finalize(uint256 dealId) external {
        attackDealId = dealId;
        target.executeSettlement(dealId);
    }

    receive() external payable {
        try target.executeSettlement(attackDealId) {
            triedReentry = false;
        } catch {
            triedReentry = true;
        }
    }
}
