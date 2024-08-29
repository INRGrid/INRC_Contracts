// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0

pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


import "hardhat/console.sol";

contract INRC is
    Initializable,
    INRC_Token,
    INRC_Burnable,
    INRC_Permit,
    OwnableUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor

    bool paused;

    address public feeCollector;

    address public masterMinter;

    string public currency;

    string public version;

    event issued(address indexed _recepient, uint _amount);

    mapping(address => uint) public balances;
    mapping(address => bool) public blacklist;
    mapping(address => bool) public isExcludedFromFee;
    mapping(address => uint) public minterAllowance;

    // additional variables for use if transaction fees ever became necessary
    uint public basisPointsRate = 0;
    uint public maximumFee = 0;

    error Blacklisted(address);
    error ContractPaused();
    error PayloadSizeMismatched();
    error EtherTransferFailed();
    error MintingNotAllowed();

    event BurnOnTransfer(address, uint256);
    event BurnOnWithdrawal(address, uint256);

    modifier pausable() {
        if (isPaused()) {
            revert ContractPaused();
        }
        _;
    }

    modifier isNotBlacklisted() {
        if (blacklist[msg.sender]) {
            revert Blacklisted(msg.sender);
        }
        _;
    }

    modifier onlyPayloadSize(uint size) {
        if (msg.data.length < size + 4 || msg.data.length > size + 4) {
            revert PayloadSizeMismatched();
        }
        _;
    }

    // constructor() {
    //     // _disableInitializers();
    // }

    function initialize(address _feeCollector) public initializer {
        __INRC_init("Indian Rupee Stable Coin", "INRC");
        __ERC20Burnable_init();
        __Ownable_init();
        __INRCPermit_init("INRC");
        feeCollector = _feeCollector;
        version = "1";
        currency = "INR";
        masterMinter = msg.sender;
    }

    function INRC_ISSUE(address _recepient, uint256 _amount) public pausable {
        if (_msgSender() != masterMinter) {
            if (minterAllowance[_msgSender()] < _amount) {
                revert MintingNotAllowed();
            }
        }
        _mint(_recepient, _amount);
        emit issued(_recepient, _amount);
    }

    function INRC_TRANSFER(
        address _recepient,
        uint256 _amount
    ) public onlyPayloadSize(2 * 32) isNotBlacklisted pausable returns (bool) {
        (uint256 fee, uint256 sendAmount) = _beforeTokenTransfer(
            _msgSender(),
            _recepient,
            _amount
        );
        // address owner = _msgSender();
        _transfer(owner(), _recepient, sendAmount);

        if (fee > 0) {
            _transfer(owner(), feeCollector, fee);
            emit Transfer(owner(), feeCollector, fee);
        }
        _afterTokenTransfer(owner(), _recepient, sendAmount);

        emit Transfer(owner(), _recepient, _amount);
        return true;
    }

    function INRC_TRANSFER_FROM(
        address _from,
        address _to,
        uint256 _amount
    ) public onlyPayloadSize(3 * 32) isNotBlacklisted pausable returns (bool) {
        (uint256 fee, uint256 sendAmount) = _beforeTokenTransfer(
            _from,
            _to,
            _amount
        );
        address spender = _msgSender();
        _spendAllowance(_from, spender, _amount);
        if (fee > 0) {
            _transfer(_from, feeCollector, fee);
            emit Transfer(_from, feeCollector, fee);
        }
        _transfer(_from, _to, sendAmount);
        _afterTokenTransfer(_from, _to, sendAmount);
        emit Transfer(_from, _to, _amount);
        return true;
    }

    function BURN_ON_TRANSFER(
        address _from,
        address _to,
        uint256 _amount
    ) external onlyOwner pausable {
        if (_amount > balanceOf(_from)) {
            revert AmountExceedsBalance();
        }
        _burn(_from, _amount);
        emit BurnOnTransfer(_to, _amount);
    }

    function BURN_ON_WITHDRAWAL(
        address _address,
        uint256 _amount
    ) external onlyOwner pausable {
        if (_amount > balanceOf(_address)) {
            revert AmountExceedsBalance();
        }
        _burn(_address, _amount);
        emit BurnOnWithdrawal(_address, _amount);
    }

    function permit(
        address _owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external pausable isNotBlacklisted {
        _permit(_owner, spender, value, deadline, v, r, s);
    }

    function receiveWithAuthorization(
        address _owner,
        address _receiver,
        uint256 _value,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external pausable isNotBlacklisted {
        _receiveWithAuthorization(
            _owner,
            _receiver,
            _value,
            _deadline,
            v,
            r,
            s
        );
    }

    function transferWithAuthorization(
        address _owner,
        address _sender,
        address _receiver,
        uint256 _value,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external pausable isNotBlacklisted {
        _transferWithAuthorization(
            _owner,
            _sender,
            _receiver,
            _value,
            _deadline,
            v,
            r,
            s
        );
    }

    function configureMinter(
        address _address,
        uint256 _amount
    ) external onlyOwner {
        minterAllowance[_address] = _amount;
    }

    function increaseMintingAllowance(
        address _address,
        uint256 _amount
    ) external onlyOwner {
        minterAllowance[_address] += _amount;
    }

    function decreaseMintingAllowance(
        address _address,
        uint256 _amount
    ) external onlyOwner {
        minterAllowance[_address] -= _amount;
    }

    function blacklistUser(address _blacklistAddress) public onlyOwner {
        blacklist[_blacklistAddress] = true;
    }

    function removeBlacklist(address _blacklistAddress) public onlyOwner {
        blacklist[_blacklistAddress] = false;
    }

    function excludeFromFee(
        address _address,
        bool _exclude
    ) external onlyOwner {
        isExcludedFromFee[_address] = _exclude;
    }

    function updateFee(uint _setBaseFee, uint _newMaxFee) public onlyOwner {
        // Ensure transparency by hardcoding limit beyond which fees can never be added
        // require(basisPointsRate);
        // require(maximumFee);
        basisPointsRate = _setBaseFee;
        maximumFee = _newMaxFee * (10 ** decimals());
    }

    function removeMinter(address _address) external onlyOwner {
        minterAllowance[_address] = 0;
    }

    function rescueERC20(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyOwner {
        IERC20Upgradeable(_token).transfer(_to, _amount);
    }

    function rescueEther(address _to, uint256 _amount) external onlyOwner {
        (bool success, ) = payable(_to).call{value: _amount}("");
        if (!success) {
            revert EtherTransferFailed();
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual returns (uint256, uint256) {
        uint fee = (amount * (basisPointsRate)) / (10000);
        if (fee > maximumFee) {
            fee = maximumFee;
        }
        uint sendAmount = amount - (fee);
        return (fee, sendAmount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    function updateMasterMinter(address _address) external onlyOwner {
        masterMinter = _address;
    }

    function checkBlacklist(address _address) public view returns (bool) {
        return blacklist[_address];
    }

    function isMinter(address _address) public view returns (bool) {
        if (minterAllowance[_address] > 0) {
            return true;
        } else {
            return false;
        }
    }

    function togglePause(bool _status) external onlyOwner {
        if (_status) {
            require(!paused, "Contract is already Paused !");
            paused = true;
        } else {
            require(paused, "Contract is already Unpaused !");
            paused = false;
        }
    }

    function isPaused() public view returns (bool) {
        return paused;
    }

    //Who should burn the token ? Only Owner or anyone
    // function INRC_BURN() public payable onlyOwner {
    //     require(totalSupply() > msg.value , "");
    // }

    // @param _amount Number of tokens to be issued
    // function redeem(uint amount) public onlyOwner {
    //     require(_totalSupply >= amount);
    //     require(balances[owner] >= amount);

    //     _totalSupply -= amount;
    //     balances[owner] -= amount;
    //     Redeem(amount);
    // }
}
