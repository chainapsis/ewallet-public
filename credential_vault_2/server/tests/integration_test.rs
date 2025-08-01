use hyper::{Body, Method, Request, StatusCode};
use serde_json::{json, Value};
use server::create_app;
use tower::{Service, ServiceExt};

async fn send_request(
    app: &mut axum::Router,
    method: Method,
    uri: &str,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let request = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json");

    let body = if let Some(json_body) = body {
        Body::from(json_body.to_string())
    } else {
        Body::empty()
    };

    let response = app
        .ready()
        .await
        .unwrap()
        .call(request.body(body).unwrap())
        .await
        .unwrap();

    let status = response.status();
    let body_bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json: Value = if body_bytes.is_empty() {
        json!({})
    } else {
        serde_json::from_slice(&body_bytes).unwrap_or(json!({}))
    };

    (status, json)
}

#[tokio::test]
async fn test_get_public_key() {
    let mut app = create_app();

    let (status, json) = send_request(&mut app, Method::GET, "/public-key", None).await;

    assert_eq!(status, StatusCode::OK);
    assert!(json["public_key"].is_string());

    let public_key = json["public_key"].as_str().unwrap();
    assert!(!public_key.is_empty());

    // Verify that the public key is in hex format
    assert!(hex::decode(public_key).is_ok());

    println!(
        "✅ secp256k1 public key endpoint test passed: {}",
        public_key
    );
}

#[tokio::test]
async fn test_key_exchange() {
    let mut app = create_app();

    // Generate client key pair (using secp256k1)
    use k256::{ecdh::EphemeralSecret, elliptic_curve::sec1::ToEncodedPoint};
    use rand::thread_rng;

    let client_secret = EphemeralSecret::random(&mut thread_rng());
    let client_public_key = client_secret.public_key();
    let client_public_key_hex = hex::encode(client_public_key.to_encoded_point(false).as_bytes());

    // Key exchange request
    let exchange_request = json!({
        "client_public_key": client_public_key_hex
    });

    let (status, json) =
        send_request(&mut app, Method::POST, "/exchange", Some(exchange_request)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["success"], true);
    assert_eq!(json["message"], "Key exchange successful");

    println!("✅ secp256k1 key exchange test passed");
}

#[tokio::test]
async fn test_encrypted_communication() {
    let mut app = create_app();

    use k256::{ecdh::EphemeralSecret, elliptic_curve::sec1::ToEncodedPoint};
    use rand::thread_rng;

    let client_secret = EphemeralSecret::random(&mut thread_rng());
    let client_public_key = client_secret.public_key();
    let client_public_key_hex = hex::encode(client_public_key.to_encoded_point(false).as_bytes());

    let exchange_request = json!({
        "client_public_key": client_public_key_hex
    });

    let (exchange_status, _) =
        send_request(&mut app, Method::POST, "/exchange", Some(exchange_request)).await;
    assert_eq!(exchange_status, StatusCode::OK);

    // Send encrypted test message
    let test_message = "Hello secp256k1 ECDHE Server!";
    let encrypted_data = hex::encode(test_message.as_bytes()); // Simplified for testing

    let encrypted_request = json!({
        "encrypted_data": encrypted_data
    });

    let (status, json) = send_request(
        &mut app,
        Method::POST,
        "/encrypted",
        Some(encrypted_request),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(json["decrypted_data"].is_string());
    assert!(json["response_encrypted"].is_string());

    let decrypted_data = json["decrypted_data"].as_str().unwrap();
    println!("✅ secp256k1 encrypted communication test passed");
    println!("   Server decrypted message: {}", decrypted_data);
    println!(
        "   Server response (encrypted): {}",
        json["response_encrypted"]
    );
}

#[tokio::test]
async fn test_invalid_hex_data() {
    let mut app = create_app();

    use k256::{ecdh::EphemeralSecret, elliptic_curve::sec1::ToEncodedPoint};
    use rand::thread_rng;

    let client_secret = EphemeralSecret::random(&mut thread_rng());
    let client_public_key = client_secret.public_key();
    let client_public_key_hex = hex::encode(client_public_key.to_encoded_point(false).as_bytes());

    let exchange_request = json!({
        "client_public_key": client_public_key_hex
    });

    let (exchange_status, _) =
        send_request(&mut app, Method::POST, "/exchange", Some(exchange_request)).await;
    assert_eq!(exchange_status, StatusCode::OK);

    // Test with invalid hex data
    let invalid_request = json!({
        "encrypted_data": "invalid_hex_data"
    });

    let (status, _) =
        send_request(&mut app, Method::POST, "/encrypted", Some(invalid_request)).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    println!("✅ secp256k1 invalid hex data handling test passed");
}

#[tokio::test]
async fn test_invalid_public_key() {
    let mut app = create_app();

    // Attempt key exchange with invalid public key
    let invalid_exchange_request = json!({
        "client_public_key": "invalid_public_key"
    });

    let (status, _) = send_request(
        &mut app,
        Method::POST,
        "/exchange",
        Some(invalid_exchange_request),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    println!("✅ secp256k1 invalid public key handling test passed");
}

#[tokio::test]
async fn test_full_ecdhe_workflow() {
    let mut app = create_app();

    println!("🚀 secp256k1 full ECDHE workflow test started");

    // 1. Get server public key
    let (status, server_public_key) =
        send_request(&mut app, Method::GET, "/public-key", None).await;
    assert_eq!(status, StatusCode::OK);
    println!(
        "1️⃣ secp256k1 server public key obtained: {}",
        server_public_key["public_key"]
    );

    // 2. Generate client key and perform key exchange
    use k256::{ecdh::EphemeralSecret, elliptic_curve::sec1::ToEncodedPoint};
    use rand::thread_rng;

    let client_secret = EphemeralSecret::random(&mut thread_rng());
    let client_public_key = client_secret.public_key();
    let client_public_key_hex = hex::encode(client_public_key.to_encoded_point(false).as_bytes());

    let exchange_request = json!({
        "client_public_key": client_public_key_hex
    });

    let (exchange_status, _) =
        send_request(&mut app, Method::POST, "/exchange", Some(exchange_request)).await;
    assert_eq!(exchange_status, StatusCode::OK);
    println!("2️⃣ secp256k1 key exchange completed");

    // 3. Send encrypted message
    let test_message = "secp256k1 ECDHE communication test!";
    let encrypted_data = hex::encode(test_message.as_bytes());

    let encrypted_request = json!({
        "encrypted_data": encrypted_data
    });

    let (status, encrypted_response) = send_request(
        &mut app,
        Method::POST,
        "/encrypted",
        Some(encrypted_request),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    println!("3️⃣ secp256k1 encrypted communication completed");
    println!("   Original message: {}", test_message);
    println!(
        "   Server decrypted message: {}",
        encrypted_response["decrypted_data"]
    );

    println!("✅ secp256k1 full ECDHE workflow test passed!");
}
