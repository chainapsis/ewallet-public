use cait_sith_keplr::seed_sss::seed_split;
use gloo_utils::format::JsValueSerdeExt;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn seed_sss_split(
    secret: JsValue,
    ks_node_hashes: JsValue,
    t: u32,
) -> Result<JsValue, JsValue> {
    let secret: [u8; 32] = secret
        .into_serde()
        .map_err(|err| JsValue::from_str(&err.to_string()))?;
    let ks_node_hashes: Vec<[u8; 32]> = ks_node_hashes
        .into_serde()
        .map_err(|err| JsValue::from_str(&err.to_string()))?;

    let out = seed_split(secret, ks_node_hashes, t)
        .map_err(|err| JsValue::from_str(&err.to_string()))?;

    JsValue::from_serde(&out).map_err(|err| JsValue::from_str(&err.to_string()))
}
