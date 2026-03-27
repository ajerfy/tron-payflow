// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseDexRouterAdapter.sol";

interface ISunSwapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract SunSwapV2Adapter is BaseDexRouterAdapter {
    address public immutable router;

    constructor(address router_, address _usdt, uint16 _feeBps) BaseDexRouterAdapter(_usdt, _feeBps) {
        router = router_;
    }

    function _router() internal view override returns (address) {
        return router;
    }

    function _swapExactInput(address[] memory path, uint256 amountIn) internal override returns (uint256 amountOut) {
        uint256[] memory amounts = ISunSwapV2Router(router).swapExactTokensForTokens(
            amountIn,
            1, // amountOutMin is enforced by PaymentProcessor maxInput + backend quote buffer
            path,
            address(this),
            block.timestamp + 300
        );
        amountOut = amounts[amounts.length - 1];
    }
}
