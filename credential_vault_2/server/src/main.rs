use axum::Server;
use credential_vault_server::create_app;
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8081);

    let app = create_app();
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!(
        "Keplr Embedded Credential Vault Server running on http://0.0.0.0:{}",
        port
    );

    Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
