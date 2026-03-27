// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseDexRouterAdapter.sol";

interface IJustMoneyRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract JustMoneyAdapter is BaseDexRouterAdapter {
    address public immutable router;

    constructor(address router_, address _usdt, uint16 _feeBps) BaseDexRouterAdapter(_usdt, _feeBps) {
        router = router_;
    }

    function _router() internal view override returns (address) {
        return router;
    }

    function _swapExactInput(address[] memory path, uint256 amountIn) internal override returns (uint256 amountOut) {
        uint256[] memory amounts = IJustMoneyRouter(router).swapExactTokensForTokens(
            amountIn,
            1,
            path,
            address(this),
            block.timestamp + 300
        );
        amountOut = amounts[amounts.length - 1];
    }
}
