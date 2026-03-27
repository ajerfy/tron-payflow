// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITRC20Like {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IRouterAdapterLike {
    struct AssetInput {
        address token;
        uint256 amountInMax;
    }

    struct SwapResult {
        uint256 totalInputValueUsdt;
        uint256 totalFeeUsdt;
        uint256[] usedAmounts;
    }
}

abstract contract BaseDexRouterAdapter is IRouterAdapterLike {
    error UnsupportedAsset();
    error InsufficientLiquidity();
    error BadPath();

    address public immutable usdt;
    uint16 public feeBps;

    // token => path to USDT
    mapping(address => address[]) internal paths;

    constructor(address _usdt, uint16 _feeBps) {
        usdt = _usdt;
        feeBps = _feeBps;
    }

    function setPath(address token, address[] calldata path) external {
        if (path.length < 2) revert BadPath();
        if (path[path.length - 1] != usdt) revert BadPath();
        paths[token] = path;
    }

    function setFeeBps(uint16 _feeBps) external {
        feeBps = _feeBps;
    }

    function swapToExactUsdt(uint256 exactOutUsdt, AssetInput[] calldata assets) external returns (SwapResult memory result) {
        uint256[] memory usedAmounts = new uint256[](assets.length);
        uint256 totalInputValueUsdt;
        uint256 remaining = exactOutUsdt;

        for (uint256 i = 0; i < assets.length && remaining > 0; i++) {
            AssetInput calldata a = assets[i];
            if (a.amountInMax == 0) continue;
            address[] memory p = paths[a.token];
            if (p.length < 2) revert UnsupportedAsset();

            ITRC20Like(a.token).transferFrom(msg.sender, address(this), a.amountInMax);
            ITRC20Like(a.token).approve(_router(), a.amountInMax);

            // We cap each leg by remaining to avoid over-swapping and to keep exact-output flow deterministic.
            uint256 amountOut = _swapExactInput(p, a.amountInMax);
            if (amountOut == 0) revert InsufficientLiquidity();

            uint256 take = amountOut > remaining ? remaining : amountOut;
            usedAmounts[i] = a.amountInMax;
            totalInputValueUsdt += take;
            remaining = take >= remaining ? 0 : remaining - take;
        }

        if (remaining != 0) revert InsufficientLiquidity();
        uint256 totalFee = (totalInputValueUsdt * feeBps) / 10_000;
        ITRC20Like(usdt).transfer(msg.sender, exactOutUsdt);

        result = SwapResult({totalInputValueUsdt: totalInputValueUsdt, totalFeeUsdt: totalFee, usedAmounts: usedAmounts});
    }

    function _router() internal view virtual returns (address);

    function _swapExactInput(address[] memory path, uint256 amountIn) internal virtual returns (uint256 amountOut);
}
