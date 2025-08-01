use axum::Server;
use server::create_app;
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = create_app();
    let addr = SocketAddr::from(([0, 0, 0, 0], 8081));
    println!("Server running on http://0.0.0.0:8081");

    Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
