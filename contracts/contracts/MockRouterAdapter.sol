// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITokenLike {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MockRouterAdapter {
    struct AssetInput {
        address token;
        uint256 amountInMax;
    }

    struct SwapResult {
        uint256 totalInputValueUsdt;
        uint256 totalFeeUsdt;
        uint256[] usedAmounts;
    }

    error InsufficientLiquidity();
    error UnsupportedAsset();
    error TransferFailed();

    address public immutable usdt;
    uint16 public feeBps;

    // token => USDT value per 1 token, scaled by 1e6 (for 6 decimals)
    mapping(address => uint256) public ratePerTokenUsdt;

    constructor(address _usdt) {
        usdt = _usdt;
    }

    function setFeeBps(uint16 _feeBps) external {
        feeBps = _feeBps;
    }

    function setRate(address token, uint256 rate) external {
        ratePerTokenUsdt[token] = rate;
    }

    function swapToExactUsdt(uint256 exactOutUsdt, AssetInput[] calldata assets) external returns (SwapResult memory result) {
        uint256[] memory used = new uint256[](assets.length);
        uint256 remaining = exactOutUsdt;
        uint256 totalGross;
        uint256 totalFee;

        for (uint256 i = 0; i < assets.length && remaining > 0; i++) {
            AssetInput calldata a = assets[i];
            uint256 rate = ratePerTokenUsdt[a.token];
            if (rate == 0) revert UnsupportedAsset();
            if (a.amountInMax == 0) continue;

            uint256 grossUsdt = (a.amountInMax * rate) / 1_000_000;
            uint256 netUsdt = (grossUsdt * (10_000 - feeBps)) / 10_000;
            if (netUsdt == 0) continue;

            uint256 takeNet = netUsdt > remaining ? remaining : netUsdt;
            uint256 requiredGross = (takeNet * 10_000 + (10_000 - feeBps) - 1) / (10_000 - feeBps);
            uint256 requiredIn = (requiredGross * 1_000_000 + rate - 1) / rate;
            uint256 realizedGross = (requiredIn * rate) / 1_000_000;
            uint256 realizedNet = (realizedGross * (10_000 - feeBps)) / 10_000;
            uint256 fee = realizedGross - realizedNet;

            if (!ITokenLike(a.token).transferFrom(msg.sender, address(this), requiredIn)) revert TransferFailed();
            used[i] = requiredIn;
            totalGross += realizedGross;
            totalFee += fee;
            remaining = realizedNet >= remaining ? 0 : remaining - realizedNet;
        }

        if (remaining != 0) revert InsufficientLiquidity();
        if (!ITokenLike(usdt).transfer(msg.sender, exactOutUsdt)) revert TransferFailed();

        result = SwapResult({
            totalInputValueUsdt: totalGross,
            totalFeeUsdt: totalFee,
            usedAmounts: used
        });
    }
}
