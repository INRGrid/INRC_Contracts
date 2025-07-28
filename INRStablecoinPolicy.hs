{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}

module INRStablecoinPolicy where

import           Plutus.V2.Ledger.Api (BuiltinData, ScriptContext, mkMintingPolicyScript, Validator, MintingPolicy, mkValidatorScript, TxInfo, ScriptPurpose(..), txInfoSignatories, unMintingPolicyScript)
import           PlutusTx
import           PlutusTx.Prelude     hiding (Semigroup(..), unless)
import           Prelude              (IO, Show)
import           Plutus.V2.Ledger.Contexts

-- Parameterize policy by issuer's pubkey hash and freeze control switch
data PolicyParams = PolicyParams
    { issuer :: PubKeyHash
    , freeze :: Bool -- If True, all transfers are frozen
    }

PlutusTx.makeLift ''PolicyParams

{-# INLINABLE mkINRPolicy #-}
mkINRPolicy :: PolicyParams -> BuiltinData -> BuiltinData -> ()
mkINRPolicy params _ ctxRaw =
    let
        ctx = unsafeFromBuiltinData @ScriptContext ctxRaw
        info :: TxInfo
        info = scriptContextTxInfo ctx
        signedByIssuer = issuer params `elem` txInfoSignatories info
        isFrozen = freeze params
        -- Only issuer can mint/burn
        cond = signedByIssuer && not isFrozen
    in
        if cond
            then ()
            else error ()

policy :: PolicyParams -> MintingPolicy
policy params = mkMintingPolicyScript $
    $$(PlutusTx.compile [|| \p -> mkINRPolicy p ||]) `PlutusTx.applyCode` PlutusTx.liftCode params

-- To create a “freeze” event, update 'freeze' to True when deploying new policy
