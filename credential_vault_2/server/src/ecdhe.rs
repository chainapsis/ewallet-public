use k256::{
    ecdh::EphemeralSecret,
    elliptic_curve::{
        sec1::{FromEncodedPoint, ToEncodedPoint},
        PublicKey, SecretKey,
    },
    EncodedPoint, Secp256k1,
};
use rand::thread_rng;
use std::sync::{Arc, Mutex};

pub struct EcdheServer {
    private_key: SecretKey<Secp256k1>,
    public_key: PublicKey<Secp256k1>,
    shared_secret: Arc<Mutex<Option<Vec<u8>>>>,
}

impl EcdheServer {
    pub fn new() -> Self {
        let private_key = SecretKey::random(&mut thread_rng());
        let public_key = private_key.public_key();

        Self {
            private_key,
            public_key,
            shared_secret: Arc::new(Mutex::new(None)),
        }
    }

    pub fn get_public_key_hex(&self) -> String {
        let encoded = self.public_key.to_encoded_point(false);
        hex::encode(encoded.as_bytes())
    }

    pub fn exchange_keys(&self, client_public_key_hex: &str) -> Result<bool, String> {
        let client_key_bytes =
            hex::decode(client_public_key_hex).map_err(|_| "Invalid hex encoding")?;
        let encoded_point =
            EncodedPoint::from_bytes(&client_key_bytes).map_err(|_| "Invalid encoded point")?;
        let client_public_key = Option::from(PublicKey::from_encoded_point(&encoded_point))
            .ok_or("Invalid public key")?;

        let ephemeral_secret = EphemeralSecret::random(&mut thread_rng());
        let shared_secret = ephemeral_secret.diffie_hellman(&client_public_key);

        let mut secret_guard = self.shared_secret.lock().unwrap();
        *secret_guard = Some(shared_secret.raw_secret_bytes().to_vec());

        Ok(true)
    }

    pub fn get_shared_secret(&self) -> Option<Vec<u8>> {
        self.shared_secret.lock().unwrap().clone()
    }

    pub fn simple_encrypt(&self, data: &[u8]) -> Option<Vec<u8>> {
        if let Some(key) = self.get_shared_secret() {
            let mut encrypted = data.to_vec();
            for (i, byte) in encrypted.iter_mut().enumerate() {
                *byte ^= key[i % key.len()];
            }
            Some(encrypted)
        } else {
            None
        }
    }

    pub fn simple_decrypt(&self, encrypted_data: &[u8]) -> Option<Vec<u8>> {
        self.simple_encrypt(encrypted_data)
    }
}

lazy_static::lazy_static! {
    pub static ref ECDHE_SERVER: EcdheServer = EcdheServer::new();
}
