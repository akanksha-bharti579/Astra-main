// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CarbonAccountability
 * @dev Stores SHA-256 hashes of carbon reports for tamper-proof ESG auditing.
 *      Full report data is stored off-chain (IPFS). Only hash + metadata on-chain.
 */
contract CarbonAccountability {

    struct Report {
        bytes32 reportHash;
        address reporter;
        string ipfsCid;
        uint256 timestamp;
    }

    // reportHash => Report
    mapping(bytes32 => Report) public reports;

    // All report hashes for enumeration
    bytes32[] public reportHashes;

    event ReportCommitted(
        bytes32 indexed reportHash,
        address indexed reporter,
        string ipfsCid,
        uint256 timestamp
    );

    /**
     * @dev Commit a carbon report hash on-chain.
     * @param _reportHash SHA-256 hash of the full carbon report JSON.
     * @param _ipfsCid IPFS CID where the full report is stored.
     */
    function commitReport(bytes32 _reportHash, string calldata _ipfsCid) external {
        require(reports[_reportHash].timestamp == 0, "Report already committed");

        reports[_reportHash] = Report({
            reportHash: _reportHash,
            reporter: msg.sender,
            ipfsCid: _ipfsCid,
            timestamp: block.timestamp
        });

        reportHashes.push(_reportHash);

        emit ReportCommitted(_reportHash, msg.sender, _ipfsCid, block.timestamp);
    }

    /**
     * @dev Get a committed report by hash.
     */
    function getReport(bytes32 _reportHash) external view returns (
        bytes32, address, string memory, uint256
    ) {
        Report memory r = reports[_reportHash];
        return (r.reportHash, r.reporter, r.ipfsCid, r.timestamp);
    }

    /**
     * @dev Check if a report hash exists on-chain.
     */
    function isVerified(bytes32 _reportHash) external view returns (bool) {
        return reports[_reportHash].timestamp > 0;
    }

    /**
     * @dev Get total number of committed reports.
     */
    function totalReports() external view returns (uint256) {
        return reportHashes.length;
    }
}
