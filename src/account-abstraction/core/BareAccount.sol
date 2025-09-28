// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/* solhint-disable avoid-low-level-calls */

import "../utils/Exec.sol";

/**
 * Bare account implementation.
 * This contract provides the bare logic for execute transaction
 * Specific account implementation should inherit it and provide the account-specific logic.
 */
contract BareAccount {
    error Unauthorized();

    /**
     * execute a single call from the account.
     */
    function execute(address target, uint256 value, bytes calldata data) virtual external {
        _requireForExecute();

        bool ok = Exec.call(target, value, data, gasleft());
        if (!ok) {
            Exec.revertWithReturnData();
        }
    }

    function _requireForExecute() internal view virtual {
        require(msg.sender == address(this), Unauthorized());
    }
}
