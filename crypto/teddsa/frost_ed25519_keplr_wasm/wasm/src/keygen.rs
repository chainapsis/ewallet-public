use frost::keys::KeyPackage;
use frost_ed25519_keplr as frost;
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::{KeyPackageRaw, PublicKeyPackageRaw};

/// Helper function to serialize with maps as objects (for JS plain objects instead of Map)
fn to_js_value<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
    value.serialize(&serializer).map_err(|err| JsValue::from_str(&err.to_string()))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CentralizedKeygenOutputRaw {
    // pub private_key: [u8; 32],
    // pub public_key: [u8; 32],
    pub keygen_outputs: Vec<KeyPackageRaw>,
    pub public_key_package: PublicKeyPackageRaw,
}

fn keygen_centralized_inner() -> Result<CentralizedKeygenOutputRaw, String> {
    let mut rng = OsRng;
    let max_signers = 2;
    let min_signers = 2;

    let (shares, pubkey_package) = frost::keys::generate_with_dealer(
        max_signers,
        min_signers,
        frost::keys::IdentifierList::Default,
        &mut rng,
    )
    .map_err(|e| e.to_string())?;

    // let verifying_key = pubkey_package.verifying_key();
    // let public_key_bytes: [u8; 32] = verifying_key
    //     .serialize()
    //     .map_err(|e| e.to_string())?
    //     .try_into()
    //     .map_err(|_| "Invalid public key length")?;

    let public_key_package = PublicKeyPackageRaw::from_public_key_package(&pubkey_package)?;

    let mut keygen_outputs = Vec::with_capacity(shares.len());
    for (_identifier, secret_share) in shares {
        let key_package = KeyPackage::try_from(secret_share).map_err(|e| e.to_string())?;
        let key_package_raw = KeyPackageRaw::from_key_package(&key_package)?;
        keygen_outputs.push(key_package_raw);
    }

    Ok(CentralizedKeygenOutputRaw {
        // private_key: [0u8; 32],
        // public_key: public_key_bytes,
        keygen_outputs,
        public_key_package,
    })
}

fn keygen_import_inner(secret: [u8; 32]) -> Result<CentralizedKeygenOutputRaw, String> {
    let mut rng = OsRng;
    let max_signers = 2;
    let min_signers = 2;

    let signing_key = frost::SigningKey::deserialize(&secret)
        .map_err(|e| format!("Invalid secret key: {}", e))?;

    let (shares, pubkey_package) = frost::keys::split(
        &signing_key,
        max_signers,
        min_signers,
        frost::keys::IdentifierList::Default,
        &mut rng,
    )
    .map_err(|e| e.to_string())?;

    // let verifying_key = pubkey_package.verifying_key();
    // let public_key_bytes: [u8; 32] = verifying_key
    //     .serialize()
    //     .map_err(|e| e.to_string())?
    //     .try_into()
    //     .map_err(|_| "Invalid public key length")?;

    let public_key_package = PublicKeyPackageRaw::from_public_key_package(&pubkey_package)?;

    let mut keygen_outputs = Vec::with_capacity(shares.len());
    for (_identifier, secret_share) in shares {
        let key_package = KeyPackage::try_from(secret_share).map_err(|e| e.to_string())?;
        let key_package_raw = KeyPackageRaw::from_key_package(&key_package)?;
        keygen_outputs.push(key_package_raw);
    }

    Ok(CentralizedKeygenOutputRaw {
        // private_key: secret,
        // public_key: public_key_bytes,
        keygen_outputs,
        public_key_package,
    })
}

#[wasm_bindgen]
pub fn cli_keygen_centralized_ed25519() -> Result<JsValue, JsValue> {
    let out = keygen_centralized_inner().map_err(|err| JsValue::from_str(&err))?;
    to_js_value(&out)
}

#[wasm_bindgen]
pub fn cli_keygen_import_ed25519(secret_key: JsValue) -> Result<JsValue, JsValue> {
    let secret: [u8; 32] = serde_wasm_bindgen::from_value(secret_key)
        .map_err(|err| JsValue::from_str(&format!("Invalid secret key format: {}", err)))?;

    let out = keygen_import_inner(secret).map_err(|err| JsValue::from_str(&err))?;
    to_js_value(&out)
}

/// Keygen from a 32-byte Ed25519 seed (RFC 8032).
/// Derives the scalar via SHA-512 + clamping, then reduces mod l for FROST compatibility.
/// The public key matches standard Ed25519 wallets because a * B = (a mod l) * B.
fn keygen_from_seed_inner(seed: [u8; 32]) -> Result<CentralizedKeygenOutputRaw, String> {
    use curve25519_dalek::Scalar;
    use sha2::{Digest, Sha512};

    // RFC 8032: clamp(SHA-512(seed)[0..32])
    let h = Sha512::digest(&seed);
    let mut clamped = [0u8; 32];
    clamped.copy_from_slice(&h[..32]);
    clamped[0] &= 248;
    clamped[31] &= 127;
    clamped[31] |= 64;

    // Reduce mod l for canonical scalar (FROST's SigningKey requires scalar < l).
    let scalar = Scalar::from_bytes_mod_order(clamped);
    let scalar_bytes = scalar.to_bytes();

    keygen_import_inner(scalar_bytes)
}

#[wasm_bindgen]
pub fn cli_keygen_seed_ed25519(seed: JsValue) -> Result<JsValue, JsValue> {
    let seed_bytes: [u8; 32] = serde_wasm_bindgen::from_value(seed)
        .map_err(|err| JsValue::from_str(&format!("Invalid seed format: {}", err)))?;

    let out = keygen_from_seed_inner(seed_bytes).map_err(|err| JsValue::from_str(&err))?;
    to_js_value(&out)
}
