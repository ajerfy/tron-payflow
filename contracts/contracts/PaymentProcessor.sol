// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITRC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IRouterAdapter {
    struct AssetInput {
        address token;
        uint256 amountInMax;
    }

    struct SwapResult {
        uint256 totalInputValueUsdt;
        uint256 totalFeeUsdt;
        uint256[] usedAmounts;
    }

    function swapToExactUsdt(uint256 exactOutUsdt, AssetInput[] calldata assets) external returns (SwapResult memory result);
}

contract PaymentProcessor {
    struct PaymentRequest {
        address merchant;
        uint256 amountUsdt;
        bool paid;
        bool failed;
        uint64 createdAt;
        uint64 paidAt;
        string merchantRef;
        bytes32 reconciliationHash;
        address payer;
        uint256 totalInputValueUsdt;
        uint256 totalFeeUsdt;
    }

    error RequestNotFound();
    error AlreadyPaid();
    error DeadlineExceeded();
    error SlippageExceeded();
    error InsufficientLiquidity();

    event PaymentRequestCreated(uint256 indexed requestId, address indexed merchant, uint256 amountUsdt, string merchantRef);
    event PaymentSettled(
        uint256 indexed requestId,
        address indexed payer,
        address indexed merchant,
        uint256 exactOutUsdt,
        uint256 totalInputValueUsdt,
        uint256 totalFeeUsdt
    );
    event PaymentFailed(uint256 indexed requestId, address indexed payer, string reason);

    address public immutable usdt;
    IRouterAdapter public immutable router;
    uint256 public requestCount;

    mapping(uint256 => PaymentRequest) public requests;

    constructor(address _usdt, address _router) {
        usdt = _usdt;
        router = IRouterAdapter(_router);
    }

    function createPaymentRequest(uint256 amountUsdt, string calldata merchantRef) external returns (uint256 requestId) {
        requestId = requestCount++;
        requests[requestId] = PaymentRequest({
            merchant: msg.sender,
            amountUsdt: amountUsdt,
            paid: false,
            failed: false,
            createdAt: uint64(block.timestamp),
            paidAt: 0,
            merchantRef: merchantRef,
            reconciliationHash: bytes32(0),
            payer: address(0),
            totalInputValueUsdt: 0,
            totalFeeUsdt: 0
        });

        emit PaymentRequestCreated(requestId, msg.sender, amountUsdt, merchantRef);
    }

    function executeIntentPayment(
        uint256 requestId,
        IRouterAdapter.AssetInput[] calldata assets,
        uint256 maxTotalInputValueUsdt,
        uint256 deadline
    ) external {
        if (deadline < block.timestamp) revert DeadlineExceeded();
        if (requestId >= requestCount) revert RequestNotFound();

        PaymentRequest storage r = requests[requestId];
        if (r.paid) revert AlreadyPaid();

        for (uint256 i = 0; i < assets.length; i++) {
            ITRC20(assets[i].token).transferFrom(msg.sender, address(this), assets[i].amountInMax);
            ITRC20(assets[i].token).approve(address(router), assets[i].amountInMax);
        }

        try router.swapToExactUsdt(r.amountUsdt, assets) returns (IRouterAdapter.SwapResult memory swapResult) {
            if (swapResult.totalInputValueUsdt > maxTotalInputValueUsdt) revert SlippageExceeded();

            ITRC20(usdt).transfer(r.merchant, r.amountUsdt);

            for (uint256 i = 0; i < assets.length; i++) {
                uint256 used = swapResult.usedAmounts[i];
                uint256 refund = assets[i].amountInMax - used;
                if (refund > 0) {
                    ITRC20(assets[i].token).transfer(msg.sender, refund);
                }
            }

            r.paid = true;
            r.paidAt = uint64(block.timestamp);
            r.payer = msg.sender;
            r.totalInputValueUsdt = swapResult.totalInputValueUsdt;
            r.totalFeeUsdt = swapResult.totalFeeUsdt;
            r.reconciliationHash = keccak256(
                abi.encode(requestId, msg.sender, r.merchant, r.amountUsdt, swapResult.totalInputValueUsdt, block.timestamp)
            );

            emit PaymentSettled(requestId, msg.sender, r.merchant, r.amountUsdt, swapResult.totalInputValueUsdt, swapResult.totalFeeUsdt);
        } catch {
            r.failed = true;
            emit PaymentFailed(requestId, msg.sender, "ROUTING_OR_LIQUIDITY");
            revert InsufficientLiquidity();
        }
    }
}
