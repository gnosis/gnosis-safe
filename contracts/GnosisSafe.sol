pragma solidity 0.4.23;
import "./Module.sol";
import "./ModuleManager.sol";
import "./OwnerManager.sol";


/// @title Gnosis Safe - A multisignature wallet with support for confirmations using signed messages based on ERC191.
/// @author Stefan George - <stefan@gnosis.pm>
contract GnosisSafe is ModuleManager, OwnerManager {

    string public constant NAME = "Gnosis Safe";
    string public constant VERSION = "0.0.1";

    /// @dev Setup function sets initial storage of contract.
    /// @param _owners List of Safe owners.
    /// @param _threshold Number of required confirmations for a Safe transaction.
    /// @param to Contract address for optional delegate call.
    /// @param data Data payload for optional delegate call.
    function setup(address[] _owners, uint8 _threshold, address to, bytes data)
        public
    {
        setupOwners(_owners, _threshold);
        setupModules(to, data);
    }
}
