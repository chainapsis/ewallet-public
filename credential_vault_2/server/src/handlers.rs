use crate::{
    ecdhe::ECDHE_SERVER,
    types::{
        EncryptedMessage, EncryptedResponse, ExchangeRequest, ExchangeResponse, PublicKeyResponse,
    },
};
use axum::{extract::Json, http::StatusCode, response::Json as ResponseJson};

// TODO: add certificate
pub async fn get_public_key() -> ResponseJson<PublicKeyResponse> {
    let public_key = ECDHE_SERVER.get_public_key_hex();
    ResponseJson(PublicKeyResponse { public_key })
}

pub async fn exchange_keys(
    Json(payload): Json<ExchangeRequest>,
) -> Result<ResponseJson<ExchangeResponse>, StatusCode> {
    match ECDHE_SERVER.exchange_keys(&payload.client_public_key) {
        Ok(_) => Ok(ResponseJson(ExchangeResponse {
            success: true,
            message: "Key exchange successful".to_string(),
        })),
        Err(_) => Err(StatusCode::BAD_REQUEST),
    }
}

pub async fn handle_encrypted(
    Json(payload): Json<EncryptedMessage>,
) -> Result<ResponseJson<EncryptedResponse>, StatusCode> {
    let encrypted_bytes = match hex::decode(&payload.encrypted_data) {
        Ok(bytes) => bytes,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    let decrypted_data = match ECDHE_SERVER.simple_decrypt(&encrypted_bytes) {
        Some(data) => String::from_utf8_lossy(&data).to_string(),
        None => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let response_message = format!("Server received: {}", decrypted_data);
    let encrypted_response = match ECDHE_SERVER.simple_encrypt(response_message.as_bytes()) {
        Some(encrypted) => hex::encode(encrypted),
        None => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    Ok(ResponseJson(EncryptedResponse {
        decrypted_data,
        response_encrypted: encrypted_response,
    }))
}
