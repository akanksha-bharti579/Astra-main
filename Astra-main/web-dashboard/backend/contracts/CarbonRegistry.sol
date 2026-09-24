// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CarbonRegistry
 * @dev Decentralized registry of verified carbon data entries.
 *      Stores hashes of crowd-sourced carbon benchmarks, region metrics,
 *      and sustainable architecture templates.
 */
contract CarbonRegistry {

    enum EntryType { MODEL_BENCHMARK, REGION_METRIC, ARCHITECTURE_TEMPLATE }

    struct Entry {
        bytes32 entryHash;
        EntryType entryType;
        address submitter;
        uint256 timestamp;
        bool verified;
    }

    // entryHash => Entry
    mapping(bytes32 => Entry) public entries;

    // All entry hashes for enumeration
    bytes32[] public entryHashes;

    event EntryRegistered(
        bytes32 indexed entryHash,
        uint8 entryType,
        address indexed submitter,
        uint256 timestamp
    );

    event EntryVerified(bytes32 indexed entryHash, uint256 timestamp);

    /**
     * @dev Register a verified carbon data entry on-chain.
     * @param _entryHash SHA-256 hash of the entry data.
     * @param _entryType Type of entry (0=model_benchmark, 1=region_metric, 2=architecture_template).
     */
    function registerEntry(bytes32 _entryHash, uint8 _entryType) external {
        require(entries[_entryHash].timestamp == 0, "Entry already registered");
        require(_entryType <= 2, "Invalid entry type");

        entries[_entryHash] = Entry({
            entryHash: _entryHash,
            entryType: EntryType(_entryType),
            submitter: msg.sender,
            timestamp: block.timestamp,
            verified: true
        });

        entryHashes.push(_entryHash);

        emit EntryRegistered(_entryHash, _entryType, msg.sender, block.timestamp);
        emit EntryVerified(_entryHash, block.timestamp);
    }

    /**
     * @dev Check if an entry is verified on-chain.
     */
    function isVerified(bytes32 _entryHash) external view returns (bool) {
        return entries[_entryHash].verified;
    }

    /**
     * @dev Get an entry by hash.
     */
    function getEntry(bytes32 _entryHash) external view returns (
        bytes32, uint8, address, uint256, bool
    ) {
        Entry memory e = entries[_entryHash];
        return (e.entryHash, uint8(e.entryType), e.submitter, e.timestamp, e.verified);
    }

    /**
     * @dev Total number of registry entries.
     */
    function totalEntries() external view returns (uint256) {
        return entryHashes.length;
    }
}
