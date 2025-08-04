use thiserror::Error;

#[derive(Error, Debug, Clone)]
pub enum CryptoError {
    #[error("invalid format: {0}")]
    InvalidFormat(String),
    #[error("verification failed")]
    VerificationFailed,
}
