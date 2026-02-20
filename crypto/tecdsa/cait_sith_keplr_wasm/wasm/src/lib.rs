mod keygen;
mod presign;
mod sign;
pub mod seed_sss;
pub mod sss;
mod triples;
mod verify;

use console_error_panic_hook;
use std::sync::Once;
use wasm_bindgen::prelude::*;

pub use keygen::*;
pub use presign::*;
pub use sign::*;
pub use triples::*;
pub use verify::*;

// Ensure initialization happens only once
static INIT: Once = Once::new();

// Module initialization function that runs automatically when the WASM module is loaded
#[wasm_bindgen(start)]
pub fn init() {
    INIT.call_once(|| {
        // Set up the panic hook for better error messages
        console_error_panic_hook::set_once();
        // console::log_1(&"[keplr] WASM initialized.".into());
    });
}
