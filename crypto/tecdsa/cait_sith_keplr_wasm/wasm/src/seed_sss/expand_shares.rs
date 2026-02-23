use cait_sith_keplr::seed_sss::seed_expand_shares;
use cait_sith_keplr::sss::{Point256, ReshareResult};
use gloo_utils::format::JsValueSerdeExt;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn seed_sss_expand_shares(
    points: JsValue,
    additional_ks_node_hashes: JsValue,
    t: u32,
) -> Result<JsValue, JsValue> {
    let points: Vec<Point256> = points
        .into_serde()
        .map_err(|err| JsValue::from_str(&err.to_string()))?;
    let additional_ks_node_hashes: Vec<[u8; 32]> = additional_ks_node_hashes
        .into_serde()
        .map_err(|err| JsValue::from_str(&err.to_string()))?;
    let out: ReshareResult = seed_expand_shares(points, additional_ks_node_hashes, t)
        .map_err(|err| JsValue::from_str(&err.to_string()))?;

    JsValue::from_serde(&out).map_err(|err| JsValue::from_str(&err.to_string()))
}
