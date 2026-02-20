use cait_sith_keplr::seed_sss::seed_combine;
use cait_sith_keplr::sss::Point256;
use gloo_utils::format::JsValueSerdeExt;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn seed_sss_combine(points: JsValue, t: u32) -> Result<JsValue, JsValue> {
    let points: Vec<Point256> = points
        .into_serde()
        .map_err(|err| JsValue::from_str(&err.to_string()))?;

    let out = seed_combine(points, t).map_err(|err| JsValue::from_str(&err.to_string()))?;

    JsValue::from_serde(&out).map_err(|err| JsValue::from_str(&err.to_string()))
}
