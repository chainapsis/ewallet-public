use frost_ed25519_keplr as frost;
// SSS functions are re-exported at crate root level
use frost_ed25519_keplr::{extend_shares_ed25519, sss_combine_ed25519, sss_split_ed25519};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use rand_core::OsRng;

use crate::keygen::NapiKeygenOutput;

/// Output from SSS split operation
#[napi(object)]
#[derive(Debug, Clone)]
pub struct NapiSssSplitOutput {
    #[napi(js_name = "key_packages")]
    pub key_packages: Vec<NapiKeygenOutput>,
}

/// Output from SSS extend operation
#[napi(object)]
#[derive(Debug, Clone)]
pub struct NapiSssExtendOutput {
    #[napi(js_name = "new_key_packages")]
    pub new_key_packages: Vec<NapiKeygenOutput>,
    #[napi(js_name = "public_key_package")]
    pub public_key_package: Vec<u8>,
}

/// Split an Ed25519 signing share into SSS shares for distribution to KSN nodes.
///
/// # Arguments
/// * `signing_share` - The 32-byte signing share to split
/// * `identifiers` - Array of 32-byte identifiers for each share (one per node)
/// * `min_signers` - Minimum number of shares required to reconstruct (threshold)
///
/// # Returns
/// Key packages for each identifier
#[napi]
pub fn napi_sss_split_ed25519(
    signing_share: Vec<u8>,
    identifiers: Vec<Vec<u8>>,
    min_signers: u16,
) -> Result<NapiSssSplitOutput> {
    if signing_share.len() != 32 {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            "signing_share must be exactly 32 bytes",
        ));
    }

    let mut secret_arr = [0u8; 32];
    secret_arr.copy_from_slice(&signing_share);

    let identifiers_arr: Vec<[u8; 32]> = identifiers
        .iter()
        .map(|id| {
            if id.len() != 32 {
                return Err(napi::Error::new(
                    napi::Status::InvalidArg,
                    "each identifier must be exactly 32 bytes",
                ));
            }
            let mut arr = [0u8; 32];
            arr.copy_from_slice(id);
            Ok(arr)
        })
        .collect::<Result<Vec<_>>>()?;

    let mut rng = OsRng;
    let output = sss_split_ed25519(secret_arr, identifiers_arr, min_signers, &mut rng).map_err(
        |e| {
            napi::Error::new(
                napi::Status::GenericFailure,
                format!("sss_split_ed25519 error: {}", e),
            )
        },
    )?;

    let pubkey_package_bytes = output.public_key_package.serialize().map_err(|e| {
        napi::Error::new(
            napi::Status::GenericFailure,
            format!("Failed to serialize public_key_package: {:?}", e),
        )
    })?;

    let key_packages: Vec<NapiKeygenOutput> = output
        .key_packages
        .iter()
        .map(|kp| {
            let key_package_bytes = kp.serialize().map_err(|e| {
                napi::Error::new(
                    napi::Status::GenericFailure,
                    format!("Failed to serialize key_package: {:?}", e),
                )
            })?;
            let identifier_bytes = kp.identifier().serialize().to_vec();

            Ok(NapiKeygenOutput {
                key_package: key_package_bytes,
                public_key_package: pubkey_package_bytes.clone(),
                identifier: identifier_bytes,
            })
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(NapiSssSplitOutput { key_packages })
}

/// Combine SSS shares to recover the original signing share.
///
/// # Arguments
/// * `key_packages` - Array of serialized key packages (at least min_signers required)
///
/// # Returns
/// The recovered 32-byte signing share
#[napi]
pub fn napi_sss_combine_ed25519(key_packages: Vec<Vec<u8>>) -> Result<Vec<u8>> {
    use frost::keys::KeyPackage;

    let key_packages: Vec<KeyPackage> = key_packages
        .iter()
        .map(|kp_bytes| {
            KeyPackage::deserialize(kp_bytes).map_err(|e| {
                napi::Error::new(
                    napi::Status::GenericFailure,
                    format!("Failed to deserialize key_package: {:?}", e),
                )
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let recovered = sss_combine_ed25519(&key_packages).map_err(|e| {
        napi::Error::new(
            napi::Status::GenericFailure,
            format!("sss_combine_ed25519 error: {}", e),
        )
    })?;

    Ok(recovered.to_vec())
}

/// Extend existing shares to add new participants without changing the polynomial.
///
/// This is used when a KSN node loses data and needs a new share computed from
/// the remaining active nodes' shares.
///
/// # Arguments
/// * `key_packages` - Existing key packages from active nodes (at least min_signers required)
/// * `new_identifiers` - 32-byte identifiers for the new participants
/// * `public_key_package` - The existing public key package
///
/// # Returns
/// New key packages for the additional identifiers
#[napi]
pub fn napi_sss_extend_ed25519(
    key_packages: Vec<Vec<u8>>,
    new_identifiers: Vec<Vec<u8>>,
    public_key_package: Vec<u8>,
) -> Result<NapiSssExtendOutput> {
    use frost::keys::{KeyPackage, PublicKeyPackage};

    let key_packages: Vec<KeyPackage> = key_packages
        .iter()
        .map(|kp_bytes| {
            KeyPackage::deserialize(kp_bytes).map_err(|e| {
                napi::Error::new(
                    napi::Status::GenericFailure,
                    format!("Failed to deserialize key_package: {:?}", e),
                )
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let public_key_package = PublicKeyPackage::deserialize(&public_key_package).map_err(|e| {
        napi::Error::new(
            napi::Status::GenericFailure,
            format!("Failed to deserialize public_key_package: {:?}", e),
        )
    })?;

    let new_identifiers_arr: Vec<[u8; 32]> = new_identifiers
        .iter()
        .map(|id| {
            if id.len() != 32 {
                return Err(napi::Error::new(
                    napi::Status::InvalidArg,
                    "each new identifier must be exactly 32 bytes",
                ));
            }
            let mut arr = [0u8; 32];
            arr.copy_from_slice(id);
            Ok(arr)
        })
        .collect::<Result<Vec<_>>>()?;

    let output =
        extend_shares_ed25519(&key_packages, new_identifiers_arr, &public_key_package).map_err(
            |e| {
                napi::Error::new(
                    napi::Status::GenericFailure,
                    format!("extend_shares_ed25519 error: {}", e),
                )
            },
        )?;

    let updated_pubkey_package_bytes = output.public_key_package.serialize().map_err(|e| {
        napi::Error::new(
            napi::Status::GenericFailure,
            format!("Failed to serialize public_key_package: {:?}", e),
        )
    })?;

    let new_key_packages: Vec<NapiKeygenOutput> = output
        .new_key_packages
        .iter()
        .map(|kp| {
            let key_package_bytes = kp.serialize().map_err(|e| {
                napi::Error::new(
                    napi::Status::GenericFailure,
                    format!("Failed to serialize key_package: {:?}", e),
                )
            })?;
            let identifier_bytes = kp.identifier().serialize().to_vec();

            Ok(NapiKeygenOutput {
                key_package: key_package_bytes,
                public_key_package: updated_pubkey_package_bytes.clone(),
                identifier: identifier_bytes,
            })
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(NapiSssExtendOutput {
        new_key_packages,
        public_key_package: updated_pubkey_package_bytes,
    })
}
