// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITRC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract OTCSettlement {
    enum DealStatus {
        Created,
        Accepted,
        BothFunded,
        Settled,
        Disputed,
        Resolved,
        Expired,
        Cancelled
    }

    struct Deal {
        uint256 id;
        address partyA;
        address partyB;
        address tokenA;
        uint256 amountA;
        address tokenB;
        uint256 amountB;
        DealStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        bool partyAFunded;
        bool partyBFunded;
        bool partyAConfirmed;
        bool partyBConfirmed;
        string disputeReason;
        uint256 settledAt;
    }

    error InvalidCounterparty();
    error InvalidAmount();
    error InvalidTimeout();
    error InvalidStatus();
    error OnlyCounterparty();
    error OnlyPartyA();
    error OnlyParticipant();
    error AlreadyFunded();
    error AlreadyConfirmed();
    error DealHasExpired();
    error NotExpired();
    error TransferFailed();
    error IncorrectTrxAmount();
    error Unauthorized();

    event DealCreated(
        uint256 indexed dealId,
        address indexed partyA,
        address indexed partyB,
        address tokenA,
        uint256 amountA,
        address tokenB,
        uint256 amountB,
        uint256 expiresAt
    );
    event DealAccepted(uint256 indexed dealId);
    event DealFunded(uint256 indexed dealId, address indexed party);
    event DealSettled(uint256 indexed dealId, uint256 settledAt);
    event DealDisputed(uint256 indexed dealId, string reason);
    event DealResolved(uint256 indexed dealId, bool refundedBoth);
    event DealExpired(uint256 indexed dealId);
    event DealCancelled(uint256 indexed dealId);

    address public immutable owner;
    uint256 public nextDealId;

    mapping(uint256 => Deal) private deals;
    mapping(address => uint256[]) private dealsByParticipant;

    uint256 private unlocked = 1;

    modifier nonReentrant() {
        require(unlocked == 1, "REENTRANCY");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createDeal(
        address tokenA,
        uint256 amountA,
        address tokenB,
        uint256 amountB,
        address counterparty,
        uint256 timeoutHours
    ) external returns (uint256 dealId) {
        if (counterparty == address(0) || counterparty == msg.sender) revert InvalidCounterparty();
        if (amountA == 0 || amountB == 0) revert InvalidAmount();
        if (timeoutHours == 0) revert InvalidTimeout();

        dealId = nextDealId++;
        Deal storage deal = deals[dealId];
        deal.id = dealId;
        deal.partyA = msg.sender;
        deal.partyB = counterparty;
        deal.tokenA = tokenA;
        deal.amountA = amountA;
        deal.tokenB = tokenB;
        deal.amountB = amountB;
        deal.status = DealStatus.Created;
        deal.createdAt = block.timestamp;
        deal.expiresAt = block.timestamp + (timeoutHours * 1 hours);

        dealsByParticipant[msg.sender].push(dealId);
        dealsByParticipant[counterparty].push(dealId);

        emit DealCreated(dealId, msg.sender, counterparty, tokenA, amountA, tokenB, amountB, deal.expiresAt);
    }

    function acceptDeal(uint256 dealId) external {
        Deal storage deal = _deal(dealId);
        if (msg.sender != deal.partyB) revert OnlyCounterparty();
        if (deal.status != DealStatus.Created) revert InvalidStatus();
        if (block.timestamp > deal.expiresAt) revert DealHasExpired();

        deal.status = DealStatus.Accepted;
        emit DealAccepted(dealId);
    }

    function fundDeal(uint256 dealId) external payable nonReentrant {
        Deal storage deal = _deal(dealId);
        if (deal.status != DealStatus.Accepted && deal.status != DealStatus.BothFunded) revert InvalidStatus();
        if (block.timestamp > deal.expiresAt) revert DealHasExpired();

        if (msg.sender == deal.partyA) {
            if (deal.partyAFunded) revert AlreadyFunded();
            _collectAsset(deal.tokenA, deal.amountA);
            deal.partyAFunded = true;
        } else if (msg.sender == deal.partyB) {
            if (deal.partyBFunded) revert AlreadyFunded();
            _collectAsset(deal.tokenB, deal.amountB);
            deal.partyBFunded = true;
        } else {
            revert OnlyParticipant();
        }

        if (deal.partyAFunded && deal.partyBFunded) {
            deal.status = DealStatus.BothFunded;
        }

        emit DealFunded(dealId, msg.sender);
    }

    function confirmSettlement(uint256 dealId) external nonReentrant {
        Deal storage deal = _deal(dealId);
        if (deal.status != DealStatus.BothFunded) revert InvalidStatus();
        if (msg.sender != deal.partyA && msg.sender != deal.partyB) revert OnlyParticipant();

        if (msg.sender == deal.partyA) {
            if (deal.partyAConfirmed) revert AlreadyConfirmed();
            deal.partyAConfirmed = true;
        } else {
            if (deal.partyBConfirmed) revert AlreadyConfirmed();
            deal.partyBConfirmed = true;
        }

    }

    function executeSettlement(uint256 dealId) external nonReentrant {
        Deal storage deal = _deal(dealId);
        if (deal.status != DealStatus.BothFunded) revert InvalidStatus();
        if (!deal.partyAConfirmed || !deal.partyBConfirmed) revert InvalidStatus();

        deal.status = DealStatus.Settled;
        deal.settledAt = block.timestamp;
        deal.partyAFunded = false;
        deal.partyBFunded = false;

        _releaseAsset(deal.tokenA, deal.partyB, deal.amountA);
        _releaseAsset(deal.tokenB, deal.partyA, deal.amountB);
        emit DealSettled(dealId, deal.settledAt);
    }

    function raiseDispute(uint256 dealId, string calldata reason) external {
        Deal storage deal = _deal(dealId);
        if (msg.sender != deal.partyA && msg.sender != deal.partyB) revert OnlyParticipant();
        if (
            deal.status != DealStatus.Accepted &&
            deal.status != DealStatus.BothFunded
        ) revert InvalidStatus();

        deal.status = DealStatus.Disputed;
        deal.disputeReason = reason;
        emit DealDisputed(dealId, reason);
    }

    function resolveDispute(uint256 dealId, bool refundBoth) external nonReentrant onlyOwner {
        Deal storage deal = _deal(dealId);
        if (deal.status != DealStatus.Disputed) revert InvalidStatus();

        if (refundBoth) {
            _refundFundedDeposits(deal);
        } else {
            _releaseFundedAssetsForSettlement(deal);
        }

        deal.status = DealStatus.Resolved;
        if (!refundBoth) {
            deal.settledAt = block.timestamp;
        }

        emit DealResolved(dealId, refundBoth);
    }

    function claimExpired(uint256 dealId) external nonReentrant {
        Deal storage deal = _deal(dealId);
        if (block.timestamp <= deal.expiresAt) revert NotExpired();
        if (
            deal.status == DealStatus.Settled ||
            deal.status == DealStatus.Resolved ||
            deal.status == DealStatus.Expired ||
            deal.status == DealStatus.Cancelled
        ) revert InvalidStatus();

        _refundFundedDeposits(deal);
        deal.status = DealStatus.Expired;
        emit DealExpired(dealId);
    }

    function cancelDeal(uint256 dealId) external {
        Deal storage deal = _deal(dealId);
        if (msg.sender != deal.partyA) revert OnlyPartyA();
        if (deal.status != DealStatus.Created) revert InvalidStatus();

        deal.status = DealStatus.Cancelled;
        emit DealCancelled(dealId);
    }

    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return _deal(dealId);
    }

    function getMyDeals(address participant) external view returns (uint256[] memory) {
        return dealsByParticipant[participant];
    }

    function _collectAsset(address token, uint256 amount) internal {
        if (token == address(0)) {
            if (msg.value != amount) revert IncorrectTrxAmount();
            return;
        }

        if (msg.value != 0) revert IncorrectTrxAmount();
        _safeTransferFrom(token, msg.sender, address(this), amount);
    }

    function _releaseAsset(address token, address to, uint256 amount) internal {
        if (amount == 0) {
            return;
        }
        if (token == address(0)) {
            (bool ok, ) = payable(to).call{value: amount}("");
            if (!ok) revert TransferFailed();
            return;
        }

        _safeTransfer(token, to, amount);
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(ITRC20.transfer.selector, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(ITRC20.transferFrom.selector, from, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }

    function _refundFundedDeposits(Deal storage deal) internal {
        if (deal.partyAFunded) {
            deal.partyAFunded = false;
            _releaseAsset(deal.tokenA, deal.partyA, deal.amountA);
        }
        if (deal.partyBFunded) {
            deal.partyBFunded = false;
            _releaseAsset(deal.tokenB, deal.partyB, deal.amountB);
        }
    }

    function _releaseFundedAssetsForSettlement(Deal storage deal) internal {
        if (!deal.partyAFunded || !deal.partyBFunded) revert InvalidStatus();
        deal.partyAFunded = false;
        deal.partyBFunded = false;
        _releaseAsset(deal.tokenA, deal.partyB, deal.amountA);
        _releaseAsset(deal.tokenB, deal.partyA, deal.amountB);
    }

    function _deal(uint256 dealId) internal view returns (Deal storage deal) {
        if (dealId >= nextDealId) revert RequestNotFound();
        deal = deals[dealId];
    }

    error RequestNotFound();
}
