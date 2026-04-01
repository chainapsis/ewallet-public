use cait_sith_keplr::keyshare::{KeyshareState2, RcvdKeyshareMessages};
use cait_sith_keplr::tecdsa_cli_srv::cli_keygen::{KeyCombineInput, KeygenClient};
use cait_sith_keplr::tecdsa_cli_srv::srv_keygen::KeygenServer;
use gloo_utils::format::JsValueSerdeExt;
use k256::Secp256k1;
use wasm_bindgen::prelude::*;

fn js_err(e: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&e.to_string())
}

#[wasm_bindgen]
pub fn cli_keygen_step_1() -> Result<JsValue, JsValue> {
    let out = KeygenClient::cli_keygen_step_1().map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn cli_keygen_step_2(
    st_0: JsValue,   // KeyshareState2<Secp256k1>
    msgs_0: JsValue, // RcvdKeyshareMessages<Secp256k1>
) -> Result<JsValue, JsValue> {
    let st_0: KeyshareState2<Secp256k1> = st_0.into_serde().map_err(js_err)?;
    let msgs_0: RcvdKeyshareMessages<Secp256k1> = msgs_0.into_serde().map_err(js_err)?;
    let out = KeygenClient::cli_keygen_step_2(st_0, &msgs_0).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn cli_keygen_step_3(
    st_0: JsValue,   // KeyshareState2<Secp256k1>
    msgs_0: JsValue, // RcvdKeyshareMessages<Secp256k1>
) -> Result<JsValue, JsValue> {
    let st_0: KeyshareState2<Secp256k1> = st_0.into_serde().map_err(js_err)?;
    let msgs_0: RcvdKeyshareMessages<Secp256k1> = msgs_0.into_serde().map_err(js_err)?;
    let out = KeygenClient::cli_keygen_step_3(st_0, &msgs_0).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn cli_keygen_step_4(
    st_0: JsValue,   // KeyshareState2<Secp256k1>
    msgs_0: JsValue, // RcvdKeyshareMessages<Secp256k1>
) -> Result<JsValue, JsValue> {
    let st_0: KeyshareState2<Secp256k1> = st_0.into_serde().map_err(js_err)?;
    let msgs_0: RcvdKeyshareMessages<Secp256k1> = msgs_0.into_serde().map_err(js_err)?;
    let out = KeygenClient::cli_keygen_step_4(st_0, &msgs_0).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn cli_keygen_step_5(
    st_0: JsValue,   // KeyshareState2<Secp256k1>
    msgs_0: JsValue, // RcvdKeyshareMessages<Secp256k1>
) -> Result<JsValue, JsValue> {
    let st_0: KeyshareState2<Secp256k1> = st_0.into_serde().map_err(js_err)?;
    let msgs_0: RcvdKeyshareMessages<Secp256k1> = msgs_0.into_serde().map_err(js_err)?;
    let out = KeygenClient::cli_keygen_step_5(st_0, &msgs_0).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

/// these functions are only for server simulation
#[wasm_bindgen]
pub fn srv_keygen_step_1() -> Result<JsValue, JsValue> {
    let out = KeygenServer::srv_keygen_step_1().map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn srv_keygen_step_2(
    st_1: JsValue,   // KeyshareState2<Secp256k1>
    msgs_1: JsValue, // RcvdKeyshareMessages<Secp256k1>
) -> Result<JsValue, JsValue> {
    let st_1: KeyshareState2<Secp256k1> = st_1.into_serde().map_err(js_err)?;
    let msgs_1: RcvdKeyshareMessages<Secp256k1> = msgs_1.into_serde().map_err(js_err)?;
    let out = KeygenServer::srv_keygen_step_2(st_1, &msgs_1).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn srv_keygen_step_3(
    st_1: JsValue,   // KeyshareState2<Secp256k1>
    msgs_1: JsValue, // RcvdKeyshareMessages<Secp256k1>
) -> Result<JsValue, JsValue> {
    let st_1: KeyshareState2<Secp256k1> = st_1.into_serde().map_err(js_err)?;
    let msgs_1: RcvdKeyshareMessages<Secp256k1> = msgs_1.into_serde().map_err(js_err)?;
    let out = KeygenServer::srv_keygen_step_3(st_1, &msgs_1).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn srv_keygen_step_4(
    st_1: JsValue,   // KeyshareState2<Secp256k1>
    msgs_1: JsValue, // RcvdKeyshareMessages<Secp256k1>
) -> Result<JsValue, JsValue> {
    let st_1: KeyshareState2<Secp256k1> = st_1.into_serde().map_err(js_err)?;
    let msgs_1: RcvdKeyshareMessages<Secp256k1> = msgs_1.into_serde().map_err(js_err)?;
    let out = KeygenServer::srv_keygen_step_4(st_1, &msgs_1).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn srv_keygen_step_5(
    st_1: JsValue,   // KeyshareState2<Secp256k1>
    msgs_1: JsValue, // RcvdKeyshareMessages<Secp256k1>
) -> Result<JsValue, JsValue> {
    let st_1: KeyshareState2<Secp256k1> = st_1.into_serde().map_err(js_err)?;
    let msgs_1: RcvdKeyshareMessages<Secp256k1> = msgs_1.into_serde().map_err(js_err)?;
    let out = KeygenServer::srv_keygen_step_5(st_1, &msgs_1).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn cli_keygen_centralized() -> Result<JsValue, JsValue> {
    let out = KeygenClient::cli_keygen_centralized().map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn cli_keygen_import(secret_key: JsValue) -> Result<JsValue, JsValue> {
    let secret: [u8; 32] = secret_key.into_serde().map_err(js_err)?;
    let out = KeygenClient::cli_keygen_import(secret).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}

#[wasm_bindgen]
pub fn cli_combine_shares(key_combine_input_json: JsValue) -> Result<JsValue, JsValue> {
    let key_combine_input: KeyCombineInput<Secp256k1> =
        key_combine_input_json.into_serde().map_err(js_err)?;
    let out = KeygenClient::cli_combine_shares(key_combine_input).map_err(js_err)?;
    JsValue::from_serde(&out).map_err(js_err)
}
