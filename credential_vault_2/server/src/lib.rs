pub mod ecdhe;
pub mod handlers;
pub mod types;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;

pub fn create_app() -> Router {
    Router::new()
        .route("/public-key", get(handlers::get_public_key))
        .route("/exchange", post(handlers::exchange_keys))
        .route("/encrypted", post(handlers::handle_encrypted))
        .layer(CorsLayer::permissive())
}
