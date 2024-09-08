// const SIGNING_DOMAIN_NAME = "Zero_Carbon";
// const SIGNING_DOMAIN_VERSION = "1";

// /**
//  *
//  * LazyMinting is a helper class that creates NFTVoucher objects and signs them, to be redeemed later by the LazyNFT contract.
//  */


// class CarbonCreditParcel {
//    public contract : any;
//    public signer : any;
//    public _domain : any;
//    public voucherCount : any;
//    public signer2 : any;

//    constructor(data:any){
//     const {_contract, _signer} = data;
//     this.contract = _contract;
//     this.signer = _signer;
//    }

//    async _signingDomain() {
//     if(this._domain != null){
//         return this._domain;
//     }
//     const chainId = 31337;
//     this._domain = {
//         name : SIGNING_DOMAIN_NAME,
//         version : SIGNING_DOMAIN_VERSION,
//         verifyingContract : this.contract.address,
//         chainId,
//     };
//     return this._domain;
//    }

//    async createParcel(
//     seller : any,
//     tokenId : any,
//     maxCarbonUnits : any,
//     feeSlab : any,
//     sourcingFee : any,
//     pricePerCarbonUnit : any,
//     timePeriod : any,
//     tokenURI : any
//    ) {
//     const parcel = {
//        seller,
//        tokenId,
//        maxCarbonUnits,
//        feeSlab,
//        sourcingFee,
//        pricePerCarbonUnit,
//        timePeriod,
//        tokenURI
//     };
//     const domain = await this._signingDomain();
//     const types = {
//         CarbonCreditParcel: [
//             {name: "seller", type: "address"},
//             {name: "tokenId", type: "uint256"},
//             {name: "maxCarbonUnits", type: "uint256"},
//             {name: "feeSlab", type: "uint8"},
//             {name: "sourcingFee", type:"uint96"},
//             {name: "pricePerCarbonUnit", type: "uint256"},
//             {name: "timePeriod", type: "uint256"},
//             {name: "tokenURI", type: "string"},
//         ],
//     };
//     const signature = await this.signer._signTypedData(domain, types, parcel);
//     return{
//         ...parcel,
//         signature,
//     };
//    }

// }

// export default CarbonCreditParcel;


const SIGNING_DOMAIN_NAME = "PanoverseDAO";
const SIGNING_DOMAIN_VERSION = "1";

/**
 *
 * LazyMinting is a helper class that creates NFTVoucher objects and signs them, to be redeemed later by the LazyNFT contract.
 */


class VoteRecord {
   public contract : any;
   public signer : any;
   public _domain : any;
   public voucherCount : any;
//    public signer2 : any;

   constructor(data:any){
    const {_contract, _signer} = data;
    this.contract = _contract;
    this.signer = _signer;
   }

   async _signingDomain() {
    if(this._domain != null){
        return this._domain;
    }
    const chainId = 31337;
    this._domain = {
        name : SIGNING_DOMAIN_NAME,
        version : SIGNING_DOMAIN_VERSION,
        verifyingContract : this.contract.address,
        chainId,
    };
    return this._domain;
   }

   async createHashVote(
    // seller : any,
    // tokenId : any,
    // maxCarbonUnits : any,
    // feeSlab : any,
    // sourcingFee : any,
    // pricePerCarbonUnit : any,
    // timePeriod : any,
    // tokenURI : any

     roundNumber : any ,
     proposalNumber : any , 
     voter: any,
     vote: any
   ) {
    const hashVote = {
       roundNumber,
       proposalNumber,
       voter,
       vote,
    
    };
    const domain = await this._signingDomain();
    const types = {
        VoteRecord: [
            {name: "roundNumber", type: "uint256"},
            {name: "proposalNumber", type: "uint256"},
            {name: "voter", type: "address"},
            {name: "vote", type: "bool"},
        ],
    };
    const signature = await this.signer._signTypedData(domain, types, hashVote);
    return{
        ...hashVote,
        signature,
    };
   }

}

export default VoteRecord;